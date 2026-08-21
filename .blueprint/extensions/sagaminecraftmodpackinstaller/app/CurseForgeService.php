<?php

namespace Pterodactyl\BlueprintFramework\Extensions\sagaminecraftmodpackinstaller;

use GuzzleHttp\Client;
use GuzzleHttp\Exception\GuzzleException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Pterodactyl\Models\ModpackSetting;
use Pterodactyl\Models\Server;
use Pterodactyl\BlueprintFramework\Extensions\sagaminecraftmodpackinstaller\ModpackInstallationJob;
use Pterodactyl\BlueprintFramework\Libraries\ExtensionLibrary\Admin\BlueprintAdminLibrary as BlueprintExtensionLibrary;

class CurseForgeService
{
    private const CACHE_TTL = 300; 
    private Client $client;

    public function __construct(BlueprintExtensionLibrary $blueprint)
    {
        $this->client = new Client([
            'base_uri' => 'https://api.curseforge.com/v1/',
            'headers' => [
                'Accept' => 'application/json',
                'X-API-Key' => $blueprint->dbGet('sagaminecraftmodpackinstaller', 'config:curseforge_api_key'),
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
    public function searchModpacks(?string $query = null, int $page = 1, int $perPage = 24, ?string $gameVersion = null, ?string $modLoader = null, ?string $sortField = 'popularity'): array
    {
        try {
            
            $cacheKey = 'curseforge:search:' . md5(($query ?? '') . ":{$page}:{$perPage}:" . ($gameVersion ?? '') . ":" . ($modLoader ?? '') . ":" . ($sortField ?? 'popularity'));
            
            
            if (Cache::has($cacheKey)) {
                return Cache::get($cacheKey);
            }
            
            
            $sortFieldMap = [
                'popularity' => 2, 
                'lastUpdated' => 3, 
                'totalDownloads' => 6, 
                'name' => 1, 
            ];
            
            $sortFieldId = $sortFieldMap[$sortField] ?? 2; 
            
            $params = [
                'gameId' => 432, 
                'classId' => 4471, 
                'pageSize' => $perPage,
                'index' => ($page - 1) * $perPage,
                'sortField' => $sortFieldId,
                'sortOrder' => 'desc',
            ];

            
            if (!empty($query)) {
                $params['searchFilter'] = $query;
            }

            
            if (!empty($gameVersion)) {
                $params['gameVersion'] = $gameVersion;
            }

            
            if (!empty($modLoader)) {
                $params['modLoaderType'] = $this->getModLoaderTypeId($modLoader);
            }

            $response = $this->client->get('mods/search', [
                'query' => $params,
            ]);

            $responseData = json_decode($response->getBody()->getContents(), true);
            $modpacks = $responseData['data'] ?? [];
            $pagination = $responseData['pagination'] ?? [
                'totalCount' => count($modpacks),
                'index' => ($page - 1) * $perPage,
                'pageSize' => $perPage,
            ];

            
            $items = array_map(function ($modpack) {
                
                $gameVersion = '';
                $modLoaderName = '';
                $fileDate = $modpack['dateModified'] ?? $modpack['dateCreated'] ?? date('Y-m-d\\TH:i:s\\Z');
                
                
                if (!empty($modpack['latestFilesIndexes'])) {
                    $latestFile = $modpack['latestFilesIndexes'][0] ?? null;
                    if ($latestFile) {
                        $gameVersion = $latestFile['gameVersion'] ?? '';
                        $modLoaderName = $this->getModLoaderName($latestFile['modLoader'] ?? 0);
                    }
                }
                
                return [
                    'id' => $modpack['id'],
                    'name' => $modpack['name'],
                    'summary' => $modpack['summary'],
                    'author' => $modpack['authors'][0]['name'] ?? 'Unknown',
                    'thumbnailUrl' => $modpack['logo']['thumbnailUrl'] ?? '',
                    'downloadCount' => $modpack['downloadCount'],
                    'gameVersion' => $gameVersion,
                    'modLoader' => $modLoaderName,
                    'fileDate' => $fileDate,
                ];
            }, $modpacks);

            $result = [
                'items' => $items,
                'pagination' => [
                    'total' => $pagination['totalCount'],
                    'count' => count($items),
                    'perPage' => $perPage,
                    'currentPage' => $page,
                    'totalPages' => ceil($pagination['totalCount'] / $perPage),
                ],
            ];
            
            
            Cache::put($cacheKey, $result, 300);
            
            return $result;
        } catch (GuzzleException $e) {
            Log::error('Failed to search CurseForge modpacks: ' . $e->getMessage());
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
     * @param int $modId
     * @return array
     */
    public function getModpackFiles(int $modId): array
    {
        try {
            $response = $this->client->get("mods/{$modId}/files", [
                'query' => [
                    'pageSize' => 50,
                    'index' => 0,
                    'sortField' => 2, 
                    'sortOrder' => 'desc',
                ],
            ]);
            
            $responseData = json_decode($response->getBody()->getContents(), true);
            $files = $responseData['data'] ?? [];

            $items = array_map(function ($file) {
                return [
                    'id' => $file['id'],
                    'displayName' => $file['displayName'],
                    'fileName' => $file['fileName'],
                    'downloadUrl' => $file['downloadUrl'],
                ];
            }, $files);

            return [
                'items' => $items,
            ];
        } catch (GuzzleException $e) {
            Log::error('Failed to get CurseForge modpack files: ' . $e->getMessage());
            return [
                'items' => [],
            ];
        }
    }

    /**
     * Get mod file information for a specific mod.
     *
     * @param int $projectId
     * @param int $fileId
     * @return array
     */
    public function getModFileInfo(int $projectId, int $fileId): array
    {
        try {
            $response = $this->client->get("mods/{$projectId}/files/{$fileId}");
            $responseData = json_decode($response->getBody()->getContents(), true);
            
            if (!isset($responseData['data'])) {
                Log::warning('Failed to get mod file info: Invalid response format', [
                    'projectId' => $projectId,
                    'fileId' => $fileId,
                ]);
                return ['error' => 'Invalid response format'];
            }
            
            $fileData = $responseData['data'];
            
            return [
                'fileName' => $fileData['fileName'] ?? null,
                'displayName' => $fileData['displayName'] ?? null,
                'downloadUrl' => $fileData['downloadUrl'] ?? null,
                'fileDate' => $fileData['fileDate'] ?? null,
                'fileLength' => $fileData['fileLength'] ?? null,
                'projectId' => $projectId,
                'fileId' => $fileId,
            ];
        } catch (GuzzleException $e) {
            Log::warning('Failed to get mod file directly: ' . $e->getMessage(), [
                'projectId' => $projectId,
                'fileId' => $fileId,
            ]);
            
            return ['error' => 'Could not find mod with ID ' . $projectId . ' and file ID ' . $fileId];
        }
    }

    /**
     * Get modpack file information.
     *
     * @param int $modId
     * @param int|null $fileId
     * @return array
     */
    public function getModpackFileInfo(int $modId, ?int $fileId = null): array
    {
        try {
            $response = null;
            
            
            if ($modId !== $fileId) {
                try {
                    
                    $response = $this->client->get("mods/{$modId}/files/{$fileId}");
                } catch (GuzzleException $e) {
                    Log::warning("Failed to get file with provided modId: " . $e->getMessage());
                    
                }
            }
            
            
            if (!$response) {
                try {
                    $response = $this->client->get("mods/files/{$fileId}");
                    $responseData = json_decode($response->getBody()->getContents(), true);
                    $file = $responseData['data'] ?? null;
                    
                    if (!$file) {
                        throw new \Exception("File not found");
                    }
                    
                    
                    $modId = $file['modId'] ?? null;
                    
                    if (!$modId) {
                        throw new \Exception("Could not determine modpack ID");
                    }
                    
                    
                    $response = $this->client->get("mods/{$modId}/files/{$fileId}");
                } catch (\Exception $e) {
                    Log::warning("Failed to get file directly, trying to search for it: " . $e->getMessage());
                    
                    
                    $searchResponse = $this->client->get("mods/search", [
                        'query' => [
                            'gameId' => 432,
                            'classId' => 4471,
                            'searchFilter' => $fileId,
                            'pageSize' => 1
                        ]
                    ]);
                    
                    $searchData = json_decode($searchResponse->getBody()->getContents(), true);
                    $modpacks = $searchData['data'] ?? [];
                    
                    if (empty($modpacks)) {
                        throw new \Exception("Could not find modpack with ID {$fileId}");
                    }
                    
                    
                    $modId = $modpacks[0]['id'] ?? null;
                    
                    if (!$modId) {
                        throw new \Exception("Could not determine modpack ID");
                    }
                    
                    
                    $response = $this->client->get("mods/{$modId}/files/{$fileId}");
                }
            }
            
            
            $responseData = json_decode($response->getBody()->getContents(), true);
            $file = $responseData['data'] ?? null;

            if (!$file) {
                return ['error' => 'File not found'];
            }
            
            return [
                'id' => $file['id'],
                'displayName' => $file['displayName'],
                'fileName' => $file['fileName'],
                'downloadUrl' => $file['downloadUrl'],
            ];
        } catch (GuzzleException $e) {
            Log::error('Failed to get CurseForge modpack file: ' . $e->getMessage());
            return ['error' => $e->getMessage()];
        }
    }

    /**
     * Install a modpack on a server.
     *
     * @param Server $server
     * @param int $modId
     * @param int $fileId
     * @param bool $deleteFiles
     * @return bool
     */
    public function installModpack(Server $server, int $modId, int $fileId, bool $deleteFiles = false): bool
    {
        try {
            $fileInfo = $this->getModpackFileInfo($modId, $fileId);
            
            if (isset($fileInfo['error'])) {
                Log::error('Failed to get modpack file for installation', [
                    'modId' => $modId,
                    'fileId' => $fileId,
                    'error' => $fileInfo['error'],
                ]);
                return false;
            }
            
            
            $server->update(['status' => 'installing']);
            
            
            ModpackInstallationJob::dispatch(
                $server,
                [
                    'modpackId' => $modId,
                    'fileId' => $fileId,
                    'downloadUrl' => $fileInfo['downloadUrl'],
                    'fileName' => $fileInfo['fileName'],
                ],
                $deleteFiles
            );
            
            return true;
        } catch (\Exception $e) {
            Log::error('Failed to install modpack', [
                'modId' => $modId,
                'fileId' => $fileId,
                'error' => $e->getMessage(),
            ]);
            
            
            $server->update(['status' => null]);
            
            return false;
        }
    }

    /**
     * Get mod loader type ID from name.
     *
     * @param string $modLoader
     * @return int
     */
    private function getModLoaderTypeId(string $modLoader): int
    {
        $modLoader = strtolower($modLoader);
        
        switch ($modLoader) {
            case 'forge':
                return 1;
            case 'fabric':
                return 4;
            case 'quilt':
                return 5;
            case 'neoforge':
                return 6;
            default:
                return 0; 
        }
    }

    /**
     * Get mod loader name from type ID.
     *
     * @param int $modLoaderType
     * @return string
     */
    private function getModLoaderName(int $modLoaderType): string
    {
        switch ($modLoaderType) {
            case 1:
                return 'Forge';
            case 2:
                return 'Cauldron';
            case 3:
                return 'LiteLoader';
            case 4:
                return 'Fabric';
            case 5:
                return 'Quilt';
            case 6:
                return 'NeoForge';
            default:
                return 'Forge'; 
        }
    }
}
