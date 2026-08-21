<?php

namespace Pterodactyl\Http\Controllers\Api\Client\EggChanger;

use Pterodactyl\Models\Egg;
use Pterodactyl\Models\Server;
use Illuminate\Http\JsonResponse;
use Pterodactyl\Facades\Activity;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use Illuminate\Database\Eloquent\Collection;
use Pterodactyl\Transformers\Api\Client\EggTransformer;
use Pterodactyl\Services\Servers\ReinstallServerService;
use Pterodactyl\Repositories\Wings\DaemonFileRepository;
use Pterodactyl\Http\Controllers\Api\Client\ClientApiController;
use Pterodactyl\Http\Requests\Api\Client\EggChanger\EggChangerIndexRequest;
use Pterodactyl\Http\Requests\Api\Client\EggChanger\EggChangerUpdateRequest;
use Pterodactyl\BlueprintFramework\Libraries\ExtensionLibrary\Client\BlueprintClientLibrary;

class EggChangerController extends ClientApiController
{
    public function __construct(
        private DaemonFileRepository $fileRepository,
        private ReinstallServerService $reinstallServerService,
        private BlueprintClientLibrary $blueprint,
    ) {
        parent::__construct();
    }

    private function config(): array
    {
        return Cache::remember('server:eggchanger:config', 15, function () {
            return [
                'force_update_startup_command' => $this->blueprint->dbGet('eggchanger', 'force_update_startup_command') == 1,
                'force_reinstall' => $this->blueprint->dbGet('eggchanger', 'force_reinstall') == 1,
                'force_delete_files' => $this->blueprint->dbGet('eggchanger', 'force_delete_files') == 1,
            ];
        });
    }

    private function usableEggs(Server $server): Collection
    {
        $eggs = DB::table('egg_changer_eggs')->whereJsonContains('eggs', [(string) $server->egg_id])->first();

        if (!$eggs) {
            return Collection::make();
        }

        return Egg::query()->whereIn('id', array_map('intval', json_decode($eggs->allowed_eggs, true)))->get();
    }

    public function nests(EggChangerIndexRequest $request, Server $server): array
    {
        $eggs = $this->usableEggs($server);
        $config = $this->config();

        $nests = [];
        foreach ($eggs as $egg) {
            $nest = $egg->nest;
            $nests[$nest->name] = $nests[$nest->name] ?? [];
            $nests[$nest->name][] = $this->fractal->item($egg)
                ->transformWith($this->getTransformer(EggTransformer::class))
                ->toArray();
        }

        return [
            'nests' => $nests,
            'current' => $server->egg->uuid,
            'can_update_allocations' => $this->blueprint->extension('autoallocationmanager'),
            'config' => $config,
        ];
    }

    public function update(EggChangerUpdateRequest $request, Server $server): JsonResponse
    {
        $data = $request->validated();
        $config = $this->config();

        if ($config['force_update_startup_command']) {
            $data['change_startup'] = true;
        }

        if ($config['force_reinstall']) {
            $data['reinstall'] = true;
        }

        if ($config['force_delete_files']) {
            $data['delete_files'] = true;
        }

        $eggs = $this->usableEggs($server);
        $egg = $eggs->where('uuid', $data['egg_id'])->first();

        if (!$egg) {
            return new JsonResponse([
                'error' => 'Invalid egg ID provided.',
            ], 400);
        }

        $server->update([
            'egg_id' => $egg->id,
            'nest_id' => $egg->nest_id,
            'image' => $egg->docker_images[array_keys($egg->docker_images)[0]],
        ]);

        if ($this->blueprint->extension('autoallocationmanager')) {
            $allocationData = [
                'allocation_id' => $server->allocation_id,
                'allocation_additional' => $server->allocations->map(fn ($allocation) => $allocation->id)->toArray(),
            ];

            foreach ($server->allocations as $allocation) {
                $allocation->update([
                    'server_id' => null,
                ]);
            }

            \Pterodactyl\BlueprintFramework\Extensions\autoallocationmanager\AutoAllocationManagerController::storeAssignedAllocations($server, $allocationData, $server->variables()->get(), true);
        }

        if ($data['change_startup']) {
            $server->update([
                'startup' => $egg->startup,
            ]);
        }

        if ($data['reinstall']) {
            if ($data['delete_files']) {
                $files = $this->fileRepository->setServer($server)->getDirectory('/');
    
                if (count($files) > 0) {
                    $this->fileRepository->setServer($server)->deleteFiles(
                        '/',
                        collect($files)->map(fn ($file) => $file['name'])->toArray()
                    );
                }
            }

            $this->reinstallServerService->handle($server);
        }

        Activity::event('server:settings.change-egg')
            ->property('egg', $egg->name)
            ->property('reinstall', $data['reinstall'])
            ->property('deleteFiles', $data['delete_files'])
            ->log();

        return new JsonResponse([], 204);
    }
}
