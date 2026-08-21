import http from '@/api/http';

export interface WorldData {
    name: string;
    size: number;
    last_modified: string;
}

// A folder is treated as a Minecraft world ONLY if it contains a level.dat file.
export const getWorlds = async (uuid: string): Promise<WorldData[]> => {
    try {
        const { data } = await http.get(`/api/client/servers/${uuid}/files/list?directory=/`);

        let files: any[] = [];
        if (data && data.data) {
            files = data.data.map((item: any) => item.attributes);
        }

        const directories = files.filter((f: any) => !f.is_file && !f.name.startsWith('.'));

        const worldChecks = await Promise.all(
            directories.map(async (dir: any) => {
                try {
                    const inner = await http.get(
                        `/api/client/servers/${uuid}/files/list?directory=${encodeURIComponent('/' + dir.name)}`
                    );
                    const innerFiles: any[] = inner.data?.data?.map((i: any) => i.attributes) ?? [];
                    const hasLevelDat = innerFiles.some(
                        (f: any) => f.is_file && f.name === 'level.dat'
                    );
                    if (!hasLevelDat) return null;

                    // Fast size estimate: sum file sizes from the immediate listing only
                    // (avoids recursive API calls that caused 6-8s load times)
                    const quickSize = innerFiles.reduce(
                        (sum: number, f: any) => sum + (f.size ?? 0), 0
                    );

                    return {
                        name: dir.name,
                        size: quickSize,
                        last_modified: dir.modified_at ?? '',
                    } as WorldData;
                } catch {
                    return null;
                }
            })
        );

        return worldChecks.filter(Boolean) as WorldData[];
    } catch (e) {
        console.error(e);
        return [];
    }
};

export const downloadWorldUrl = async (uuid: string, worldName: string): Promise<string> => {
    const { data } = await http.post(`/api/client/servers/${uuid}/files/compress`, {
        root: '/',
        files: [worldName],
    });
    const archiveName = data.attributes.name;

    const res = await http.get(
        `/api/client/servers/${uuid}/files/download?file=${encodeURIComponent('/' + archiveName)}`
    );
    return res.data.attributes.url;
};

export const deleteWorld = async (uuid: string, worldName: string): Promise<void> => {
    await http.post(`/api/client/servers/${uuid}/files/delete`, {
        root: '/',
        files: [worldName],
    });
};

export const renameWorld = async (
    uuid: string,
    worldName: string,
    newName: string
): Promise<void> => {
    await http.put(`/api/client/servers/${uuid}/files/rename`, {
        root: '/',
        files: [{ from: worldName, to: newName }],
    });
};

export const getWorldOptions = async (uuid: string, world: string): Promise<any> => {
    try {
        const { data } = await http.get(
            `/api/client/servers/${uuid}/files/contents?file=${encodeURIComponent('/server.properties')}`,
            { responseType: 'text' }
        );
        const content = typeof data === 'string' ? data : '';
        // Always use the world folder name as level-name (not the server.properties value)
        const options: any = { 'level-name': world };

        content.split('\n').forEach((line: string) => {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) return;
            const eqIdx = trimmed.indexOf('=');
            if (eqIdx === -1) return;
            const key = trimmed.substring(0, eqIdx).trim();
            const val = trimmed.substring(eqIdx + 1).trim();
            if (key === 'level-name') return;
            const boolKeys = ['generate-structures', 'hardcore'];
            if (boolKeys.includes(key)) {
                options[key] = val === 'true';
            } else {
                options[key] = val;
            }
        });
        return options;
    } catch {
        return { 'level-name': world };
    }
};

export const updateWorldOptions = async (
    uuid: string,
    _world: string,
    updates: any
): Promise<void> => {
    let content = '';
    try {
        const res = await http.get(
            `/api/client/servers/${uuid}/files/contents?file=${encodeURIComponent('/server.properties')}`,
            { responseType: 'text' }
        );
        content = typeof res.data === 'string' ? res.data : '';
    } catch {
        content = '';
    }

    let lines = content.split('\n');

    const updateOrAdd = (key: string, value: string) => {
        let found = false;
        lines = lines.map((line) => {
            if (line.trim().startsWith(key + '=')) {
                found = true;
                return `${key}=${value}`;
            }
            return line;
        });
        if (!found) lines.push(`${key}=${value}`);
    };

    const boolKeys = ['generate-structures', 'hardcore'];
    for (const [key, value] of Object.entries(updates)) {
        if (boolKeys.includes(key)) {
            updateOrAdd(key, value ? 'true' : 'false');
        } else {
            updateOrAdd(key, String(value ?? ''));
        }
    }

    await http.post(
        `/api/client/servers/${uuid}/files/write?file=${encodeURIComponent('/server.properties')}`,
        lines.join('\n'),
        { headers: { 'Content-Type': 'text/plain' } }
    );
};
export interface GameruleDefinition {
    key: string;
    type: 'boolean' | 'integer';
    default: string;
    description?: string;
}

export const ALL_GAMERULES: GameruleDefinition[] = [
    { key: 'announceAdvancements',            type: 'boolean', default: 'true',  description: 'Advancements announced in chat' },
    { key: 'blockExplosionDropDecay',          type: 'boolean', default: 'true',  description: 'Decay drops from block explosions' },
    { key: 'commandBlockOutput',               type: 'boolean', default: 'true',  description: 'Command blocks notify admins' },
    { key: 'disableElytraMovementCheck',       type: 'boolean', default: 'false', description: 'Disable server elytra movement check' },
    { key: 'disableRaids',                     type: 'boolean', default: 'false', description: 'Prevent raids from spawning' },
    { key: 'doDaylightCycle',                  type: 'boolean', default: 'true',  description: 'Day/night cycle progresses' },
    { key: 'doEntityDrops',                    type: 'boolean', default: 'true',  description: 'Entities drop loot' },
    { key: 'doFireTick',                       type: 'boolean', default: 'true',  description: 'Fire spreads and burns out' },
    { key: 'doImmediateRespawn',               type: 'boolean', default: 'false', description: 'Skip death screen on respawn' },
    { key: 'doInsomnia',                       type: 'boolean', default: 'true',  description: 'Phantoms spawn on sleepless nights' },
    { key: 'doLimitedCrafting',                type: 'boolean', default: 'false', description: 'Only crafting unlocked recipes allowed' },
    { key: 'doMobLoot',                        type: 'boolean', default: 'true',  description: 'Mobs drop loot when killed' },
    { key: 'doMobSpawning',                    type: 'boolean', default: 'true',  description: 'Mobs spawn naturally' },
    { key: 'doPatrolSpawning',                 type: 'boolean', default: 'true',  description: 'Pillager patrols can spawn' },
    { key: 'doTileDrops',                      type: 'boolean', default: 'true',  description: 'Blocks drop items when broken' },
    { key: 'doTraderSpawning',                 type: 'boolean', default: 'true',  description: 'Wandering traders can spawn' },
    { key: 'doVinesSpread',                    type: 'boolean', default: 'true',  description: 'Vines spread to adjacent blocks' },
    { key: 'doWardenSpawning',                 type: 'boolean', default: 'true',  description: 'Wardens spawn in deep dark' },
    { key: 'doWeatherCycle',                   type: 'boolean', default: 'true',  description: 'Weather changes over time' },
    { key: 'drowningDamage',                   type: 'boolean', default: 'true',  description: 'Players take drowning damage' },
    { key: 'enderPearlsVanishOnDeath',         type: 'boolean', default: 'true',  description: 'Ender pearls vanish when thrower dies' },
    { key: 'fallDamage',                       type: 'boolean', default: 'true',  description: 'Players take fall damage' },
    { key: 'fireDamage',                       type: 'boolean', default: 'true',  description: 'Players take fire damage' },
    { key: 'forgiveDeadPlayers',               type: 'boolean', default: 'true',  description: 'Neutral mobs calm when player dies' },
    { key: 'freezeDamage',                     type: 'boolean', default: 'true',  description: 'Players take freeze damage in powder snow' },
    { key: 'globalSoundEvents',                type: 'boolean', default: 'true',  description: 'Ender dragon death sound is global' },
    { key: 'keepInventory',                    type: 'boolean', default: 'false', description: 'Keep inventory on death' },
    { key: 'lavaSourceConversion',             type: 'boolean', default: 'false', description: 'Lava can form infinite sources' },
    { key: 'logAdminCommands',                 type: 'boolean', default: 'true',  description: 'Admin commands are logged' },
    { key: 'mobExplosionDropDecay',            type: 'boolean', default: 'true',  description: 'Decay drops from mob explosions' },
    { key: 'mobGriefing',                      type: 'boolean', default: 'true',  description: 'Mobs can destroy blocks / pick up items' },
    { key: 'naturalRegeneration',              type: 'boolean', default: 'true',  description: 'Health regenerates when hunger is full' },
    { key: 'projectilesCanBreakBlocks',        type: 'boolean', default: 'true',  description: 'Projectiles can break blocks' },
    { key: 'pvp',                              type: 'boolean', default: 'true',  description: 'Players can damage other players' },
    { key: 'reducedDebugInfo',                 type: 'boolean', default: 'false', description: 'Hide extra debug info in F3 screen' },
    { key: 'sendCommandFeedback',              type: 'boolean', default: 'true',  description: 'Show command output to executing player' },
    { key: 'showDeathMessages',                type: 'boolean', default: 'true',  description: 'Show death messages in chat' },
    { key: 'spectatorsGenerateChunks',         type: 'boolean', default: 'true',  description: 'Spectators can generate new chunks' },
    { key: 'tntExplosionDropDecay',            type: 'boolean', default: 'false', description: 'Decay item drops from TNT explosions' },
    { key: 'tntExplodes',                      type: 'boolean', default: 'true',  description: 'TNT can explode' },
    { key: 'universalAnger',                   type: 'boolean', default: 'false', description: 'Neutral mobs attack any provoking player' },
    { key: 'waterSourceConversion',            type: 'boolean', default: 'true',  description: 'Water can form infinite sources' },
    { key: 'commandBlocksWork',                type: 'boolean', default: 'true',  description: 'Command blocks can execute commands' },
    { key: 'locatorBar',                       type: 'boolean', default: 'true',  description: 'Show locator bar for players' },
    { key: 'raids',                            type: 'boolean', default: 'true',  description: 'Raids can be triggered' },
    { key: 'showAdvancementMessages',          type: 'boolean', default: 'true',  description: 'Advancement messages shown in chat' },
    { key: 'spawnMonsters',                    type: 'boolean', default: 'true',  description: 'Hostile mobs spawn naturally' },
    { key: 'spawnPatrols',                     type: 'boolean', default: 'true',  description: 'Pillager patrols spawn' },
    { key: 'spawnPhantoms',                    type: 'boolean', default: 'true',  description: 'Phantoms spawn at night' },
    { key: 'spawnWanderingTraders',            type: 'boolean', default: 'true',  description: 'Wandering traders spawn' },
    { key: 'spawnWardens',                     type: 'boolean', default: 'true',  description: 'Wardens spawn in deep dark' },
    { key: 'spawnerBlocksWork',                type: 'boolean', default: 'true',  description: 'Spawner blocks work normally' },
    { key: 'commandModificationBlockLimit',    type: 'integer', default: '32768', description: 'Max blocks changed by commands' },
    { key: 'maxCommandChainLength',            type: 'integer', default: '65536', description: 'Max commands in a chain per tick' },
    { key: 'maxCommandForkCount',              type: 'integer', default: '65536', description: 'Max forks in a command chain' },
    { key: 'maxEntityCramming',                type: 'integer', default: '24',    description: 'Max entities in one block before cramming damage' },
    { key: 'playersSleepingPercentage',        type: 'integer', default: '100',   description: '% of players that must sleep to skip night' },
    { key: 'playersNetherPortalCreativeDelay', type: 'integer', default: '1',     description: 'Portal delay for creative players (ticks)' },
    { key: 'playersNetherPortalDefaultDelay',  type: 'integer', default: '80',    description: 'Portal delay for survival players (ticks)' },
    { key: 'randomTickSpeed',                  type: 'integer', default: '3',     description: 'Rate of random block ticks per chunk' },
    { key: 'snowAccumulationHeight',           type: 'integer', default: '1',     description: 'Max snow layers that can accumulate' },
    { key: 'spawnRadius',                      type: 'integer', default: '10',    description: 'Radius around world spawn for new players' },
    { key: 'maxBlockModifications',            type: 'integer', default: '32768', description: 'Max block modifications per command' },
    { key: 'maxCommandSequenceLength',         type: 'integer', default: '65536', description: 'Max command sequence length' },
    { key: 'fireSpreadRadiusAroundPlayer',     type: 'integer', default: '128',   description: 'Radius around players where fire spreads' },
];

export const getGamerules = async (
    _uuid: string,
    _world: string
): Promise<Record<string, string>> => {
    const result: Record<string, string> = {};
    ALL_GAMERULES.forEach((rule) => {
        result[rule.key] = rule.default;
    });
    return result;
};

export const updateGamerules = async (
    uuid: string,
    _world: string,
    data: Record<string, string>
): Promise<void> => {
    for (const [key, value] of Object.entries(data)) {
        await http.post(`/api/client/servers/${uuid}/command`, {
            command: `gamerule ${key} ${value}`,
        });
    }
};

export const getUploadUrl = async (uuid: string): Promise<string> => {
    const { data } = await http.get(`/api/client/servers/${uuid}/files/upload`);
    return data.attributes.url;
};

export const decompressFile = async (
    uuid: string,
    root: string,
    file: string
): Promise<void> => {
    await http.post(`/api/client/servers/${uuid}/files/decompress`, { root, file });
};

export const worldFolderExists = async (uuid: string, folderName: string): Promise<boolean> => {
    try {
        const { data } = await http.get(`/api/client/servers/${uuid}/files/list?directory=/`);
        const files: any[] = data?.data?.map((i: any) => i.attributes) ?? [];
        return files.some((f: any) => !f.is_file && f.name === folderName);
    } catch {
        return false;
    }
};

export const restartServer = async (uuid: string): Promise<void> => {
    await http.post(`/api/client/servers/${uuid}/power`, { signal: 'restart' });
};
