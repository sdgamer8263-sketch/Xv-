<?php

namespace Pterodactyl\BlueprintFramework\Extensions\versionchanger;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Pterodactyl\Models\Server;
use Illuminate\Support\Facades\Http;
use Pterodactyl\Facades\Activity;
use Pterodactyl\Http\Controllers\Api\Client\ClientApiController;
use Pterodactyl\Repositories\Eloquent\ServerVariableRepository;
use Pterodactyl\Repositories\Wings\DaemonFileRepository;
use Pterodactyl\Repositories\Wings\DaemonPowerRepository;

class VersionChangerController extends ClientApiController
{
    public function __construct(
        private ServerVariableRepository $variableRepository,
        private DaemonFileRepository $fileRepository,
        private DaemonPowerRepository $powerRepository,
        private string $fields = 'id,type,projectVersionId,versionId,buildNumber,experimental,created'
    ) {
        parent::__construct();
    }

    private function pickAndSortArrayKeys(array $array, array $keys): array
    {
        $keys = array_filter($keys);
        if (empty($keys)) {
            return $array;
        }

        $result = [];

        foreach ($keys as $key) {
            $key = trim($key);
            if (array_key_exists($key, $array)) {
                $result[$key] = $array[$key];
            }
        }

        return $result;
    }

    public function installed(VersionChangerGetRequest $request, Server $server): array
    {
        try {
            $res = $this->powerRepository->setServer($server)->getHttpClient()->get(
                sprintf('/api/servers/%s/version', $server->uuid)
            );

            $data = json_decode($res->getBody()->getContents(), true);
            $hash = $data['hash'] ?? null;

            if ($hash === null) {
                return [
                    'success' => true,
                    'build' => null,
                    'latest' => null,
                ];
            }

            $url = env('MCVAPI_URL', 'https://versions.mcjars.app');
            $name = config('app.name', 'Pterodactyl');

            $req = Http::withUserAgent("Version Changer by 0x7d8 @ $name")
                ->timeout(5)
                ->retry(2, 100, throw: false)
                ->withHeaders([
                    'Authorization' => env('MCVAPI_KEY'),
                    'Origin' => env('APP_URL'),
                ])
                ->post("$url/api/v2/build?fields=$this->fields", [
                    'hash' => [
                        'sha256' => $hash,
                    ],
                ]);

            if (!$req->ok()) {
                return [
                    'success' => true,
                    'build' => null,
                    'latest' => null,
                ];
            }

            $data_api = json_decode($req->body(), true);

            return [
                'success' => true,
                'build' => $data_api['build'],
                'latest' => $data_api['latest'],
            ];
        } catch (\Throwable $e) {
            return [
                'success' => true,
                'build' => null,
                'latest' => null,
            ];
        }
    }

    public function install(VersionChangerInstallRequest $request, Server $server): array
    {
        $url = env('MCVAPI_URL', 'https://versions.mcjars.app');
        $name = config('app.name', 'Pterodactyl');

        $data = $request->validated();
        $req = Http::withUserAgent("Version Changer by 0x7d8 @ $name")
            ->timeout(5)
            ->retry(2, 100, throw: false)
            ->withHeaders([
                'Authorization' => env('MCVAPI_KEY'),
                'Origin' => env('APP_URL'),
            ])
            ->post("$url/api/v2/build?fields=$this->fields,installation", [
                'id' => $data['build'],
            ]);

        if (!$req->ok()) {
            return [
                'success' => false,
            ];
        }

        $data_api = json_decode($req->body(), true);

        $this->powerRepository->setServer($server)->send('kill');

        if ($data['delete_files']) {
            $files = $this->fileRepository->setServer($server)->getDirectory('/');

            if (count($files) > 0) {
                $this->fileRepository->setServer($server)->deleteFiles(
                    '/',
                    collect($files)->map(fn ($file) => $file['name'])->toArray()
                );
            }
        }

        $this->fileRepository->setServer($server)->deleteFiles('/', ['libraries']);

        foreach ($data_api['build']['installation'] as $chunk) {
            foreach ($chunk as $step) {
                switch ($step['type']) {
                    case 'download':
                        $this->fileRepository->setServer($server)->pull($step['url'], '/', [
                            'filename' => $step['file'],
                            'foreground' => true,
                        ]);

                        break;

                    case 'unzip':
                        $this->fileRepository->setServer($server)->decompressFile(
                            $step['location'] === '.' ? '/' : $step['location'], $step['file']
                        );

                        break;

                    case 'remove':
                        $this->fileRepository->setServer($server)->deleteFiles('/', [$step['location']]);

                        break;
                }
            }
        }

        Activity::event('server:version.install')
            ->property('type', $data_api['build']['type'])
            ->property('version', $data_api['build']['versionId'] ?? $data_api['build']['projectVersionId'])
            ->property('build', $data_api['build']['buildNumber'] == 1 ? $data_api['build']['projectVersionId'] ?? $data_api['build']['buildNumber'] : $data_api['build']['buildNumber'])
            ->property('deleteFiles', $data['delete_files'])
            ->log();

        try {
            $variable = $server->variables()->where('env_variable', 'SERVER_JARFILE')->first();
            $this->variableRepository->updateOrCreate([
                'server_id' => $server->id,
                'variable_id' => $variable->id,
            ], [
                'variable_value' => 'server.jar',
            ]);
        } catch (\Throwable $e) {
            // ignore
        }

        $java = $data_api['version']['java'] ?? 21;

        $availableJavaVersions = [];
        foreach ($server->egg->docker_images as $image) {
            $availableJavaVersions[] = (int) preg_replace("/[^0-9]/", '', explode(':', $image)[1]);
        }

        if (in_array($java, $availableJavaVersions)) {
            $server->forceFill([
                'image' => array_values($server->egg->docker_images)[array_search($java, $availableJavaVersions)],
            ])->save();
        }

        return [
            'success' => true,
        ];
    }

    public function types(VersionChangerGetRequest $request): array
    {
        $url = env('MCVAPI_URL', 'https://versions.mcjars.app');
        $name = config('app.name', 'Pterodactyl');

        $data = Cache::remember('minecraftVersionTypes', 300, function () use ($url, $name) {
            if (env('MCVAPI_KEY') === null) {
                $req = Http::withUserAgent("Version Changer by 0x7d8 @ $name")
                ->timeout(5)
                ->retry(2, 100, throw: false)
                ->get("$url/api/v1/types");
            } else {
                $req = Http::withUserAgent("Version Changer by 0x7d8 @ $name")
                ->timeout(5)
                ->retry(2, 100, throw: false)
                ->withHeaders([
                    'Authorization' => env('MCVAPI_KEY'),
                    'Origin' => env('APP_URL'),
                ])
                ->get("$url/api/organization/v1/types");
            }

            if (!$req->ok()) {
                return [
                    'success' => false,
                ];
            }

            return json_decode($req->body(), true);
        });

        return [
            'success' => true,
            'types' => $this->pickAndSortArrayKeys($data['types'], explode(',', DB::table('settings')->where('key', '=', 'settings::mcvapi:types')->first()?->value ?? '')),
        ];
    }

    public function versions(VersionChangerGetRequest $request, Server $server): array
    {
        $url = env('MCVAPI_URL', 'https://versions.mcjars.app');
        $name = config('app.name', 'Pterodactyl');
        $type = strtoupper($request->route('type'));

        $data = Cache::remember("minecraftVersionTypeVersions-{$type}", 120, function () use ($type, $url, $name) {
            $req = Http::withUserAgent("Version Changer by 0x7d8 @ $name")
                ->timeout(5)
                ->retry(2, 100, throw: false)
                ->withHeaders([
                    'Authorization' => env('MCVAPI_KEY', ''),
                    'Origin' => env('APP_URL'),
                ])
                ->get("$url/api/v2/builds/{$type}?fields=$this->fields");

            if (!$req->ok()) {
                return [
                    'success' => false,
                ];
            }

            return json_decode($req->body(), true);
        });

        return $data;
    }

    public function builds(VersionChangerGetRequest $request, Server $server): array
    {
        $url = env('MCVAPI_URL', 'https://versions.mcjars.app');
        $name = config('app.name', 'Pterodactyl');
        $type = strtoupper($request->route('type'));
        $version = $request->route('_version');

        $data = Cache::remember("minecraftVersionTypeBuilds-{$type}-{$version}", 120, function () use ($type, $version, $url, $name) {
            $req = Http::withUserAgent("Version Changer by 0x7d8 @ $name")
                ->timeout(5)
                ->retry(2, 100, throw: false)
                ->withHeaders([
                    'Authorization' => env('MCVAPI_KEY', ''),
                    'Origin' => env('APP_URL'),
                ])
                ->get("$url/api/v2/builds/{$type}/{$version}?fields=$this->fields");

            if (!$req->ok()) {
                return [
                    'success' => false,
                ];
            }

            return json_decode($req->body(), true);
        });

        return $data;
    }
}
