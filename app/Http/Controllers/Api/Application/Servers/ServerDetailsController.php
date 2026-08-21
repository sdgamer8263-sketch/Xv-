<?php

namespace Pterodactyl\Http\Controllers\Api\Application\Servers;

use Pterodactyl\Models\Server;
use Pterodactyl\Services\Servers\BuildModificationService;
use Pterodactyl\Services\Servers\DetailsModificationService;
use Pterodactyl\Transformers\Api\Application\ServerTransformer;
use Pterodactyl\Http\Controllers\Api\Application\ApplicationApiController;
use Pterodactyl\Http\Requests\Api\Application\Servers\UpdateServerDetailsRequest;
use Pterodactyl\Http\Requests\Api\Application\Servers\UpdateServerBuildConfigurationRequest;

class ServerDetailsController extends ApplicationApiController
{
    /**
     * ServerDetailsController constructor.
     */
    public function __construct(
        private BuildModificationService $buildModificationService,
        private DetailsModificationService $detailsModificationService,
    ) {
        parent::__construct();
    }

    /**
     * Update the details for a specific server.
     *
     * @throws \Pterodactyl\Exceptions\DisplayException
     * @throws \Pterodactyl\Exceptions\Model\DataValidationException
     * @throws \Pterodactyl\Exceptions\Repository\RecordNotFoundException
     */
    public function details(UpdateServerDetailsRequest $request, Server $server): array
    {
        $updated = $this->detailsModificationService->returnUpdatedModel()->handle(
            $server,
            $request->validated()
        );

        return $this->fractal->item($updated)
            ->transformWith($this->getTransformer(ServerTransformer::class))
            ->toArray();
    }

    /**
     * Update the build details for a specific server.
     *
     * @throws \Pterodactyl\Exceptions\DisplayException
     * @throws \Pterodactyl\Exceptions\Model\DataValidationException
     * @throws \Pterodactyl\Exceptions\Repository\RecordNotFoundException
     */
    public function build(UpdateServerBuildConfigurationRequest $request, Server $server): array
    {
        if (!$server->parent_id) { // splitter
            $children = Server::query()->where('parent_id', $server->id)->get(); // splitter
            $totalResources = $server->totalResources(); // splitter
            if ($children->isNotEmpty()) { // splitter
                $data = $request->validated(); // splitter
                if (isset($data['cpu']) && $data['cpu'] !== 0 && $data['cpu'] !== $server->cpu) { // splitter
                    if ($data['cpu'] >= $totalResources['cpu']) { // splitter
                        $added = $data['cpu'] - $totalResources['cpu']; // splitter
                        $server->increment('cpu', $added); // splitter
                        $server->saveOrFail(); // splitter
                    } else { // splitter
                        $total = $data['cpu']; // splitter
                        $share = $total / ($children->count() + 1); // splitter
                        $server->cpu = ceil($share); // splitter
                        $server->saveOrFail(); // splitter
                        foreach ($children as $child) { // splitter
                            $child->cpu = floor($share); // splitter
                            $child->saveOrFail(); // splitter
                        } // splitter
                    } // splitter
                } // splitter
                if (isset($data['memory']) && $data['memory'] !== 0 && $data['memory'] !== $server->memory) { // splitter
                    if ($data['memory'] >= $totalResources['memory']) { // splitter
                        $added = $data['memory'] - $totalResources['memory']; // splitter
                        $server->increment('memory', $added); // splitter
                        $server->saveOrFail(); // splitter
                    } else { // splitter
                        $total = $data['memory']; // splitter
                        $share = $total / ($children->count() + 1); // splitter
                        $server->memory = ceil($share); // splitter
                        $server->saveOrFail(); // splitter
                        foreach ($children as $child) { // splitter
                            $child->memory = floor($share); // splitter
                            $child->saveOrFail(); // splitter
                        } // splitter
                    } // splitter
                } // splitter
                if (isset($data['disk']) && $data['disk'] !== 0 && $data['disk'] !== $server->disk) { // splitter
                    if ($data['disk'] >= $totalResources['disk']) { // splitter
                        $added = $data['disk'] - $totalResources['disk']; // splitter
                        $server->increment('disk', $added); // splitter
                        $server->saveOrFail(); // splitter
                    } else { // splitter
                        $total = $data['disk']; // splitter
                        $share = $total / ($children->count() + 1); // splitter
                        $server->disk = ceil($share); // splitter
                        $server->saveOrFail(); // splitter
                        foreach ($children as $child) { // splitter
                            $child->disk = floor($share); // splitter
                            $child->saveOrFail(); // splitter
                        } // splitter
                    } // splitter
                } // splitter
                foreach ($data as $key => $value) { // splitter
                    if (!str_ends_with($key, '_limit') || $value === 0) { // splitter
                        continue; // splitter
                    } // splitter
                    if ($key === 'splitter_limit') { // splitter
                        $server->{$key} = $value; // splitter
                        continue; // splitter
                    } // splitter
                    $modKey = substr($key, 0, -6); // splitter
                    if (str_ends_with($modKey, 'y')) { // splitter
                        $modKey = substr($modKey, 0, -1) . 'ie'; // splitter
                    } // splitter
                    $modKey .= 's'; // splitter
                    if ($value >= $totalResources['feature_limits'][$modKey]) { // splitter
                        try { // splitter
                            $added = $value - $totalResources['feature_limits'][$modKey]; // splitter
                            $server->increment($key, $added); // splitter
                            $server->saveOrFail(); // splitter
                        } catch (\Exception $exception) { // splitter
                            // ignore // splitter
                        } // splitter
                    } else { // splitter
                        $total = $value; // splitter
                        $share = $total / ($children->count() + 1); // splitter
                        $server->{$key} = ceil($share); // splitter
                        $server->saveOrFail(); // splitter
                        foreach ($children as $child) { // splitter
                            $child->{$key} = floor($share); // splitter
                            $child->saveOrFail(); // splitter
                        } // splitter
                    } // splitter
                } // splitter
                $server->saveOrFail(); // splitter
                $this->detailsModificationService->handle($server, $server->toArray()); // splitter
                foreach ($children as $child) { // splitter
                    $this->detailsModificationService->handle($child, $child->toArray()); // splitter
                } // splitter
            } else { // splitter
                $server = $this->buildModificationService->handle($server, $request->validated()); // splitter
            } // splitter
        } else { // splitter
            $server = $this->buildModificationService->handle($server, $request->validated()); // splitter
        } // splitter

        return $this->fractal->item($server)
            ->transformWith($this->getTransformer(ServerTransformer::class))
            ->toArray();
    }
}
