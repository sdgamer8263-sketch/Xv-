import http from '@/api/http';

export type MinecraftVersionBuild = {
    id: number;
    type: string;
    projectVersionId: string | null;
    versionId: string | null;
    buildNumber: number;
    experimental: boolean;
    created: string | null;
};

export type MinecraftVersionBuilds = {
    version: string;
    type?: 'RELEASE' | 'SNAPSHOT';
    builds: number;
    latest: MinecraftVersionBuild;
};

export default async (uuid: string, type: string): Promise<MinecraftVersionBuilds[]> => {
    const { data } = await http.get<{
        builds: Record<string, Omit<MinecraftVersionBuilds, 'version'>>;
    }>(`/api/client/extensions/versionchanger/servers/${uuid}/types/${type.toUpperCase()}`);

    return Object.entries(data.builds)
        .map(([version, data]) => ({ ...data, version }))
        .reverse();
};
