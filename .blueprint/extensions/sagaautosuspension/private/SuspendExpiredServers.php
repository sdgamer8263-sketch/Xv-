<?php

namespace Pterodactyl\Console\Commands;

use Carbon\Carbon;
use Illuminate\Console\Command;
use Pterodactyl\Models\Server;
use Illuminate\Support\Facades\Log;
use Pterodactyl\Services\Servers\SuspensionService;

class SuspendExpiredServers extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'p:servers:suspend-expired';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Suspends servers that have reached their expiration date';

    /**
     * Create a new command instance.
     */
    public function __construct(private SuspensionService $suspensionService)
    {
        parent::__construct();
    }

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->line('Starting automatic suspension of expired servers...');
        
        // Get current time with precision to the minute for exact matching
        $now = Carbon::now()->startOfMinute();
        $servers = Server::whereNotNull('expiration_date')
            ->where('expiration_date', '<=', $now)
            ->whereNull('status')
            ->get();
            
        if ($servers->isEmpty()) {
            // Log silently without output when no servers are expired
            return;
        }
        
        $this->info(sprintf('Found %d expired servers to suspend.', $servers->count()));
        
        $suspended = 0;
        foreach ($servers as $server) {
            try {
                $this->suspensionService->toggle($server, SuspensionService::ACTION_SUSPEND);
                $this->line(sprintf('Suspended server: %s (ID: %d)', $server->name, $server->id));
                $suspended++;
            } catch (\Exception $exception) {
                $this->error(sprintf('Failed to suspend server %s (ID: %d): %s', $server->name, $server->id, $exception->getMessage()));
                Log::error($exception, ['server_id' => $server->id]);
            }
        }
        
        $this->info(sprintf('Successfully suspended %d servers.', $suspended));
    }
}
