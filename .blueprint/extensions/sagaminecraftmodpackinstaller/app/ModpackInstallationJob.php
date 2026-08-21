<?php

namespace Pterodactyl\BlueprintFramework\Extensions\sagaminecraftmodpackinstaller;

use Pterodactyl\Jobs\Job;
use Pterodactyl\Models\Egg;
use Pterodactyl\Models\User;
use Pterodactyl\Models\Server;
use Illuminate\Queue\SerializesModels;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Pterodactyl\Repositories\Wings\DaemonFileRepository;
use Pterodactyl\Repositories\Wings\DaemonPowerRepository;
use Pterodactyl\Repositories\Wings\DaemonServerRepository;
use Pterodactyl\Services\Servers\ReinstallServerService;
use Pterodactyl\Services\Servers\StartupModificationService;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

class ModpackInstallationJob extends Job implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use SerializesModels;

    /**
     * The number of times the job may be attempted.
     *
     * @var int
     */
    public $tries = 1;

    /**
     * The number of seconds the job can run before timing out.
     *
     * @var int
     */
    public $timeout = 300;

    /**
     * Create a new job instance.
     */
    /**
     * Original egg ID dan nest ID yang akan dikembalikan setelah instalasi
     */
    protected int $originalEggId;
    protected int $originalNestId;

    public function __construct(
        public Server $server,
        public string $provider,
        public string $modpackId,
        public string $modpackVersionId,
        public bool $deleteServerFiles
    ) {
        
        
        $this->originalEggId = $server->egg_id;
        $this->originalNestId = $server->nest_id;
    }

    /**
     * Execute the job.
     */
    public function handle(
        StartupModificationService $startupModificationService,
        DaemonFileRepository $fileRepository,
        ReinstallServerService $reinstallServerService,
        DaemonPowerRepository $daemonPowerRepository,
        DaemonServerRepository $daemonServerRepository,
        
    ): void {
        
        $daemonPowerRepository->setServer($this->server)->send('kill');
        $daemonServerRepository->setServer($this->server);

        
        while ($daemonServerRepository->getDetails()['state'] !== 'offline') {
            sleep(1);
        }

        if ($this->deleteServerFiles) {
            $fileRepository->setServer($this->server);
            $filesToDelete = collect(
                $fileRepository->getDirectory('/')
            )->pluck('name')->toArray();

            if (count($filesToDelete) > 0) {
                $fileRepository->deleteFiles('/', $filesToDelete);
            }
        }

        
        
        Log::info('Using original egg information from job creation', [
            'server_id' => $this->server->id,
            'original_egg_id' => $this->originalEggId,
            'original_nest_id' => $this->originalNestId,
        ]);
        
        
        $originalVariables = DB::table('server_variables')
            ->where('server_id', $this->server->id)
            ->get()
            ->keyBy('variable_id')
            ->map(function ($item) {
                return $item->variable_value;
            })
            ->toArray();
        
        $installerEgg = Egg::where('author', 'modpack-installer@pterodactyl.io')->firstOrFail();
        
        Log::info('Found modpack installer egg', [
            'egg_id' => $installerEgg->id,
            'egg_name' => $installerEgg->name,
            'egg_author' => $installerEgg->author,
        ]);

        $startupModificationService->setUserLevel(User::USER_LEVEL_ADMIN);

        
        $providerName = $this->provider;
        if ($providerName === 'ftb') {
            $providerName = 'feedthebeast';
        }

        
        rescue(function () use ($startupModificationService, $installerEgg, $reinstallServerService) {
            Log::info('Starting modpack installation', [
                'server_id' => $this->server->id,
                'provider' => $this->provider,
                'modpack_id' => $this->modpackId,
                'modpack_version_id' => $this->modpackVersionId,
            ]);
            
            
            $startupModificationService->handle($this->server, [
                'nest_id' => $installerEgg->nest_id,
                'egg_id' => $installerEgg->id,
            ]);
            
            
            $this->server->refresh();
            
            Log::info('Egg changed successfully', [
                'server_id' => $this->server->id,
                'current_egg_id' => $this->server->egg_id,
                'expected_egg_id' => $installerEgg->id,
            ]);
            
            
            $startupModificationService->handle($this->server, [
                'environment' => [
                    'MODPACK_PROVIDER' => $this->provider,
                    'MODPACK_ID' => $this->modpackId,
                    'MODPACK_VERSION_ID' => $this->modpackVersionId,
                ],
            ]);
            
            
            Log::info('Reinstalling server with modpack installer egg', [
                'server_id' => $this->server->id,
                'egg_id' => $this->server->egg_id,
            ]);
            
            $reinstallServerService->handle($this->server);
            
            Log::info('Reinstall command sent', [
                'server_id' => $this->server->id,
            ]);
        });
        
        
        $this->server->refresh();
        
        Log::info('Server status after reinstall command', [
            'server_id' => $this->server->id,
            'status' => $this->server->status,
        ]);
        
        
        if ($this->server->status !== Server::STATUS_INSTALLING) {
            Log::warning('Server not in installing status, attempting to reinstall again immediately', [
                'server_id' => $this->server->id,
                'current_status' => $this->server->status,
            ]);
            
            $reinstallServerService->handle($this->server);
            
            $this->server->refresh();
        }
        
        
        Log::info('Reverting egg to original using multiple approaches', [
            'server_id' => $this->server->id,
            'original_egg_id' => $this->originalEggId,
            'original_nest_id' => $this->originalNestId,
        ]);
        
        
        DB::table('servers')
            ->where('id', $this->server->id)
            ->update([
                'egg_id' => $this->originalEggId,
                'nest_id' => $this->originalNestId,
            ]);
        
        
        foreach ($originalVariables as $variableId => $value) {
            DB::table('server_variables')
                ->where('server_id', $this->server->id)
                ->where('variable_id', $variableId)
                ->update(['variable_value' => $value]);
        }
        
        
        $this->server->refresh();
        
        
        $startupModificationService->setUserLevel(User::USER_LEVEL_ADMIN);
        $startupModificationService->handle($this->server, [
            'nest_id' => $this->originalNestId,
            'egg_id' => $this->originalEggId,
        ]);
        
        
        $this->server->refresh();
        Log::info('Egg reversion verification', [
            'server_id' => $this->server->id,
            'current_egg_id' => $this->server->egg_id,
            'expected_egg_id' => $this->originalEggId,
            'is_reverted' => ($this->server->egg_id == $this->originalEggId) ? 'YES' : 'NO',
        ]);
        
        
        if ($this->server->egg_id != $this->originalEggId) {
            Log::warning('Egg not reverted properly, trying one last approach', [
                'server_id' => $this->server->id,
            ]);
            
            
            DB::statement("UPDATE servers SET egg_id = {$this->originalEggId}, nest_id = {$this->originalNestId} WHERE id = {$this->server->id}");
            
            
            $this->server->refresh();
            Log::info('Final egg reversion verification', [
                'server_id' => $this->server->id,
                'current_egg_id' => $this->server->egg_id,
                'expected_egg_id' => $this->originalEggId,
                'is_reverted' => ($this->server->egg_id == $this->originalEggId) ? 'YES' : 'NO',
            ]);
        }
    }

}