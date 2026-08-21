<?php

namespace Pterodactyl\BlueprintFramework\Extensions\sagaminecraftmodpackinstaller;

use GuzzleHttp\Client;
use GuzzleHttp\Exception\GuzzleException;
use GuzzleHttp\Pool;
use GuzzleHttp\Psr7\Request;
use GuzzleHttp\Psr7\Response;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class FeedTheBeastService
{
    private Client $client;

    /**
     * FeedTheBeastService constructor.
     */
    public function __construct()
    {
        $this->client = new Client([
            'base_uri' => 'https://api.feed-the-beast.com/v1/modpacks/public/modpack/',
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
    public function searchModpacks(?string $query = null, int $page = 1, int $perPage = 24, ?string $gameVersion = null, ?string $modLoader = null, ?string $sortField = 'featured'): array
    {
        try {
            
            $cacheKey = 'ftb:search:' . md5(($query ?? '') . ":{$page}:{$perPage}:" . ($gameVersion ?? '') . ":" . ($modLoader ?? '') . ":" . ($sortField ?? 'featured'));
            if (Cache::has($cacheKey)) {
                return Cache::get($cacheKey);
            }

            
            $uri = empty($query) ? 'all' : 'search/100';

            
            $response = json_decode($this->client->get($uri, [
                'query' => [
                    'term' => $query,
                ],
            ])->getBody(), true);

            if (!isset($response['packs']) || empty($response['packs'])) {
                
                $emptyResult = [
                    'items' => [],
                    'pagination' => [
                        'total' => 0,
                        'count' => 0,
                        'perPage' => $perPage,
                        'currentPage' => $page,
                        'totalPages' => 0,
                    ],
                ];
                Cache::put($cacheKey, $emptyResult, 300);
                return $emptyResult;
            }

            
            
            $packIds = array_slice($response['packs'], 0, 100);
            $packIds = array_filter($packIds, function($id) {
                return $id != 81; 
            });
            
            
            $modpacks = [];
            $requestsNeeded = [];
            $requestPackIds = [];
            
            foreach ($packIds as $ftbPackId) {
                $modpackCacheKey = "ftb:modpack:{$ftbPackId}";
                if (Cache::has($modpackCacheKey)) {
                    $modpacks[] = Cache::get($modpackCacheKey);
                } else {
                    $requestPackIds[] = $ftbPackId;
                    $requestsNeeded[] = new Request('GET', (string) $ftbPackId);
                }
            }
            
            
            if (!empty($requestsNeeded)) {
                $pool = new Pool($this->client, $requestsNeeded, [
                    'concurrency' => min(count($requestsNeeded), 5), 
                    'fulfilled' => function (Response $response, $index) use (&$modpacks, $requestPackIds) {
                        if ($response->getStatusCode() != 200) {
                            return;
                        }

                        $ftbModpack = json_decode($response->getBody(), true);

                        if (isset($ftbModpack['status']) && $ftbModpack['status'] === 'error') {
                            return;
                        }

                        
                        $iconUrl = '';
                        if (isset($ftbModpack['art']) && is_array($ftbModpack['art'])) {
                            $squareArt = array_values(array_filter($ftbModpack['art'], function ($art) {
                                return $art['type'] === 'square';
                            }));
                            
                            if (!empty($squareArt)) {
                                $iconUrl = $squareArt[0]['url'];
                            }
                        }

                        
                        $modifiedDate = date('Y-m-d\TH:i:s\Z');
                        if (isset($ftbModpack['updated'])) {
                            $raw = $ftbModpack['updated'];
                            if (is_numeric($raw)) {
                                $ts = intval($raw);
                                
                                if ($ts > 1000000000000) {
                                    $ts = intval($ts / 1000);
                                }
                                $modifiedDate = gmdate('Y-m-d\TH:i:s\Z', $ts);
                            } else {
                                $ts = strtotime($raw);
                                if ($ts !== false) {
                                    $modifiedDate = gmdate('Y-m-d\TH:i:s\Z', $ts);
                                }
                            }
                        }
                        
                        
                        $createdDate = null;
                        if (isset($ftbModpack['created'])) {
                            $raw = $ftbModpack['created'];
                            if (is_numeric($raw)) {
                                $ts = intval($raw);
                                if ($ts > 1000000000000) {
                                    $ts = intval($ts / 1000);
                                }
                                $createdDate = gmdate('Y-m-d\TH:i:s\Z', $ts);
                            } else {
                                $ts = strtotime($raw);
                                if ($ts !== false) {
                                    $createdDate = gmdate('Y-m-d\TH:i:s\Z', $ts);
                                }
                            }
                        }

                        
                        $latestTs = null;
                        if (isset($ftbModpack['versions']) && is_array($ftbModpack['versions'])) {
                            foreach ($ftbModpack['versions'] as $version) {
                                if (isset($version['updated']) && is_numeric($version['updated'])) {
                                    $tsCandidate = intval($version['updated']);
                                } elseif (isset($version['updated'])) {
                                    $tsCandidate = strtotime($version['updated']);
                                } else {
                                    continue;
                                }
                                if ($tsCandidate !== false && ($latestTs === null || $tsCandidate > $latestTs)) {
                                    $latestTs = $tsCandidate;
                                }
                            }
                        }
                        if ($latestTs === null && isset($ftbModpack['updated']) && is_numeric($ftbModpack['updated'])) {
                            $latestTs = intval($ftbModpack['updated']);
                        }
                        if ($latestTs !== null) {
                            if ($latestTs > 1000000000000) {
                                $latestTs = intval($latestTs / 1000);
                            }
                            $modifiedDate = gmdate('Y-m-d\TH:i:s\Z', $latestTs);
                        } else {
                            $modifiedDate = date('Y-m-d\TH:i:s\Z');
                        }

                        
                        $modpackData = [
                            'id' => (string) $ftbModpack['id'],
                            'name' => $ftbModpack['name'] ?? 'Unknown',
                            'summary' => $ftbModpack['description'] ?? '',
                            'websiteUrl' => 'https://feed-the-beast.com/modpacks/' . $ftbModpack['id'],
                            'iconUrl' => $iconUrl,
                            'provider' => 'ftb',
                            'author' => $ftbModpack['author'] ?? 'Feed The Beast',
                            'downloadCount' => $ftbModpack['installs'] ?? 0,
                            'gameVersion' => $ftbModpack['minecraft'] ?? '',
                            'modLoader' => $ftbModpack['modloader'] ?? '',
                            'thumbnailUrl' => $iconUrl,
                            'fileDate' => $modifiedDate,
                            'dateCreated' => $createdDate,
                            'dateModified' => $modifiedDate,
                        ];
                        
                        
                        $modpackCacheKey = "ftb:modpack:{$requestPackIds[$index]}";
                        Cache::put($modpackCacheKey, $modpackData, 3600); 
                        
                        $modpacks[] = $modpackData;
                    },
                ]);

                $pool->promise()->wait();
            }

            
            
            if (!empty($gameVersion) || !empty($modLoader)) {
                $modpacks = array_filter($modpacks, function($modpack) use ($gameVersion, $modLoader) {
                    $versionMatch = empty($gameVersion) || (isset($modpack['gameVersion']) && strpos($modpack['gameVersion'], $gameVersion) !== false);
                    $loaderMatch = empty($modLoader) || (isset($modpack['modLoader']) && strtolower($modpack['modLoader']) === strtolower($modLoader));
                    return $versionMatch && $loaderMatch;
                });
                
                $modpacks = array_values($modpacks);
            }
            
            
            switch ($sortField) {
                case 'downloads':
                    usort($modpacks, function($a, $b) {
                        $downloadsA = $a['downloadCount'] ?? 0;
                        $downloadsB = $b['downloadCount'] ?? 0;
                        return $downloadsB <=> $downloadsA;
                    });
                    break;
                case 'release_date':
                    usort($modpacks, function($a, $b) {
                        $dateA = strtotime($a['dateCreated'] ?? $a['dateModified'] ?? $a['fileDate'] ?? 0);
                        $dateB = strtotime($b['dateCreated'] ?? $b['dateModified'] ?? $b['fileDate'] ?? 0);
                        return $dateB <=> $dateA;
                    });
                    break;
                case 'updated':
                    usort($modpacks, function($a, $b) {
                        $dateA = strtotime($a['dateModified'] ?? $a['fileDate'] ?? $a['dateCreated'] ?? 0);
                        $dateB = strtotime($b['dateModified'] ?? $b['fileDate'] ?? $b['dateCreated'] ?? 0);
                        return $dateB <=> $dateA;
                    });
                    break;
                case 'featured':
                default:
                    
                    break;
            }
            
            
            $total = count($modpacks);
            $offset = ($page - 1) * $perPage;
            $items = array_slice($modpacks, $offset, $perPage);

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
            
            return [
                'items' => [],
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
            $response = $this->client->get($modId);
            $modpack = json_decode($response->getBody()->getContents(), true);

            if (!isset($modpack['versions']) || !is_array($modpack['versions'])) {
                return [
                    'items' => [],
                ];
            }

            $versions = [];

            foreach ($modpack['versions'] as $ftbModpackVersion) {
                $versions[] = [
                    'id' => (string) $ftbModpackVersion['id'],
                    'displayName' => $ftbModpackVersion['name'] ?? 'Unknown',
                    'fileName' => ($modpack['name'] ?? 'Unknown') . ' - ' . ($ftbModpackVersion['name'] ?? 'Unknown') . '.zip',
                    'gameVersion' => $ftbModpackVersion['minecraft'] ?? '',
                    
                    'modLoader' => $ftbModpackVersion['modloader'] ?? '',
                    'fileDate' => $ftbModpackVersion['updated'] ?? date('Y-m-d\TH:i:s\Z'),
                    'fileLength' => 0, 
                ];
            }

            
            $versions = array_reverse($versions);

            return [
                'items' => $versions,
            ];
        } catch (GuzzleException $e) {
            
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
            
            $modpackResponse = $this->client->get($modId);
            $modpack = json_decode($modpackResponse->getBody()->getContents(), true);
            
            if (!isset($modpack['name'])) {
                return [
                    'error' => 'Failed to get modpack information',
                ];
            }
            
            $version = null;
            if (isset($modpack['versions']) && is_array($modpack['versions'])) {
                foreach ($modpack['versions'] as $v) {
                    if ((string)$v['id'] === (string)$fileId) {
                        $version = $v;
                        break;
                    }
                }
            }
            
            if (!$version) {
                return [
                    'error' => 'Version not found in modpack',
                ];
            }
            
            
            $serverDownloadUrl = "https://api.feed-the-beast.com/v1/modpacks/public/modpack/{$modId}/{$fileId}/server/linux";
            
            return [
                'id' => $fileId,
                'displayName' => ($modpack['name'] ?? 'Unknown') . ' - ' . ($version['name'] ?? 'Unknown Version'),
                'fileName' => "serverinstall_{$modId}_{$fileId}", 
                'downloadUrl' => $serverDownloadUrl,
                'gameVersion' => $version['minecraft'] ?? '',
                'modLoader' => $version['modloader'] ?? '',
                'fileDate' => $version['updated'] ?? date('Y-m-d\TH:i:s\Z'),
                'ftbModpackId' => $modId, 
                'ftbVersionId' => $fileId, 
            ];
        } catch (GuzzleException $e) {
            
            return [
                'error' => 'Failed to get modpack file information: ' . $e->getMessage(),
            ];
        }
    }
}
