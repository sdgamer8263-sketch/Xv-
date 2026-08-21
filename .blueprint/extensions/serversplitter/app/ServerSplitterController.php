<?php

namespace Pterodactyl\BlueprintFramework\Extensions\serversplitter;

use Pterodactyl\Models\Egg;
use Pterodactyl\Models\Server;
use Illuminate\Http\JsonResponse;
use Pterodactyl\Facades\Activity;
use Pterodactyl\Models\Allocation;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use Illuminate\Database\Eloquent\Collection;
use Pterodactyl\Services\Servers\ServerCreationService;
use Pterodactyl\Services\Servers\ServerDeletionService;
use Pterodactyl\Transformers\Api\Client\EggTransformer;
use Pterodactyl\Repositories\Wings\DaemonFileRepository;
use Pterodactyl\Services\Subusers\SubuserCreationService;
use Pterodactyl\Repositories\Wings\DaemonPowerRepository;
use Pterodactyl\Repositories\Wings\DaemonServerRepository;
use Pterodactyl\Transformers\Api\Client\ServerTransformer;
use Pterodactyl\Http\Controllers\Api\Client\ClientApiController;
use Pterodactyl\BlueprintFramework\Libraries\ExtensionLibrary\Client\BlueprintClientLibrary;
use Pterodactyl\BlueprintFramework\Extensions\serversplitter\Requests\ServerSplitterIndexRequest;
use Pterodactyl\BlueprintFramework\Extensions\serversplitter\Requests\ServerSplitterStoreRequest;
use Pterodactyl\BlueprintFramework\Extensions\serversplitter\Requests\ServerSplitterUpdateRequest;
use Pterodactyl\BlueprintFramework\Extensions\serversplitter\Requests\ServerSplitterDestroyRequest;
use Pterodactyl\BlueprintFramework\Extensions\serversplitter\Requests\ServerSplitterSubuserRequest;

class ServerSplitterController extends ClientApiController
{
    public function __construct(
        private DaemonFileRepository $fileRepository,
        private DaemonPowerRepository $powerRepository,
        private DaemonServerRepository $serverRepository,
        private ServerCreationService $creationService,
        private ServerDeletionService $deletionService,
        private SubuserCreationService $subuserCreationService,
        private BlueprintClientLibrary $blueprint,
    ) {
        parent::__construct();
    }

    private function usableEggs(Server $parent): Collection
    {
        $eggs = DB::table('server_splitter_eggs')->whereJsonContains('eggs', [(string) $parent->egg_id])->first();

        if (!$eggs) {
            return Collection::make();
        }

        return Egg::query()->whereIn('id', array_map('intval', json_decode($eggs->allowed_eggs, true)))->get();
    }

    private function config(): array
    {
        return Cache::remember('server:splitter:config', 15, function () {
            return [
                'reserved_cpu' => (int) $this->blueprint->dbGet('serversplitter', 'reserved_cpu') ?: 10,
                'reserved_memory' => (int) $this->blueprint->dbGet('serversplitter', 'reserved_memory') ?: 128,
                'reserved_disk' => (int) $this->blueprint->dbGet('serversplitter', 'reserved_disk') ?: 256,
                'include_disk_usage' => $this->blueprint->dbGet('serversplitter', 'include_disk_usage') !== '0',
                'display_reserved_limits' => $this->blueprint->dbGet('serversplitter', 'display_reserved_limits') !== '0',
            ];
        });
    }

    private function parent(Server $server): Server
    {
        return !$server->parent_id ? $server : Server::query()->whereId($server->parent_id)->firstOrFail();
    }

    private function remainingResources(Server $parent, ?Server $server = null): array
    {
        $config = $this->config();

        $details = Cache::remember("server:{$parent->id}:details", 15, function () use ($parent, $config) {
            if ($parent->parent_id || !$config['include_disk_usage']) {
                return [
                    'utilization' => [
                        'disk_bytes' => 0,
                    ],
                ];
            }

            try {
                return $this->serverRepository->setServer($parent)->getDetails();
            } catch (\Throwable $exception) {
                return [
                    'utilization' => [
                        'disk_bytes' => 0,
                    ],
                ];
            }
        });

        $negativeCpu = $parent->parent_id ? 0 : $config['reserved_cpu'];
        $negativeMemory = $parent->parent_id ? 0 : $config['reserved_memory'];
        $negativeDisk = $parent->parent_id ? 0 : $config['reserved_disk'];

        $baseCpu = $parent->cpu - $negativeCpu + ($server ? $server->cpu : 0);
        $baseDisk = floor($parent->disk - $negativeDisk - (($details['utilization']['disk_bytes'] ?? 0) / 1024 / 1024)) + ($server ? $server->disk : 0);

        $remainingResources = [
            'cpu' => $parent->cpu > 0 ? $baseCpu : -1,
            'memory' => $parent->memory - $negativeMemory + ($server ? $server->memory : 0),
            'disk' => $parent->disk > 0 ? $baseDisk : -1,
            'feature_limits' => [],
        ];

        $transformed = $this->getTransformer(ServerTransformer::class)->transform($parent);
        foreach ($transformed['feature_limits'] as $key => $value) {
            if ($key === 'splits') {
                $remainingResources['feature_limits'][$key] = 0;
                continue;
            }

            try {
                $remainingResources['feature_limits'][$key] = max($value - ($parent->{$key}()->count() ?? 0) + ($server ? $server->{$key}()->count() : 0), 0);
            } catch (\Throwable $exception) {
                $remainingResources['feature_limits'][$key] = 0;
            }
        }

        return $remainingResources;
    }

    public function index(ServerSplitterIndexRequest $request, Server $server): array
    {
        $servers = Server::query()->where('parent_id', $server->parent_id ?? $server->id)->get();
        $parent = $this->parent($server);

        $totalResources = $server->totalResources();
        $remainingResources = $this->remainingResources($parent);
        $remainingDisplay = $remainingResources;
        $config = $this->config();

        if (!$config['display_reserved_limits']) {
            $remainingDisplay['cpu'] += $config['reserved_cpu'];
            $remainingDisplay['memory'] += $config['reserved_memory'];
            $remainingDisplay['disk'] += $config['reserved_disk'];
        }

        return [
            'resources' => [
                'total' => $totalResources,
                'remaining' => $remainingResources,
                'remaining_display' => $remainingDisplay,
                'reserved' => [
                    'cpu' => $config['reserved_cpu'],
                    'memory' => $config['reserved_memory'],
                    'disk' => $config['reserved_disk'],
                ]
            ], 'master' => $this->fractal->item($parent)
                ->transformWith($this->getTransformer(ServerTransformer::class))
                ->toArray(),
            'servers' => $this->fractal->collection($servers)
                ->transformWith($this->getTransformer(ServerTransformer::class))
                ->toArray()['data'],
        ];
    }

    public function nests(ServerSplitterIndexRequest $request, Server $server): array
    {
        $eggs = $this->usableEggs($this->parent($server));

        $nests = [];
        foreach ($eggs as $egg) {
            $nest = $egg->nest;
            $nests[$nest->name] = $nests[$nest->name] ?? [];
            $nests[$nest->name][] = $this->fractal->item($egg)
                ->transformWith($this->getTransformer(EggTransformer::class))
                ->toArray();
        }

        return $nests;
    }

    public function store(ServerSplitterStoreRequest $request, Server $server)
    {
        $data = $request->validated();

        if ($server->parent_id) {
            $server = Server::query()->where('id', $server->parent_id)->firstOrFail();
        }

        $splits = Server::query()->where('parent_id', $server->id)->count();
        if ($splits >= $server->splitter_limit) {
            return new JsonResponse([
                'error' => 'Cannot create more splits than the server allows.',
            ], 400);
        }

        $config = $this->config();

        if ($server->cpu !== 0 && $data['cpu'] < $config['reserved_cpu']) {
            return new JsonResponse([
                'error' => "CPU must be at least {$config['reserved_cpu']}% to create a split.",
            ], 400);
        }

        if ($data['memory'] < $config['reserved_memory']) {
            return new JsonResponse([
                'error' => "Memory must be at least {$config['reserved_memory']}MB to create a split.",
            ], 400);
        }

        if ($server->disk !== 0 && $data['disk'] < $config['reserved_disk']) {
            return new JsonResponse([
                'error' => "Disk must be at least {$config['reserved_disk']}MB to create a split.",
            ], 400);
        }

        $lock = Cache::lock("server:{$server->id}:splitter", 30);

        if (!$lock->get()) {
            return new JsonResponse([
                'error' => 'Failed to acquire lock for server update. Please try again.',
            ], 503);
        }

        try {
            $remaining = $this->remainingResources($server);

            if ($server->cpu !== 0 && $data['cpu'] > $remaining['cpu']) {
                return new JsonResponse([
                    'error' => 'CPU limit exceeded.',
                ], 400);
            }

            if ($data['memory'] > $remaining['memory']) {
                return new JsonResponse([
                    'error' => 'Memory limit exceeded.',
                ], 400);
            }

            if ($server->disk !== 0 && $data['disk'] > $remaining['disk']) {
                return new JsonResponse([
                    'error' => 'Disk limit exceeded.',
                ], 400);
            }

            if ($remaining['cpu'] !== -1 && $data['cpu'] < $config['reserved_cpu']) {
                return new JsonResponse([
                    'error' => "CPU must be at least {$config['reserved_cpu']}%.",
                ], 400);
            }

            if ($remaining['disk'] !== -1 && $data['disk'] < $config['reserved_disk']) {
                return new JsonResponse([
                    'error' => "Disk must be at least {$config['reserved_disk']}MB.",
                ], 400);
            }

            if (isset($data['egg_id'])) {
                $eggs = $this->usableEggs($server);
                $egg = $eggs->where('uuid', $data['egg_id'])->first();

                if (!$egg) {
                    return new JsonResponse([
                        'error' => 'Invalid egg ID provided.',
                    ], 400);
                }
            } else {
                $egg = $server->egg;
            }

            $featureData = [];
            foreach ($data['feature_limits'] as $key => $value) {
                if ($key === 'splits') {
                    continue;
                }

                if ($value > $remaining['feature_limits'][$key]) {
                    return new JsonResponse([
                        'error' => 'Feature limit exceeded.',
                    ], 400);
                }

                if (str_ends_with($key, 'ies')) {
                    $key = substr($key, 0, -3) . 'y';
                } elseif (substr($key, -1) === 's') {
                    $key = substr($key, 0, -1);
                }

                $featureData["{$key}_limit"] = $value;
            }

            if ($featureData['allocation_limit'] < 1) {
                return new JsonResponse([
                    'error' => 'Allocation limit must be at least 1.',
                ], 400);
            }

            $allocation = Allocation::where('node_id', $server->node_id)->where('ip', $server->allocation->ip)->whereNull('server_id')->inRandomOrder()->first();

            if (!$allocation) {
                return new JsonResponse([
                    'error' => 'No available allocations on the node.',
                ], 400);
            }

            $environment = [];
            $env = DB::table('egg_variables')->where('egg_id', $egg->id)->get();

            foreach ($env as $item) {
                $environment[$item->env_variable] = $item->default_value;
            }

            $GLOBALS['SERVERSPLITTER_parent'] = $server;

            $split = $this->creationService->handle(array_merge($featureData, [
                'name' => $request->name,
                'description' => $request->description,
                'owner_id' => $server->owner_id,
                'node_id' => $server->node_id,
                'allocation_id' => $allocation->id,
                'allocation_additional' => [],
                'memory' => (int) $request->memory,
                'disk' => (int) $request->disk,
                'swap' => $server->swap > 0 || $server->swap === -1 ? floor(((int) $request->memory) / 4) : 0,
                'io' => $server->io,
                'cpu' => (int) $request->cpu,
                'threads' => $server->threads,
                'nest_id' => $egg->nest_id,
                'egg_id' => $egg->id,
                'startup' => $egg->startup,
                'image' => $egg->docker_images[array_keys($egg->docker_images)[0]],
                'oom_disabled' => $server->oom_disabled,
                'environment' => $environment,
                'start_on_completion' => true,
            ]));

            DB::beginTransaction();

            try {
                $split->update([
                    'parent_id' => $server->id,
                ]);

                foreach ($data['feature_limits'] as $key => $value) {
                    if ($key === 'splits') {
                        continue;
                    }

                    try {
                        if (str_ends_with($key, 'ies')) {
                            $key = substr($key, 0, -3) . 'y';
                        } elseif (substr($key, -1) === 's') {
                            $key = substr($key, 0, -1);
                        }

                        $server->decrement("{$key}_limit", $value);
                    } catch (\Throwable $exception) {
                        // ignore
                    }
                }

                if ($server->cpu !== 0) {
                    $server->decrement('cpu', $data['cpu']);
                }
                $server->decrement('memory', $data['memory']);
                if ($server->disk !== 0) {
                    $server->decrement('disk', $data['disk']);
                }

                $this->serverRepository->setServer($server)->sync();

                DB::commit();
            } catch (\Throwable $exception) {
                DB::rollBack();
                $split->parent_id = null;
                $this->deletionService->handle($split);

                throw $exception;
            }

            Activity::event('server:splitter.split')
                ->property([
                    'uuid' => $split->uuid,
                    'name' => $split->name,
                    'cpu' => $split->cpu,
                    'memory' => $split->memory,
                    'disk' => $split->disk,
                    'swap' => $split->swap,
                    'egg' => $egg->name,
                ])
                ->log();

            if ($data['sync_subusers']) {
                $subusers = $server->subusers;

                foreach ($subusers as $subuser) {
                    $this->subuserCreationService->handle($split, $subuser->user->email, $subuser->permissions);
                }
            }

            return $this->fractal->item($split)
                ->transformWith($this->getTransformer(ServerTransformer::class))
                ->toArray();
        } finally {
            $lock->release();
        }
    }

    public function update(ServerSplitterUpdateRequest $request, Server $server, string $subserver)
    {
        if ($server->parent_id) {
            $server = Server::query()->where('id', $server->parent_id)->firstOrFail();
        }

        $split = Server::query()->where('parent_id', $server->id)->where('uuid', $subserver)->firstOrFail();
        $data = $request->validated();

        $lock = Cache::lock("server:{$split->id}:splitter", 30);

        if (!$lock->get()) {
            return new JsonResponse([
                'error' => 'Failed to acquire lock for server update. Please try again.',
            ], 503);
        }

        $parentLock = Cache::lock("server:{$server->id}:splitter", 30);

        if (!$parentLock->get()) {
            $lock->release();

            return new JsonResponse([
                'error' => 'Failed to acquire parent lock for server update. Please try again.',
            ], 503);
        }

        try {
            $remaining = $this->remainingResources($server);

            if ($server->cpu !== 0 && $data['cpu'] > $remaining['cpu'] + $split->cpu) {
                return new JsonResponse([
                    'error' => 'CPU limit exceeded.',
                ], 400);
            }

            if ($data['memory'] > $remaining['memory'] + $split->memory) {
                return new JsonResponse([
                    'error' => 'Memory limit exceeded.',
                ], 400);
            }

            if ($server->disk !== 0 && $data['disk'] > $remaining['disk'] + $split->disk) {
                return new JsonResponse([
                    'error' => 'Disk limit exceeded.',
                ], 400);
            }

            $config = $this->config();

            if ($remaining['cpu'] !== -1 && $data['cpu'] < $config['reserved_cpu']) {
                return new JsonResponse([
                    'error' => "CPU must be at least {$config['reserved_cpu']}%.",
                ], 400);
            }

            if ($data['memory'] < $config['reserved_memory']) {
                return new JsonResponse([
                    'error' => "Memory must be at least {$config['reserved_memory']}MB.",
                ], 400);
            }

            if ($remaining['disk'] !== -1 && $data['disk'] < $config['reserved_disk']) {
                return new JsonResponse([
                    'error' => "Disk must be at least {$config['reserved_disk']}MB.",
                ], 400);
            }

            DB::beginTransaction();

            try {
                if ($server->cpu !== 0) {
                    $server->increment('cpu', $split->cpu);
                }
                $server->increment('memory', $split->memory);
                if ($server->disk !== 0) {
                    $server->increment('disk', $split->disk);
                }
                $split->update([
                    'name' => $data['name'],
                    'cpu' => $data['cpu'],
                    'memory' => $data['memory'],
                    'disk' => $data['disk'],
                    'swap' => $server->swap > 0 || $server->swap === -1 ? floor($data['memory'] / 4) : 0,
                ]);

                if (isset($data['description']) && $data['description']) {
                    $split->update([
                        'description' => $data['description'],
                    ]);
                }

                if ($server->cpu !== 0) {
                    $server->decrement('cpu', $data['cpu']);
                }
                $server->decrement('memory', $data['memory']);
                if ($server->disk !== 0) {
                    $server->decrement('disk', $data['disk']);
                }

                $featureData = [];
                foreach ($data['feature_limits'] as $key => $value) {
                    if ($key === 'splits') {
                        continue;
                    }

                    if (str_ends_with($key, 'ies')) {
                        $key = substr($key, 0, -3) . 'y';
                    } elseif (substr($key, -1) === 's') {
                        $key = substr($key, 0, -1);
                    }

                    try {
                        $server->increment("{$key}_limit", $split->{"{$key}_limit"});
                        $split->decrement("{$key}_limit", $split->{"{$key}_limit"});
                        $featureData["{$key}_limit"] = $value;
                    } catch (\Throwable $exception) {
                        // ignore
                    }
                }

                $split->update($featureData);

                foreach ($data['feature_limits'] as $key => $value) {
                    if ($key === 'splits') {
                        continue;
                    }

                    try {
                        if (str_ends_with($key, 'ies')) {
                            $key = substr($key, 0, -3) . 'y';
                        } elseif (substr($key, -1) === 's') {
                            $key = substr($key, 0, -1);
                        }

                        $server->decrement("{$key}_limit", $value);
                    } catch (\Throwable $exception) {
                        // ignore
                    }
                }

                $this->serverRepository->setServer($split)->sync();
                $this->serverRepository->setServer($server)->sync();    

                DB::commit();
            } catch (\Throwable $exception) {
                DB::rollBack();
                throw $exception;
            }

            Activity::event('server:splitter.update')
                ->property([
                    'uuid' => $split->uuid,
                    'name' => $split->name,
                    'cpu' => $split->cpu,
                    'memory' => $split->memory,
                    'disk' => $split->disk,
                    'swap' => $split->swap,
                ])
                ->log();

            return $this->fractal->item($split)
                ->transformWith($this->getTransformer(ServerTransformer::class))
                ->toArray();
        } finally {
            $lock->release();
            $parentLock->release();
        }
    }

    public function subusers(ServerSplitterSubuserRequest $request, Server $server): JsonResponse
    {
        if ($server->parent_id) {
            return new JsonResponse([
                'error' => 'Cannot sync subusers on a server that is not a parent server.',
            ], 400);
        }

        $split = Server::query()->where('parent_id', $server->id)->where('uuid', $request->route('subserver'))->firstOrFail();
        $subusers = $server->subusers;

        foreach ($subusers as $subuser) {
            if ($split->subusers()->where('user_id', $subuser->user_id)->exists()) {
                continue;
            }

            $this->subuserCreationService->handle($split, $subuser->user->email, $subuser->permissions);
        }

        return new JsonResponse([], 204);
    }

    public function destroy(ServerSplitterDestroyRequest $request, Server $server, string $subserver): JsonResponse
    {
        if ($server->uuid === $subserver) {
            return new JsonResponse([
                'error' => 'Cannot delete current server.',
            ], 400);
        }

        if ($server->parent_id) {
            $server = Server::query()->where('id', $server->parent_id)->firstOrFail();
        }

        $split = Server::query()->where('parent_id', $server->id)->where('uuid', $subserver)->firstOrFail();

        $lock = Cache::lock("server:{$split->id}:splitter", 120);

        if (!$lock->get()) {
            return new JsonResponse([
                'error' => 'Failed to acquire lock for server update. Please try again.',
            ], 503);
        }

        $parentLock = Cache::lock("server:{$server->id}:splitter", 120);

        if (!$parentLock->get()) {
            $lock->release();

            return new JsonResponse([
                'error' => 'Failed to acquire parent lock for server update. Please try again.',
            ], 503);
        }

        $this->deletionService->handle($split);

        $lock->release();
        $parentLock->release();

        Activity::event('server:splitter.delete')
            ->property([
                'uuid' => $split->uuid,
                'name' => $split->name,
            ])
            ->log();

        return new JsonResponse([], 204);
    }
}
