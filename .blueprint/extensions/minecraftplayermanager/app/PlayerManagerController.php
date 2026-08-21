<?php

namespace Pterodactyl\BlueprintFramework\Extensions\minecraftplayermanager;

use Illuminate\Support\Facades\Cache;
use Pterodactyl\Models\Server;
use Illuminate\Support\Facades\Http;
use Pterodactyl\Facades\Activity;
use Pterodactyl\Http\Controllers\Api\Client\ClientApiController;
use Pterodactyl\Repositories\Wings\DaemonCommandRepository;
use Pterodactyl\Repositories\Wings\DaemonFileRepository;
use Illuminate\Http\JsonResponse;
use Pterodactyl\BlueprintFramework\Extensions\minecraftplayermanager\Status\MinecraftPing;
use Pterodactyl\BlueprintFramework\Extensions\minecraftplayermanager\Status\MinecraftQuery;

class PlayerManagerController extends ClientApiController
{
    public function __construct(
        private DaemonFileRepository $fileRepository,
        private DaemonCommandRepository $commandRepository
    ) {
        parent::__construct();
    }

    private function queryApi(Server $server): array
    {
        return Cache::remember("minecraftserver:query:{$server->id}", 10, function () use ($server) {
            try {
                if ($this->isQueryEnabled($server)) {
                    $query = new MinecraftQuery();
                    $query->Connect($server->allocation->alias ?? $server->allocation->ip, $server->allocation->port, 2, false);
                    
                    $data = $query->GetInfo();

                    if (!$data) throw new \Exception('Failed to query server');

                    $players = [];
                    $rawPlayers = $query->GetPlayers();
                    if ($rawPlayers) foreach ($rawPlayers as $player) {
                        $userData = $this->lookupUserName($player, $server);

                        if ($userData) {
                            $uuid = $userData['uuid'];
                        }

                        if (!$uuid) {
                            continue;
                        }

                        $players[] = [
                            'id' => $uuid,
                            'name' => $player,
                        ];
                    }

                    return [
                        'players' => [
                            'online' => $data['Players'],
                            'max' => $data['MaxPlayers'],
                            'list' => $players,
                        ],
                    ];
                } else {
                    throw new \Exception();
                }
            } catch (\Throwable $e) {
                $query = new MinecraftPing($server->allocation->alias ?? $server->allocation->ip, $server->allocation->port, 2, false);
                $query->Connect();

                $data = $query->Query();

                if (!$data) throw new \Exception('Failed to query server');

                return [
                    'players' => [
                        'online' => $data['players']['online'],
                        'max' => $data['players']['max'],
                        'list' => $data['players']['sample'] ?? [],
                    ],
                ];
            }
        });
    }

    private function userCache(Server $server): array
    {
        return Cache::remember("minecraftserver:username-cache:{$server->id}", 30, function () use ($server) {
            try {
                $cache = $this->fileRepository->setServer($server)->getContent('/usercache.json');
                $data = json_decode($cache, true);

                return $data;
            } catch (\Throwable $e) {
                return [];
            }
        });
    }

    private function formatUuid(string $uuid): string
    {
        $uuid = str_replace('-', '', $uuid);

        return substr($uuid, 0, 8) . '-' . substr($uuid, 8, 4) . '-' . substr($uuid, 12, 4) . '-' . substr($uuid, 16, 4) . '-' . substr($uuid, 20);
    }

    private function lookupUser(string $uuid, Server $server): array|null
    {
        $name = config('app.name', 'Pterodactyl');
        $uuid = str_replace('-', '', $uuid);
        $cache = $this->userCache($server);

        foreach ($cache as $player) {
            if ($player['uuid'] === $this->formatUuid($uuid)) {
                return [
                    'uuid' => $this->formatUuid($player['uuid']),
                    'name' => $player['name'],
                ];
            }
        }

        if (str_starts_with($uuid, '0000000000000000')) {
            $data = Cache::remember("minecraftplayer:floodgate:$uuid", 1000, function () use ($server, $name, $uuid) {
                $xuidHex = substr($uuid, 19);
                $xuid = base_convert($xuidHex, 16, 10);

                try {
                    $req = Http::withUserAgent("Player Manager by 0x7d8 @ $name")
                        ->timeout(5)
                        ->retry(2, 100, throw: true)
                        ->get("https://api.geysermc.org/v2/xbox/gamertag/$xuid");

                    $user = json_decode($req->getBody()->getContents(), true);

                    $floodgatePrefix = $this->getFloodgatePrefix($server);

                    $cache[] = [
                        'uuid' => $this->formatUuid($uuid),
                        'name' => $floodgatePrefix . $user['gamertag'],
                    ];

                    $this->fileRepository->setServer($server)->putContent('/usercache.json', json_encode($cache));
                    Cache::put("minecraftserver:username-cache:{$server->id}", $cache, 30);

                    return [
                        'uuid' => $this->formatUuid($uuid),
                        'name' => $floodgatePrefix . $user['gamertag'],
                    ];
                } catch (\Throwable $e) {
                    return null;
                }
            });

            if (!is_null($data)) {
                return $data;
            }
        }

        $data = Cache::remember("minecraftplayer:$uuid", 1000, function () use ($server, $name, $uuid) {
            try {
                $req = Http::withUserAgent("Player Manager by 0x7d8 @ $name")
                    ->timeout(5)
                    ->retry(2, 100, throw: true)
                    ->get("https://sessionserver.mojang.com/session/minecraft/profile/$uuid");

                $user = json_decode($req->getBody()->getContents(), true);

                $cache[] = [
                    'uuid' => $user['id'],
                    'name' => $user['name'],
                ];

                $this->fileRepository->setServer($server)->putContent('/usercache.json', json_encode($cache));
                Cache::put("minecraftserver:username-cache:{$server->id}", $cache, 30);

                return $user;
            } catch (\Throwable $e) {
                return null;
            }
        });

        if (is_null($data)) {
            return null;
        }

        return [
            'uuid' => $this->formatUuid($data['id']),
            'name' => $data['name'],
        ];
    }

    private function lookupUserName(string $name, Server $server): array|null
    {
        $app = config('app.name', 'Pterodactyl');
        $offline = $this->isOfflineMode($server);
        $cache = $this->userCache($server);
        $floodgatePrefix = $this->getFloodgatePrefix($server);

        foreach ($cache as $player) {
            if ($player['name'] === $name) {
                return [
                    'uuid' => $this->formatUuid($player['uuid']),
                    'name' => $player['name'],
                ];
            }
        }

        if ($floodgatePrefix && str_starts_with($name, $floodgatePrefix)) {
            $data = Cache::remember("minecraftplayer:floodgate:$name", 1000, function () use ($server, $app, $name, $floodgatePrefix) {
                $name = urlencode($name);
                $floodgatePrefix = urlencode($floodgatePrefix);

                try {
                    $req = Http::withUserAgent("Player Manager by 0x7d8 @ $app")
                        ->timeout(5)
                        ->retry(2, 100, throw: true)
                        ->get("https://api.geysermc.org/v2/utils/uuid/bedrock_or_java/$name?prefix=$floodgatePrefix");

                    $user = json_decode($req->getBody()->getContents(), true);

                    $cache[] = [
                        'uuid' => $this->formatUuid($user['uuid']),
                        'name' => $user['name'],
                    ];

                    $this->fileRepository->setServer($server)->putContent('/usercache.json', json_encode($cache));
                    Cache::put("minecraftserver:username-cache:{$server->id}", $cache, 30);

                    return [
                        'uuid' => $this->formatUuid($user['uuid']),
                        'name' => $user['name'],
                    ];
                } catch (\Throwable $e) {
                    return null;
                }
            });
        }

        if ($offline) {
            $uuid = $this->formatUuid(md5("OfflinePlayer:$name"));

            $cache[] = [
                'uuid' => $uuid,
                'name' => $name,
            ];

            $this->fileRepository->setServer($server)->putContent('/usercache.json', json_encode($cache));
            Cache::put("minecraftserver:username-cache:{$server->id}", $cache, 30);

            return [
                'uuid' => $uuid,
                'name' => $name,
            ];
        }

        $data = Cache::remember("minecraftplayer:$name", 1000, function () use ($server, $app, $name) {
            try {
                $req = Http::withUserAgent("Player Manager by 0x7d8 @ $app")
                    ->timeout(5)
                    ->retry(2, 100, throw: true)
                    ->get("https://api.mojang.com/users/profiles/minecraft/$name");

                $user = json_decode($req->getBody()->getContents(), true);

                $cache[] = [
                    'uuid' => $user['id'],
                    'name' => $user['name'],
                ];

                $this->fileRepository->setServer($server)->putContent('/usercache.json', json_encode($cache));
                Cache::put("minecraftserver:username-cache:{$server->id}", $cache, 30);

                return $user;
            } catch (\Throwable $e) {
                return null;
            }
        });

        if (is_null($data)) {
            return null;
        }

        return [
            'uuid' => $this->formatUuid($data['id']),
            'name' => $data['name'],
        ];
    }

    private function sortList(array $list): array
    {
        usort($list, function ($a, $b) {
            return strcasecmp($a['name'] ?? $a['ip'], $b['name'] ?? $b['ip']);
        });

        return $list;
    }

    private function getServerProperties(Server $server): array
    {
        return Cache::remember("minecraftserver:properties:{$server->id}", 10, function () use ($server) {
            try {
                $properties = $this->fileRepository->setServer($server)->getContent('/server.properties');
                $data = explode("\n", $properties);

                $result = [];
                foreach ($data as $line) {
                    if (str_starts_with($line, '#')) {
                        continue;
                    }

                    $parts = explode('=', $line, 2);
                    $result[$parts[0]] = $parts[1] ?? '';
                }

                return $result;
            } catch (\Throwable $e) {
                return [];
            }
        });
    }

    private function getFloodgatePrefix(Server $server): string|null {
        return Cache::remember("minecraftserver:floodgate:{$server->id}", 30, function () use ($server) {
            try {
                $floodgate = $this->fileRepository->setServer($server)->getContent('/plugins/floodgate/config.yml');

                if (preg_match('/username-prefix: "(.+)"/', $floodgate, $matches)) {
                    return $matches[1];
                }

                if (preg_match('/username-prefix: (.+)/', $floodgate, $matches)) {
                    return $matches[1];
                }

                return null;
            } catch (\Throwable $e) {
                return null;
            }
        });
    }

    private function isQueryEnabled(Server $server): bool
    {
        $properties = $this->getServerProperties($server);

        if (array_key_exists('enable-query', $properties) && $properties['enable-query'] === 'true') {
            return true;
        }

        return Cache::remember("minecraftserver:query:enabled:{$server->id}", 30, function () use ($server) {
            try {
                $velocityToml = $this->fileRepository->setServer($server)->getContent('/velocity.toml');
                $lines = explode("\n", $velocityToml);

                $lastKey = null;
                foreach ($lines as $line) {
                    if (str_starts_with($line, '[') && str_ends_with($line, ']')) {
                        $lastKey = substr($line, 1, -1);
                    }

                    if ($lastKey === 'query') {
                        if (str_contains($line, 'enabled = true')) {
                            return true;
                        }
                    }
                }

                return false;
            } catch (\Throwable $e) {
                // ignore
            }

            try {
                $configYml = $this->fileRepository->setServer($server)->getContent('/config.yml');

                if (str_contains('query_enabled: true', $configYml)) {
                    return true;
                }
            } catch (\Throwable $e) {
                // ignore
            }

            return false;
        });
    }

    private function isOfflineMode(Server $server): bool
    {
        $properties = $this->getServerProperties($server);

        if (array_key_exists('online-mode', $properties) && $properties['online-mode'] === 'false' && !$this->isProxied($server)) {
            return true;
        }

        if ($this->isProxied($server)) {
            return Cache::remember("minecraftserver:offline:{$server->id}", 30, function () use ($server) {
                try {
                    try {
                        $paperYml = $this->fileRepository->setServer($server)->getContent('/paper.yml');
                    } catch (\Throwable $e) {
                        $paperYml = $this->fileRepository->setServer($server)->getContent('/config/paper-global.yml');
                    }

                    if (str_contains("velocity:\n    enabled: true\n    online-mode: false", $paperYml)) {
                        return true;
                    }

                    if (str_contains("bungee-online-mode: false", $paperYml)) {
                        return true;
                    }

                    if (str_contains("velocity-support:\n    enabled: true\n    online-mode: false", $paperYml)) {
                        return true;
                    }

                    return false;
                } catch (\Throwable $e) {
                    return false;
                }
            });
        }

        return Cache::remember("minecraftserver:offline:{$server->id}", 30, function () use ($server) {
            try {
                $velocityToml = $this->fileRepository->setServer($server)->getContent('/velocity.toml');

                if (str_contains('online-mode = false', $velocityToml)) {
                    return true;
                }

                return false;
            } catch (\Throwable $e) {
                // ignore
            }

            try {
                $bungeeYml = $this->fileRepository->setServer($server)->getContent('/bungee.yml');

                if (str_contains('online_mode: false', $bungeeYml)) {
                    return true;
                }

                return false;
            } catch (\Throwable $e) {
                // ignore
            }

            return false;
        });
    }

    private function isProxied(Server $server): bool
    {
        return Cache::remember("minecraftserver:proxied:{$server->id}", 30, function () use ($server) {
            try {
                $spigotYml = $this->fileRepository->setServer($server)->getContent('/spigot.yml');

                if (str_contains('bungeecord: true', $spigotYml)) {
                    return true;
                }

                try {
                    $paperYml = $this->fileRepository->setServer($server)->getContent('/paper.yml');
                } catch (\Throwable $e) {
                    $paperYml = $this->fileRepository->setServer($server)->getContent('/config/paper-global.yml');
                }

                if (str_contains("velocity:\n    enabled: true", $paperYml)) {
                    return true;
                }

                if (str_contains("bungee-cord:\n    enabled: true", $paperYml)) {
                    return true;
                }

                if (str_contains("velocity-support:\n    enabled: true", $paperYml)) {
                    return true;
                }

                return false;
            } catch (\Throwable $e) {
                return false;
            }
        });
    }

    private function isBukkitBased(Server $server): bool
    {
        return Cache::remember("minecraftserver:bukkit:{$server->id}", 30, function () use ($server) {
            try {
                $bukkitYml = $this->fileRepository->setServer($server)->getContent('/bukkit.yml');

                return !!$bukkitYml;
            } catch (\Throwable $e) {
                return false;
            }
        });
    }

    public function index(PlayerManagerGetRequest $request, Server $server): array
    {
        $properties = $this->getServerProperties($server);

        $onlineMode = false;
        $opped = [];
        $whitelisted = [];
        $whitelistEnabled = array_key_exists('white-list', $properties) && $properties['white-list'] === 'true';
        $banned = [];
        $bannedIps = [];

        try {
            $ops = $this->fileRepository->setServer($server)->getContent('/ops.json');
            $data = json_decode($ops, true);

            foreach ($data as $op) {
                $uuid = str_replace('-', '', $op['uuid']);

                $opped[] = [
                    'uuid' => $op['uuid'],
                    'name' => $op['name'],
                    'level' => $op['level'],
                    'bypassesPlayerLimit' => $op['bypassesPlayerLimit'],
                    'avatar' => "https://minotar.net/helm/$uuid/256.png",
                    'render' => "https://render.skinmc.net/3d.php?user=$uuid&vr=-20&hr=30&hrh=0&vrll=-20&vrrl=10&vrla=10&vrra=-10&ratio=20",
                ];
            }
        } catch (\Throwable $e) {
            // ignore
        }

        try {
            $whitelist = $this->fileRepository->setServer($server)->getContent('/whitelist.json');
            $data = json_decode($whitelist, true);

            foreach ($data as $whitelist) {
                $uuid = str_replace('-', '', $whitelist['uuid']);

                $whitelisted[] = [
                    'uuid' => $whitelist['uuid'],
                    'name' => $whitelist['name'],
                    'avatar' => "https://minotar.net/helm/$uuid/256.png",
                    'render' => "https://render.skinmc.net/3d.php?user=$uuid&vr=-20&hr=30&hrh=0&vrll=-20&vrrl=10&vrla=10&vrra=-10&ratio=20",
                ];
            }
        } catch (\Throwable $e) {
            // ignore
        }

        try {
            $bans = $this->fileRepository->setServer($server)->getContent('/banned-players.json');
            $data = json_decode($bans, true);

            foreach ($data as $ban) {
                $uuid = str_replace('-', '', $ban['uuid']);

                $banned[] = [
                    'uuid' => $ban['uuid'],
                    'name' => $ban['name'],
                    'reason' => $ban['reason'],
                    'avatar' => "https://minotar.net/helm/$uuid/256.png",
                    'render' => "https://render.skinmc.net/3d.php?user=$uuid&vr=-20&hr=30&hrh=0&vrll=-20&vrrl=10&vrla=10&vrra=-10&ratio=20",
                ];
            }
        } catch (\Throwable $e) {
            // ignore
        }

        try {
            $bans = $this->fileRepository->setServer($server)->getContent('/banned-ips.json');
            $data = json_decode($bans, true);

            foreach ($data as $ban) {
                $bannedIps[] = [
                    'ip' => $ban['ip'],
                    'reason' => $ban['reason'],
                ];
            }
        } catch (\Throwable $e) {
            // ignore
        }

        try {
            $data = $this->queryApi($server);

            $players = [];
            foreach ($data['players']['list'] ?? [] as $player) {
                $uuid = str_replace('-', '', $player['id']);

                $players[] = [
                    'uuid' => $player['id'],
                    'name' => $player['name'],
                    'avatar' => "https://minotar.net/helm/$uuid/256.png",
                    'render' => "https://render.skinmc.net/3d.php?user=$uuid&vr=-20&hr=30&hrh=0&vrll=-20&vrrl=10&vrla=10&vrra=-10&ratio=20",
                ];
            }

            return [
                'success' => true,
                'online' => true,
                'online_mode' => $onlineMode,
                'opped' => $this->sortList($opped),
                'banned' => [
                    'players' => $this->sortList($banned),
                    'ips' => $this->sortList($bannedIps),
                ], 'whitelist' => [
                    'enabled' => $whitelistEnabled,
                    'list' => $this->sortList($whitelisted),
                ], 'players' => [
                    'online' => $data['players']['online'],
                    'max' => $data['players']['max'],
                    'list' => $this->sortList($players),
                ],
            ];
        } catch (\Throwable $e) {
            return [
                'success' => true,
                'online' => false,
                'online_mode' => $onlineMode,
                'opped' => $this->sortList($opped),
                'banned' => [
                    'players' => $this->sortList($banned),
                    'ips' => $this->sortList($bannedIps),
                ], 'whitelist' => [
                    'enabled' => $whitelistEnabled,
                    'list' => $this->sortList($whitelisted),
                ],
            ];
        }
    }

    public function op(PlayerManagerPlayerNamedRequest $request, Server $server): JsonResponse
    {
        try {
            $ops = $this->fileRepository->setServer($server)->getContent('/ops.json');
            $data = json_decode($ops, true);
        } catch (\Throwable $e) {
            $data = [];
        }

        $name = $request->input('name');

        foreach ($data as $op) {
            if ($op['name'] === $name) {
                return new JsonResponse([
                    'success' => false,
                    'error' => 'Player is already an operator',
                ], 400);
            }
        }

        $player = $this->lookupUserName($name, $server);

        if (is_null($player)) {
            return new JsonResponse([
                'success' => false,
                'error' => 'Failed to lookup player',
            ], 400);
        }

        $data[] = [
            'uuid' => $player['uuid'],
            'name' => $player['name'],
            'level' => 4,
            'bypassesPlayerLimit' => true,
        ];

        $this->fileRepository->setServer($server)->putContent('/ops.json', json_encode($data, JSON_PRETTY_PRINT));
        sleep(0.5); // wait for the file to be written (not the best solution but it works for now)

        try {
            if ($this->isBukkitBased($server)) {
                $this->commandRepository->setServer($server)->send("minecraft:op {$player['name']}");
            } else {
                $this->commandRepository->setServer($server)->send("op {$player['name']}");
            }
        } catch (\Throwable $e) {
            // ignore
        }

        Activity::event('server:player.op')
            ->property([
                'uuid' => $player['uuid'],
                'name' => $player['name'],
            ])
            ->log();

        return new JsonResponse([
            'success' => true
        ]);
    }

    public function deop(PlayerManagerPlayerRequest $request, Server $server): JsonResponse
    {
        try {
            $ops = $this->fileRepository->setServer($server)->getContent('/ops.json');
            $data = json_decode($ops, true);
        } catch (\Throwable $e) {
            $data = [];
        }

        $uuid = $request->input('uuid');

        $isOp = false;
        foreach ($data as $op) {
            if ($op['uuid'] === $uuid) {
                $isOp = true;
                break;
            }
        }

        if (!$isOp) {
            return new JsonResponse([
                'success' => false,
                'error' => 'Player is not an operator',
            ], 400);
        }

        $player = $this->lookupUser($uuid, $server);

        if (is_null($player)) {
            return new JsonResponse([
                'success' => false,
                'error' => 'Failed to lookup player',
            ], 400);
        }

        $data = array_filter($data, function ($op) use ($player) {
            return $op['uuid'] !== $player['uuid'];
        });

        $this->fileRepository->setServer($server)->putContent('/ops.json', json_encode($data, JSON_PRETTY_PRINT));
        sleep(0.5); // wait for the file to be written (not the best solution but it works for now)

        try {
            if ($this->isBukkitBased($server)) {
                $this->commandRepository->setServer($server)->send("minecraft:deop {$player['name']}");
            } else {
                $this->commandRepository->setServer($server)->send("deop {$player['name']}");
            }
        } catch (\Throwable $e) {
            // ignore
        }

        Activity::event('server:player.deop')
            ->property([
                'uuid' => $player['uuid'],
                'name' => $player['name'],
            ])
            ->log();

        return new JsonResponse([
            'success' => true
        ]);
    }

    public function setwhitelist(PlayerManagerSetWhitelistRequest $request, Server $server): array
    {
        try {
            $properties = $this->fileRepository->setServer($server)->getContent('/server.properties');
            $data = explode("\n", $properties);
        } catch (\Throwable $e) {
            $data = [];
        }

        $whitelist = $request->input('enabled');

        $data = array_map(function ($line) use ($whitelist) {
            if (str_starts_with($line, 'white-list=')) {
                return 'white-list=' . ($whitelist ? 'true' : 'false');
            }

            return $line;
        }, $data);

        if (!in_array('white-list=false', $data) && !in_array('white-list=true', $data)) {
            $data[] = 'white-list=' . ($whitelist ? 'true' : 'false');
        }

        Cache::forget("minecraftserver:properties:{$server->id}");
        $this->fileRepository->setServer($server)->putContent('/server.properties', implode("\n", $data));
        sleep(0.5); // wait for the file to be written (not the best solution but it works for now)

        try {
            if ($this->isBukkitBased($server)) {
                $this->commandRepository->setServer($server)->send('minecraft:whitelist ' . ($whitelist ? 'on' : 'off'));
            } else {
                $this->commandRepository->setServer($server)->send('whitelist ' . ($whitelist ? 'on' : 'off'));
            }
        } catch (\Throwable $e) {
            // ignore
        }

        Activity::event('server:whitelist.set')
            ->property([
                'enabled' => $whitelist,
            ])
            ->log();

        return [
            'success' => true
        ];
    }

    public function addwhitelist(PlayerManagerPlayerNamedRequest $request, Server $server): JsonResponse
    {
        try {
            $whitelist = $this->fileRepository->setServer($server)->getContent('/whitelist.json');
            $data = json_decode($whitelist, true);
        } catch (\Throwable $e) {
            $data = [];
        }

        $name = $request->input('name');

        foreach ($data as $whitelist) {
            if ($whitelist['name'] === $name) {
                return new JsonResponse([
                    'success' => false,
                    'error' => 'Player is already whitelisted',
                ], 400);
            }
        }

        $player = $this->lookupUserName($name, $server);

        if (is_null($player)) {
            return new JsonResponse([
                'success' => false,
                'error' => 'Failed to lookup player',
            ], 400);
        }

        $data[] = [
            'uuid' => $player['uuid'],
            'name' => $player['name'],
        ];

        $this->fileRepository->setServer($server)->putContent('/whitelist.json', json_encode($data, JSON_PRETTY_PRINT));
        sleep(0.5); // wait for the file to be written (not the best solution but it works for now)

        try {
            if ($this->isBukkitBased($server)) {
                $this->commandRepository->setServer($server)->send("minecraft:whitelist add {$player['name']}");
            } else {
                $this->commandRepository->setServer($server)->send("whitelist add {$player['name']}");
            }
        } catch (\Throwable $e) {
            // ignore
        }

        Activity::event('server:whitelist.add')
            ->property([
                'uuid' => $player['uuid'],
                'name' => $player['name'],
            ])
            ->log();

        return new JsonResponse([
            'success' => true
        ]);
    }

    public function removewhitelist(PlayerManagerPlayerRequest $request, Server $server): JsonResponse
    {
        try {
            $whitelist = $this->fileRepository->setServer($server)->getContent('/whitelist.json');
            $data = json_decode($whitelist, true);
        } catch (\Throwable $e) {
            $data = [];
        }

        $uuid = $request->input('uuid');

        $isWhitelisted = false;
        foreach ($data as $whitelist) {
            if ($whitelist['uuid'] === $uuid) {
                $isWhitelisted = true;
                break;
            }
        }

        if (!$isWhitelisted) {
            return new JsonResponse([
                'success' => false,
                'error' => 'Player is not whitelisted',
            ], 400);
        }

        $player = $this->lookupUser($uuid, $server);

        if (is_null($player)) {
            return new JsonResponse([
                'success' => false,
                'error' => 'Failed to lookup player',
            ], 400);
        }

        $data = array_filter($data, function ($whitelist) use ($player) {
            return $whitelist['uuid'] !== $player['uuid'];
        });

        $this->fileRepository->setServer($server)->putContent('/whitelist.json', json_encode($data, JSON_PRETTY_PRINT));
        sleep(0.5); // wait for the file to be written (not the best solution but it works for now)

        try {
            if ($this->isBukkitBased($server)) {
                $this->commandRepository->setServer($server)->send("minecraft:whitelist remove {$player['name']}");
            } else {
                $this->commandRepository->setServer($server)->send("whitelist remove {$player['name']}");
            }
        } catch (\Throwable $e) {
            // ignore
        }

        Activity::event('server:whitelist.remove')
            ->property([
                'uuid' => $player['uuid'],
                'name' => $player['name'],
            ])
            ->log();

        return new JsonResponse([
            'success' => true
        ]);
    }

    public function ban(PlayerManagerBanRequest $request, Server $server): JsonResponse
    {
        try {
            $bans = $this->fileRepository->setServer($server)->getContent('/banned-players.json');
            $data = json_decode($bans, true);
        } catch (\Throwable $e) {
            $data = [];
        }

        $name = $request->input('name');
        $reason = $request->input('reason');

        foreach ($data as $ban) {
            if ($ban['name'] === $name) {
                return new JsonResponse([
                    'success' => false,
                    'error' => 'Player is already banned',
                ], 400);
            }
        }

        $player = $this->lookupUserName($name, $server);

        if (is_null($player)) {
            return new JsonResponse([
                'success' => false,
                'error' => 'Failed to lookup player',
            ], 400);
        }

        $data[] = [
            'uuid' => $player['uuid'],
            'name' => $player['name'],
            'source' => 'Server',
            'created' => time(),
            'expires' => 'forever',
            'reason' => $reason,
        ];

        $this->fileRepository->setServer($server)->putContent('/banned-players.json', json_encode($data, JSON_PRETTY_PRINT));
        sleep(0.5); // wait for the file to be written (not the best solution but it works for now)

        try {
            if ($this->isBukkitBased($server)) {
                $this->commandRepository->setServer($server)->send("minecraft:ban {$player['name']} $reason");
            } else {
                $this->commandRepository->setServer($server)->send("ban {$player['name']} $reason");
            }
        } catch (\Throwable $e) {
            // ignore
        }

        Activity::event('server:player.ban')
            ->property([
                'uuid' => $player['uuid'],
                'name' => $player['name'],
                'reason' => $reason,
            ])
            ->log();

        return new JsonResponse([
            'success' => true
        ]);
    }

    public function unban(PlayerManagerPlayerRequest $request, Server $server): JsonResponse
    {
        try {
            $bans = $this->fileRepository->setServer($server)->getContent('/banned-players.json');
            $data = json_decode($bans, true);
        } catch (\Throwable $e) {
            $data = [];
        }

        $uuid = $request->input('uuid');

        $isBanned = false;
        foreach ($data as $ban) {
            if ($ban['uuid'] === $uuid) {
                $isBanned = true;
                break;
            }
        }

        if (!$isBanned) {
            return new JsonResponse([
                'success' => false,
                'error' => 'Player is not banned',
            ], 400);
        }

        $player = $this->lookupUser($uuid, $server);

        if (is_null($player)) {
            return new JsonResponse([
                'success' => false,
                'error' => 'Failed to lookup player',
            ], 400);
        }

        $data = array_filter($data, function ($ban) use ($player) {
            return $ban['uuid'] !== $player['uuid'];
        });

        $this->fileRepository->setServer($server)->putContent('/banned-players.json', json_encode($data, JSON_PRETTY_PRINT));
        sleep(0.5); // wait for the file to be written (not the best solution but it works for now)

        try {
            if ($this->isBukkitBased($server)) {
                $this->commandRepository->setServer($server)->send("minecraft:pardon {$player['name']}");
            } else {
                $this->commandRepository->setServer($server)->send("pardon {$player['name']}");
            }
        } catch (\Throwable $e) {
            // ignore
        }

        Activity::event('server:player.unban')
            ->property([
                'uuid' => $player['uuid'],
                'name' => $player['name'],
            ])
            ->log();

        return new JsonResponse([
            'success' => true
        ]);
    }

    public function banIp(PlayerManagerBanIpRequest $request, Server $server): JsonResponse
    {
        $ip = $request->input('ip');
        $reason = $request->input('reason');

        try {
            $bans = $this->fileRepository->setServer($server)->getContent('/banned-ips.json');
            $data = json_decode($bans, true);
        } catch (\Throwable $e) {
            $data = [];
        }

        foreach ($data as $ban) {
            if ($ban['ip'] === $ip) {
                return new JsonResponse([
                    'success' => false,
                    'error' => 'IP is already banned',
                ], 400);
            }
        }

        $data[] = [
            'ip' => $ip,
            'source' => 'Server',
            'created' => time(),
            'expires' => 'forever',
            'reason' => $reason,
        ];

        $this->fileRepository->setServer($server)->putContent('/banned-ips.json', json_encode($data, JSON_PRETTY_PRINT));
        sleep(0.5); // wait for the file to be written (not the best solution but it works for now)

        try {
            if ($this->isBukkitBased($server)) {
                $this->commandRepository->setServer($server)->send("minecraft:ban-ip $ip $reason");
            } else {
                $this->commandRepository->setServer($server)->send("ban-ip $ip $reason");
            }
        } catch (\Throwable $e) {
            // ignore
        }

        Activity::event('server:player.ban-ip')
            ->property([
                'ip' => $ip,
                'reason' => $reason,
            ])
            ->log();

        return new JsonResponse([
            'success' => true
        ]);
    }

    public function banIpPlayer(PlayerManagerPlayerRequest $request, Server $server): JsonResponse
    {
        $uuid = $request->input('uuid');
        $reason = $request->input('reason');

        try {
            $data = $this->queryApi($server);

            $name = null;
            foreach ($data['players']['list'] ?? [] as $player) {
                if ($player['id'] === $uuid) {
                    $name = $player['name'];
                    break;
                }
            }

            if (!$name) {
                return new JsonResponse([
                    'success' => false,
                    'error' => 'Player is not online',
                ], 400);
            }

            if ($this->isBukkitBased($server)) {
                $this->commandRepository->setServer($server)->send("minecraft:ban-ip $name $reason");
            } else {
                $this->commandRepository->setServer($server)->send("ban-ip $name $reason");
            }

            Activity::event('server:player.ban-ip-player')
                ->property([
                    'uuid' => $uuid,
                    'name' => $name,
                    'reason' => $reason,
                ])
                ->log();

            return new JsonResponse([
                'success' => true
            ]);
        } catch (\Throwable $e) {
            return new JsonResponse([
                'success' => false,
                'error' => 'Server is offline',
            ], 400);
        }
    }

    public function unbanIp(PlayerManagerIpRequest $request, Server $server): JsonResponse
    {
        $ip = $request->input('ip');

        try {
            $bans = $this->fileRepository->setServer($server)->getContent('/banned-ips.json');
            $data = json_decode($bans, true);
        } catch (\Throwable $e) {
            $data = [];
        }

        $isBanned = false;
        foreach ($data as $ban) {
            if ($ban['ip'] === $ip) {
                $isBanned = true;
                break;
            }
        }

        if (!$isBanned) {
            return new JsonResponse([
                'success' => false,
                'error' => 'IP is not banned',
            ], 400);
        }

        $data = array_filter($data, function ($ban) use ($ip) {
            return $ban['ip'] !== $ip;
        });

        $this->fileRepository->setServer($server)->putContent('/banned-ips.json', json_encode($data, JSON_PRETTY_PRINT));
        sleep(0.5); // wait for the file to be written (not the best solution but it works for now)

        try {
            if ($this->isBukkitBased($server)) {
                $this->commandRepository->setServer($server)->send("minecraft:pardon-ip $ip");
            } else {
                $this->commandRepository->setServer($server)->send("pardon-ip $ip");
            }
        } catch (\Throwable $e) {
            // ignore
        }

        Activity::event('server:player.unban-ip')
            ->property([
                'ip' => $ip,
            ])
            ->log();

        return new JsonResponse([
            'success' => true
        ]);
    }

    public function kick(PlayerManagerKickRequest $request, Server $server): JsonResponse
    {
        $uuid = $this->formatUuid($request->input('uuid'));
        $reason = $request->input('reason');

        try {
            $query = $this->queryApi($server);

            $name = null;
            foreach ($query['players']['list'] ?? [] as $player) {
                if ($player['id'] === $uuid) {
                    $name = $player['name'];
                    break;
                }
            }

            if (!$name) {
                return new JsonResponse([
                    'success' => false,
                    'error' => 'Player is not online',
                ], 400);
            }

            if ($this->isBukkitBased($server)) {
                $this->commandRepository->setServer($server)->send("minecraft:kick $name $reason");
            } else {
                $this->commandRepository->setServer($server)->send("kick $name $reason");
            }

            Activity::event('server:player.kick')
                ->property([
                    'uuid' => $uuid,
                    'name' => $name,
                ])
                ->log();

            return new JsonResponse([
                'success' => true
            ]);
        } catch (\Throwable $e) {
            return new JsonResponse([
                'success' => false,
                'error' => 'Server is offline',
            ], 400);
        }
    }

    public function clear(PlayerManagerPlayerRequest $request, Server $server): JsonResponse
    {
        $uuid = $this->formatUuid($request->input('uuid'));

        try {
            $query = $this->queryApi($server);

            $name = null;
            foreach ($query['players']['list'] ?? [] as $player) {
                if ($player['id'] === $uuid) {
                    $name = $player['name'];
                    break;
                }
            }

            if (!$name) {
                return new JsonResponse([
                    'success' => false,
                    'error' => 'Player is not online',
                ], 400);
            }

            if ($this->isBukkitBased($server)) {
                $this->commandRepository->setServer($server)->send("minecraft:clear $name");
            } else {
                $this->commandRepository->setServer($server)->send("clear $name");
            }

            Activity::event('server:player.clear')
                ->property([
                    'uuid' => $uuid,
                    'name' => $name,
                ])
                ->log();

            return new JsonResponse([
                'success' => true
            ]);
        } catch (\Throwable $e) {
            return new JsonResponse([
                'success' => false,
                'error' => 'Server is offline',
            ], 400);
        }
    }

    public function wipe(PlayerManagerPlayerRequest $request, Server $server): JsonResponse
    {
        $uuid = $this->formatUuid($request->input('uuid'));

        try {
            $query = $this->queryApi($server);

            $name = null;
            foreach ($query['players']['list'] ?? [] as $player) {
                if ($player['id'] === $uuid) {
                    $name = $player['name'];
                    break;
                }
            }

            $files = $this->fileRepository->setServer($server)->getDirectory("/");

            if ($name) {
                if ($this->isBukkitBased($server)) {
                    $this->commandRepository->setServer($server)->send("minecraft:kick $name Wiped");
                } else {
                    $this->commandRepository->setServer($server)->send("kick $name Wiped");
                }
            }

            foreach ($files as $file) {
                if ($file['file']) {
                    continue;
                }

                $subfiles = $this->fileRepository->setServer($server)->getDirectory($file['name']);

                $hasPlayerData = false;
                foreach ($subfiles as $subfile) {
                    if ($subfile['name'] === 'playerdata') {
                        $hasPlayerData = true;
                        break;
                    }
                }

                if (!$hasPlayerData) {
                    continue;
                }

                $this->fileRepository->setServer($server)->deleteFiles($file['name'], [
                    "playerdata/$uuid.dat",
                    "playerdata/$uuid.dat_old",
                ]);
            }

            Activity::event('server:player.wipe')
                ->property([
                    'uuid' => $uuid,
                    'name' => $name,
                ])
                ->log();

            return new JsonResponse([
                'success' => true
            ]);
        } catch (\Throwable $e) {
            return new JsonResponse([
                'success' => false,
                'error' => 'Server is offline',
            ], 400);
        }
    }

    public function whisper(PlayerManagerWhisperRequest $request, Server $server): JsonResponse
    {
        $uuid = $this->formatUuid($request->input('uuid'));
        $message = $request->input('message');

        try {
            $query = $this->queryApi($server);

            $name = null;
            foreach ($query['players']['list'] ?? [] as $player) {
                if ($player['id'] === $uuid) {
                    $name = $player['name'];
                    break;
                }
            }

            if (!$name) {
                return new JsonResponse([
                    'success' => false,
                    'error' => 'Player is not online',
                ], 400);
            }

            if ($this->isBukkitBased($server)) {
                $this->commandRepository->setServer($server)->send("minecraft:tell $name $message");
            } else {
                $this->commandRepository->setServer($server)->send("tell $name $message");
            }

            Activity::event('server:player.whisper')
                ->property([
                    'uuid' => $uuid,
                    'name' => $name,
                    'message' => $message,
                ])
                ->log();

            return new JsonResponse([
                'success' => true
            ]);
        } catch (\Throwable $e) {
            return new JsonResponse([
                'success' => false,
                'error' => 'Server is offline',
            ], 400);
        }
    }

    public function kill(PlayerManagerPlayerRequest $request, Server $server): JsonResponse
    {
        $uuid = $this->formatUuid($request->input('uuid'));

        try {
            $query = $this->queryApi($server);

            $name = null;
            foreach ($query['players']['list'] ?? [] as $player) {
                if ($player['id'] === $uuid) {
                    $name = $player['name'];
                    break;
                }
            }

            if (!$name) {
                return new JsonResponse([
                    'success' => false,
                    'error' => 'Player is not online',
                ], 400);
            }

            if ($this->isBukkitBased($server)) {
                $this->commandRepository->setServer($server)->send("minecraft:kill $name");
            } else {
                $this->commandRepository->setServer($server)->send("kill $name");
            }

            Activity::event('server:player.kill')
                ->property([
                    'uuid' => $uuid,
                    'name' => $name,
                ])
                ->log();

            return new JsonResponse([
                'success' => true
            ]);
        } catch (\Throwable $e) {
            return new JsonResponse([
                'success' => false,
                'error' => 'Server is offline',
            ], 400);
        }
    }
}
