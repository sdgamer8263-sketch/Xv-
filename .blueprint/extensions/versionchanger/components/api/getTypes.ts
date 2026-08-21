import http from '@/api/http';

export type MinecraftVersionProviderType = {
    name: string;
    icon: string;
    homepage: string;
    description: string;
    experimental: boolean;
    deprecated: boolean;
    builds: number;
    versions: {
        minecraft: number;
        project: number;
    };
};

export default async (uuid: string): Promise<MinecraftVersionProviderType[]> => {
    const { data } = await http.get<{
        types: Record<string, MinecraftVersionProviderType>;
    }>(`/api/client/extensions/versionchanger/servers/${uuid}/types`);

    return Object.values(data.types);
};
