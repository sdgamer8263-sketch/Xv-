<?php

namespace Pterodactyl\BlueprintFramework\Extensions\sagaminecraftmodpackinstaller;

use Illuminate\Http\Request;
use Pterodactyl\Models\Server;
use Illuminate\Http\Response;
use Pterodactyl\Models\Egg;
use Pterodactyl\Facades\Activity;
use Pterodactyl\Models\Permission;
use Pterodactyl\BlueprintFramework\Extensions\sagaminecraftmodpackinstaller\CurseForgeService;
use Pterodactyl\BlueprintFramework\Extensions\sagaminecraftmodpackinstaller\ModrinthService;
use Pterodactyl\BlueprintFramework\Extensions\sagaminecraftmodpackinstaller\FeedTheBeastService;
use Pterodactyl\Http\Controllers\Api\Client\ClientApiController;
use Pterodactyl\Repositories\Wings\DaemonFileRepository;
use Pterodactyl\Repositories\Wings\DaemonPowerRepository;
use Illuminate\Http\JsonResponse;
use GuzzleHttp\Exception\GuzzleException;
use Illuminate\Support\Facades\Log;
use Illuminate\Auth\Access\AuthorizationException;
use Pterodactyl\BlueprintFramework\Extensions\sagaminecraftmodpackinstaller\ModpackInstallationJob;
use Illuminate\Support\Facades\DB;
use Pterodactyl\BlueprintFramework\Extensions\sagaminecraftmodpackinstaller\UpsertModpackInstallerEggService;

class ModpackController extends ClientApiController
{
    private CurseForgeService $curseForgeService;
    private ModrinthService $modrinthService;
    private FeedTheBeastService $feedTheBeastService;
    private DaemonFileRepository $fileRepository;
    private DaemonPowerRepository $powerRepository;
    private UpsertModpackInstallerEggService $upsertModpackInstallerEggService;

    public function __construct(
        CurseForgeService $curseForgeService,
        ModrinthService $modrinthService,
        FeedTheBeastService $feedTheBeastService,
        DaemonFileRepository $fileRepository,
        DaemonPowerRepository $powerRepository,
        UpsertModpackInstallerEggService $upsertModpackInstallerEggService
    ) {
        parent::__construct();
        
        $this->curseForgeService = $curseForgeService;
        $this->modrinthService = $modrinthService;
        $this->feedTheBeastService = $feedTheBeastService;
        $this->fileRepository = $fileRepository;
        $this->powerRepository = $powerRepository;
        $this->upsertModpackInstallerEggService = $upsertModpackInstallerEggService;
    }

    /**
     * Get modpacks list.
     */
    public function index(Request $request, Server $server)
    {
        $query = $request->input('query');
        $page = max(1, (int) $request->input('page', 1));
        
        
        $requestedPerPage = (int) $request->input('perPage', 24);
        $allowedPageSizes = [12, 24, 48];
        $perPage = in_array($requestedPerPage, $allowedPageSizes) ? $requestedPerPage : 24;
        
        
        $provider = $request->input('provider', 'curseforge');
        
        
        $gameVersion = $request->input('version');
        $modLoader = $request->input('loader');
        $sort = $request->input('sort', 'relevance');
        
        
        $sortMapping = [
            'curseforge' => [
                'relevance' => 'popularity', 
                'downloads' => 'totalDownloads',
                'updated' => 'lastUpdated',
            ],
            'modrinth' => [
                'relevance' => 'relevance', 
                'downloads' => 'downloads',
                'updated' => 'updated',
            ],
            'ftb' => [
                'relevance' => 'featured', 
                'downloads' => 'downloads',
                'updated' => 'release_date',
            ],
        ];
        
        
        $providerSort = $sortMapping[$provider][$sort] ?? $sortMapping[$provider]['relevance'];

        
        $result = match ($provider) {
            'modrinth' => $this->modrinthService->searchModpacks($query, $page, $perPage, $gameVersion, $modLoader, $providerSort),
            'ftb' => $this->feedTheBeastService->searchModpacks($query, $page, $perPage, $gameVersion, $modLoader, $providerSort),
            default => $this->curseForgeService->searchModpacks($query, $page, $perPage, $gameVersion, $modLoader, $providerSort),
        };
        
        
        $result['pagination']['perPage'] = $perPage;
        
        return $result;
    }

    /**
     * Get filter options for modpacks.
     */
    public function filters(Request $request, Server $server)
    {
        $provider = $request->input('provider', 'curseforge');
        
        $result = match ($provider) {
            'modrinth' => $this->getModrinthFilters(),
            'ftb' => $this->getFeedTheBeastFilters(),
            default => $this->getCurseForgeFilters(),
        };
        
        return new JsonResponse($result);
    }
    
    /**
     * Get CurseForge filter options.
     */
    private function getCurseForgeFilters(): array
    {
        $cacheKey = 'curseforge:filters';
        
        return \Illuminate\Support\Facades\Cache::remember($cacheKey, 3600, function () {
            
            $loaders = [
                'forge',
                'fabric',
                'quilt',
                'neoforge',
            ];
            
            try {
                
                $versions = $this->getMinecraftVersionsFromModrinth();
            } catch (\Exception $e) {
                
                
                $versions = [];
            }
            
            return [
                'loaders' => $loaders,
                'versions' => $versions,
            ];
        });
    }
    
    /**
     * Helper method to get Minecraft versions from Modrinth API.
     * 
     * @return array
     */
    private function getMinecraftVersionsFromModrinth(): array
    {
        try {
            
            $client = new \GuzzleHttp\Client([
                'base_uri' => 'https://api.modrinth.com/v2/',
                'headers' => [
                    'Accept' => 'application/json',
                    'User-Agent' => 'Pterodactyl/ModpackInstaller',
                ],
                'verify' => true,
            ]);
            
            
            $response = $client->get('tag/game_version');
            $gameVersions = json_decode($response->getBody()->getContents(), true);
            
            $minecraftVersions = [];
            foreach ($gameVersions as $version) {
                
                if (isset($version['version']) && 
                    strpos($version['version'], 'java') === false && 
                    strpos($version['version'], 'w') === false && 
                    strpos($version['version'], 'pre') === false && 
                    strpos($version['version'], 'rc') === false && 
                    strpos($version['version'], 'snapshot') === false) {
                    $minecraftVersions[] = $version['version'];
                }
            }
            
            
            usort($minecraftVersions, function ($a, $b) {
                return version_compare($b, $a);
            });
            
            
            return $minecraftVersions;
        } catch (\Exception $e) {
            
            \Illuminate\Support\Facades\Log::error('Failed to get Minecraft versions from Modrinth: ' . $e->getMessage());
            throw $e; 
        }
    }

    /**
     * Get Modrinth filter options.
     */
    private function getModrinthFilters(): array
    {
        $cacheKey = 'modrinth:filters';
        
        return \Illuminate\Support\Facades\Cache::remember($cacheKey, 3600, function () {
            $loaders = [
                'forge',
                'fabric',
                'quilt',
                'neoforge',
            ];
            
            try {
                
                $versions = $this->getMinecraftVersionsFromModrinth();
            } catch (\Exception $e) {
                
                
                $versions = [];
            }
            
            return [
                'loaders' => $loaders,
                'versions' => $versions,
            ];
        });
    }
    
    /**
     * Get FeedTheBeast filter options.
     */
    private function getFeedTheBeastFilters(): array
    {
        $cacheKey = 'ftb:filters';
        
        return \Illuminate\Support\Facades\Cache::remember($cacheKey, 3600, function () {
            
            $loaders = [
                'Magic', 'Tech', 'Questing', 'NeoForge', 'Exploration', 'Progression', 
                'Adventure', 'RPG', 'Combat', 'Sci-Fi', 'Kitchen Sink', 'Skyblock', 
                'Expert', 'Large', 'Challenge', 'Building', 'Sandbox', 'Creative', 
                'Forge', 'Map', 'Fabric', 'Unstable', 'Light', 'Small'
            ];
            
            try {
                
                $versions = $this->getMinecraftVersionsFromModrinth();
            } catch (\Exception $e) {
                
                
                $versions = [];
            }
            
            return [
                'loaders' => $loaders,
                'versions' => $versions,
            ];
        });
    }
    
    /**
     * Get modpack versions.
     */
    public function versions(Request $request, Server $server)
    {
        $modId = $request->input('modId');
        $provider = $request->input('provider', 'curseforge');
        
        if (!$modId) {
            return new JsonResponse(['error' => 'modId is required'], 400);
        }

        return match ($provider) {
            'modrinth' => $this->modrinthService->getModpackFiles($modId),
            'ftb' => $this->feedTheBeastService->getModpackFiles($modId),
            default => $this->curseForgeService->getModpackFiles((int) $modId),
        };
    }

    /**
     * Install a modpack using the modpack installer egg.
     */
    public function install(Request $request, Server $server)
    {
        if (!$request->user()->can(Permission::ACTION_FILE_CREATE, $server)) {
            throw new AuthorizationException();
        }
        
        
        try {
            $installerEgg = $this->upsertModpackInstallerEggService->handle();
            Log::info('Modpack installer egg upserted successfully', [
                'egg_id' => $installerEgg->id,
                'egg_name' => $installerEgg->name,
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to upsert modpack installer egg: ' . $e->getMessage());
            return new JsonResponse(['error' => 'Failed to ensure modpack installer egg exists: ' . $e->getMessage()], Response::HTTP_INTERNAL_SERVER_ERROR);
        }

        if ($server->egg_id === $installerEgg->id) {
            return new JsonResponse(['message' => 'Already processing a modpack installation job.'], Response::HTTP_CONFLICT);
        }
        
        
        Log::info('Using modpack installer egg', [
            'egg_id' => $installerEgg->id,
            'egg_name' => $installerEgg->name,
            'egg_author' => $installerEgg->author,
        ]);

        $validated = $request->validate([
            'fileId' => 'required',
            'deleteFiles' => 'required|boolean',
            'provider' => 'required|string|in:curseforge,modrinth,ftb',
            'modpackId' => 'required|string',
        ]);

        $fileId = $validated['fileId'];
        $deleteFiles = $validated['deleteFiles'];
        $provider = $validated['provider'];
        $modpackId = $validated['modpackId'];
        
        
        $originalEggId = $server->egg_id;
        $originalNestId = $server->nest_id;
        
        Log::info('Saving original egg information before modpack installation', [
            'server_id' => $server->id,
            'original_egg_id' => $originalEggId,
            'original_nest_id' => $originalNestId,
            'original_egg_name' => $server->egg->name,
        ]);
        
        
        DB::beginTransaction();
        try {
            
            $server->update([
                'egg_id' => $installerEgg->id,
                'nest_id' => $installerEgg->nest_id,
            ]);
            
            
            $providerVar = $installerEgg->variables()->where('env_variable', 'MODPACK_PROVIDER')->first();
            $modpackIdVar = $installerEgg->variables()->where('env_variable', 'MODPACK_ID')->first();
            $versionIdVar = $installerEgg->variables()->where('env_variable', 'MODPACK_VERSION_ID')->first();
            $deleteFilesVar = $installerEgg->variables()->where('env_variable', 'DELETE_SERVER_FILES')->first();
            $curseforgeApiKeyVar = $installerEgg->variables()->where('env_variable', 'CURSEFORGE_API_KEY')->first();
            
            
            if ($providerVar) {
                DB::table('server_variables')->updateOrInsert(
                    ['server_id' => $server->id, 'variable_id' => $providerVar->id],
                    ['variable_value' => $provider]
                );
            }
            
            if ($modpackIdVar) {
                DB::table('server_variables')->updateOrInsert(
                    ['server_id' => $server->id, 'variable_id' => $modpackIdVar->id],
                    ['variable_value' => $modpackId]
                );
            }
            
            if ($versionIdVar) {
                DB::table('server_variables')->updateOrInsert(
                    ['server_id' => $server->id, 'variable_id' => $versionIdVar->id],
                    ['variable_value' => $fileId]
                );
            }
            
            if ($deleteFilesVar) {
                DB::table('server_variables')->updateOrInsert(
                    ['server_id' => $server->id, 'variable_id' => $deleteFilesVar->id],
                    ['variable_value' => $deleteFiles ? 'true' : 'false']
                );
            }
            
            
            if ($curseforgeApiKeyVar) {
                
                // Get the API key from the Blueprint extension database like CurseForgeService does
                $blueprint = app('Pterodactyl\BlueprintFramework\Libraries\ExtensionLibrary\Admin\BlueprintAdminLibrary');
                $apiKey = $blueprint->dbGet('sagaminecraftmodpackinstaller', 'config:curseforge_api_key');
                
                if (!empty($apiKey)) {
                    Log::info('Setting CurseForge API Key for modpack installation', [
                        'server_id' => $server->id,
                        'has_api_key' => !empty($apiKey)
                    ]);
                    
                    DB::table('server_variables')->updateOrInsert(
                        ['server_id' => $server->id, 'variable_id' => $curseforgeApiKeyVar->id],
                        ['variable_value' => $apiKey]
                    );
                } else {
                    // Try to get from environment if not in database
                    $apiKey = env('CURSEFORGE_API_KEY');
                    
                    if (!empty($apiKey)) {
                        DB::table('server_variables')->updateOrInsert(
                            ['server_id' => $server->id, 'variable_id' => $curseforgeApiKeyVar->id],
                            ['variable_value' => $apiKey]
                        );
                    } else {
                        Log::warning('CurseForge API Key not found in database or environment', [
                            'server_id' => $server->id
                        ]);
                    }
                }
            }
            
            
            
            ModpackInstallationJob::dispatch(
                $server,
                $provider,
                $modpackId,
                $fileId,
                $deleteFiles
            );
            
            
            dispatch(function () use ($server, $originalEggId, $originalNestId) {
                Log::info('Scheduled egg reversion job started', [
                    'server_id' => $server->id,
                    'original_egg_id' => $originalEggId,
                    'original_nest_id' => $originalNestId
                ]);
                
                
                sleep(5);
                
                
                DB::table('servers')
                    ->where('id', $server->id)
                    ->update([
                        'egg_id' => $originalEggId,
                        'nest_id' => $originalNestId,
                    ]);
                
                
                $server->refresh();
                Log::info('Egg reversion completed', [
                    'server_id' => $server->id,
                    'current_egg_id' => $server->egg_id,
                    'expected_egg_id' => $originalEggId,
                    'is_reverted' => ($server->egg_id == $originalEggId) ? 'YES' : 'NO'
                ]);
            })->delay(now()->addSeconds(5));
            
            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to install modpack: ' . $e->getMessage());
            return new JsonResponse(['error' => 'Failed to install modpack: ' . $e->getMessage()], Response::HTTP_INTERNAL_SERVER_ERROR);
        }

        
        Activity::event('server:modpack.install')
            ->property('provider', $provider)
            ->property('modpack_id', $modpackId)
            ->property('modpack_version_id', $fileId)
            ->log();

        return new JsonResponse(['message' => 'Modpack installation started'], Response::HTTP_ACCEPTED);
    }
}
