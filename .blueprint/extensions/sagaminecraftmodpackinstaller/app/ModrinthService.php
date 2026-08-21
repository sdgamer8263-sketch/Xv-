<?php

namespace Pterodactyl\BlueprintFramework\Extensions\sagaminecraftmodpackinstaller;

use GuzzleHttp\Client;
use GuzzleHttp\Exception\GuzzleException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class ModrinthService
{
    private const CACHE_TTL = 300; 
    private Client $client;

    /**
     * ModrinthService constructor.
     */
    public function __construct()
    {
        $this->client = new Client([
            'base_uri' => 'https://api.modrinth.com/v2/',
            'headers' => [
                'Accept' => 'application/json',
                'User-Agent' => 'Pterodactyl/ModpackInstaller',
            ],
            'verify' => true,
        ]);
    }

    /**
     * Search for modpacks.
     *
     * @param string|null $query
     * @param int $page
     * @param int $perPage
     * @param string|null $gameVersion
     * @param string|null $modLoader
     * @param string|null $sortField
     * @return array
     */
    public function searchModpacks(?string $query = null, int $page = 1, int $perPage = 24, ?string $gameVersion = null, ?string $modLoader = null, ?string $sortField = 'relevance'): array
    {
        try {
            
            $cacheKey = 'modrinth:search:' . md5(($query ?? '') . ":{$page}:{$perPage}:" . ($gameVersion ?? '') . ":" . ($modLoader ?? '') . ":" . ($sortField ?? 'relevance'));
            if (Cache::has($cacheKey)) {
                return Cache::get($cacheKey);
            }
            
            
            $facets = [["project_type:modpack"], ["server_side!=unsupported"]];
            
            
            if (!empty($gameVersion)) {
                $facets[] = ["versions:{$gameVersion}"];
            }
            
            
            if (!empty($modLoader)) {
                $facets[] = ["categories:{$modLoader}"];
            }
            
            $params = [
                'facets' => json_encode($facets),
                'index' => $sortField, 
                'offset' => ($page - 1) * $perPage,
                'limit' => $perPage,
            ];

            if (!empty($query)) {
                $params['query'] = $query;
            }

            $response = $this->client->get('search', [
                'query' => $params,
            ]);

            $responseData = json_decode($response->getBody()->getContents(), true);
            $modpacks = $responseData['hits'] ?? [];
            $total = $responseData['total_hits'] ?? 0;

            
            $items = [];
            $batchSize = 5; 
            $modpackBatches = array_chunk($modpacks, $batchSize);
            
            foreach ($modpackBatches as $batch) {
                $batchItems = [];
                
                foreach ($batch as $modpack) {
                    $modpackId = $modpack['project_id'];
                    $modpackCacheKey = "modrinth:modpack:{$modpackId}";
                    
                    
                    if (Cache::has($modpackCacheKey)) {
                        $batchItems[] = Cache::get($modpackCacheKey);
                        continue;
                    }
                    
                    
                    $latestVersionDate = null;
                    try {
                        
                        $versionCacheKey = "modrinth:versions:{$modpackId}";
                        if (Cache::has($versionCacheKey)) {
                            $versions = Cache::get($versionCacheKey);
                        } else {
                            
                            $versionResponse = $this->client->get("project/{$modpackId}/version");
                            $versions = json_decode($versionResponse->getBody()->getContents(), true);
                            
                            
                            Cache::put($versionCacheKey, $versions, 3600);
                        }
                        
                        
                        usort($versions, function($a, $b) {
                            return strtotime($b['date_published']) - strtotime($a['date_published']);
                        });
                        
                        $latestVersion = reset($versions);
                        $latestVersionDate = $latestVersion ? $latestVersion['date_published'] : null;
                    } catch (\Exception $e) {
                        Log::warning('Failed to get latest version for modpack: ' . $e->getMessage());
                    }
                    
                    
                    $modpackData = [
                        'id' => $modpack['project_id'],
                        'name' => $modpack['title'],
                        'summary' => $modpack['description'],
                        'author' => $modpack['author'] ?? 'Unknown',
                        'thumbnailUrl' => $modpack['icon_url'] ?? '',
                        'downloadCount' => $modpack['downloads'] ?? 0,
                        'gameVersion' => implode(', ', $modpack['versions'] ?? []),
                        'modLoader' => $this->getModLoaderFromCategories($modpack['categories'] ?? []),
                        'provider' => 'modrinth',
                        'fileDate' => $latestVersionDate ?? date('Y-m-d\TH:i:s\Z'),
                        'dateModified' => $latestVersionDate ?? null,
                    ];
                    
                    
                    Cache::put($modpackCacheKey, $modpackData, 3600);
                    $batchItems[] = $modpackData;
                }
                
                $items = array_merge($items, $batchItems);
            }

            $result = [
                'items' => $items,
                'pagination' => [
                    'total' => $total,
                    'count' => count($items),
                    'perPage' => $perPage,
                    'currentPage' => $page,
                    'totalPages' => ceil($total / $perPage),
                ],
            ];
            
            
            Cache::put($cacheKey, $result, 300);
            
            return $result;
        } catch (GuzzleException $e) {
            Log::error('Failed to search Modrinth modpacks: ' . $e->getMessage());
            return [
                'items' => [],
                'pagination' => [
                    'total' => 0,
                    'count' => 0,
                    'perPage' => $perPage,
                    'currentPage' => $page,
                    'totalPages' => 0,
                ],
            ];
        }
    }

    /**
     * Get modpack files.
     *
     * @param string $modId
     * @return array
     */

    public function getModpackFiles(string $modId): array
    {
        try {
            $response = $this->client->get("project/{$modId}/version");
            $responseData = json_decode($response->getBody()->getContents(), true);
            
            $items = array_map(function ($version) {
                return [
                    'id' => $version['id'],
                    'displayName' => $version['name'],
                    'fileName' => $version['files'][0]['filename'] ?? 'unknown.zip',
                    'downloadUrl' => $version['files'][0]['url'] ?? '',
                    'fileDate' => $version['date_published'] ?? date('Y-m-d\TH:i:s\Z'),
                ];
            }, $responseData);

            return [
                'items' => $items,
            ];
        } catch (GuzzleException $e) {
            Log::error('Failed to get Modrinth modpack files: ' . $e->getMessage());
            return [
                'items' => [],
            ];
        }
    }

    /**
     * Get modpack file info.
     *
     * @param string $modId
     * @param string $fileId
     * @return array
     */
    public function getModpackFileInfo(string $modId, string $fileId): array
    {
        try {
            $response = $this->client->get("version/{$fileId}");
            $file = json_decode($response->getBody()->getContents(), true);
            
            return [
                'id' => $file['id'],
                'displayName' => $file['name'],
                'fileName' => $file['files'][0]['filename'] ?? 'unknown.zip',
                'downloadUrl' => $file['files'][0]['url'] ?? '',
                'fileDate' => $file['date_published'] ?? date('Y-m-d\TH:i:s\Z'),
            ];
        } catch (GuzzleException $e) {
            Log::error('Failed to get Modrinth modpack file info: ' . $e->getMessage());
            return ['error' => $e->getMessage()];
        }
    }

    /**
     * Get mod loader from categories.
     *
     * @param array $categories
     * @return string
     */
    private function getModLoaderFromCategories(array $categories): string
    {
        if (in_array('forge', $categories)) {
            return 'Forge';
        } elseif (in_array('fabric', $categories)) {
            return 'Fabric';
        } elseif (in_array('quilt', $categories)) {
            return 'Quilt';
        } elseif (in_array('liteloader', $categories)) {
            return 'LiteLoader';
        } elseif (in_array('rift', $categories)) {
            return 'Rift';
        } elseif (in_array('neoforge', $categories)) {
            return 'NeoForge';
        }
        
        return 'Unknown';
    }

    /**
     * Get mod loader from loaders array.
     *
     * @param array $loaders
     * @return string
     */
    private function getModLoaderFromLoaders(array $loaders): string
    {
        if (empty($loaders)) {
            return 'Unknown';
        }

        
        return ucfirst($loaders[0]);
    }
}
