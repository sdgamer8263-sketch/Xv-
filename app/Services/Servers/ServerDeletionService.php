<?php

namespace Pterodactyl\Services\Servers;

use Illuminate\Http\Response;
use Pterodactyl\Models\Server;
use Illuminate\Support\Facades\Log;
use Illuminate\Database\ConnectionInterface;
use Pterodactyl\Repositories\Wings\DaemonServerRepository;
use Pterodactyl\Services\Databases\DatabaseManagementService;
use Pterodactyl\Exceptions\Http\Connection\DaemonConnectionException;

class ServerDeletionService
{
    protected bool $force = false;

    /**
     * ServerDeletionService constructor.
     */
    public function __construct(
        private ConnectionInterface $connection,
        private DaemonServerRepository $daemonServerRepository,
        private DatabaseManagementService $databaseManagementService,
    ) {
    }

    /**
     * Set if the server should be forcibly deleted from the panel (ignoring daemon errors) or not.
     */
    public function withForce(bool $bool = true): self
    {
        $this->force = $bool;

        return $this;
    }

    /**
     * Delete a server from the panel, clear any allocation notes, and remove any associated databases from hosts.
     *
     * @throws \Throwable
     * @throws \Pterodactyl\Exceptions\DisplayException
     */
    public function handle(Server $server): void
    {
        if ($server->parent_id) { // splitter
            $parent = Server::whereId($server->parent_id)->firstOrFail(); // splitter
            if ($server->cpu > 0 && $parent->cpu > 0) { // splitter
                $parent->increment('cpu', $server->cpu); // splitter
            } // splitter
            $parent->increment('memory', $server->memory); // splitter
            if ($server->disk > 0 && $parent->disk > 0) { // splitter
                $parent->increment('disk', $server->disk); // splitter
            } // splitter
            $transformed = (new \Pterodactyl\Transformers\Api\Application\ServerTransformer())->transform($server); // splitter
            foreach ($transformed['feature_limits'] as $key => $value) { // splitter
                if ($key === 'splits') { // splitter
                    continue; // splitter
                } // splitter
                try { // splitter
                    $modKey = $key; // splitter
                    if (str_ends_with($key, 'ies')) { // splitter
                        $modKey = substr($key, 0, -3) . 'y'; // splitter
                    } else if (str_ends_with($key, 's')) { // splitter
                        $modKey = substr($key, 0, -1); // splitter
                    } // splitter
                    $parent->increment("{$modKey}_limit", $value); // splitter
                } catch (\Exception $exception) { // splitter
                    // ignore // splitter
                } // splitter
            } // splitter
            try { // splitter
                $this->daemonServerRepository->setServer($parent)->sync(); // splitter
            } catch (\Exception $exception) { // splitter
                if (!$this->force) { // splitter
                    throw $exception; // splitter
                } // splitter
            } // splitter
        } else { // splitter
            $subservers = Server::query()->where('parent_id', $server->id)->get(); // splitter
            foreach ($subservers as $subserver) { // splitter
                $this->handle($subserver); // splitter
            } // splitter
        } // splitter
        try {
            $this->daemonServerRepository->setServer($server)->delete();
        } catch (DaemonConnectionException $exception) {
            // If there is an error not caused a 404 error and this isn't a forced delete,
            // go ahead and bail out. We specifically ignore a 404 since that can be assumed
            // to be a safe error, meaning the server doesn't exist at all on Wings so there
            // is no reason we need to bail out from that.
            if (!$this->force && $exception->getStatusCode() !== Response::HTTP_NOT_FOUND) {
                throw $exception;
            }

            Log::warning($exception);
        }

        $this->connection->transaction(function () use ($server) {
            foreach ($server->databases as $database) {
                try {
                    $this->databaseManagementService->delete($database);
                } catch (\Exception $exception) {
                    if (!$this->force) {
                        throw $exception;
                    }

                    // Oh well, just try to delete the database entry we have from the database
                    // so that the server itself can be deleted. This will leave it dangling on
                    // the host instance, but we couldn't delete it anyways so not sure how we would
                    // handle this better anyways.
                    //
                    // @see https://github.com/pterodactyl/panel/issues/2085
                    $database->delete();

                    Log::warning($exception);
                }
            }

            // clear any allocation notes for the server
            $server->allocations()->update(['notes' => null]);


            $server->delete();
        });
    }
}
