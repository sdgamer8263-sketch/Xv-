import http from '@/api/http';
import { MinecraftVersionBuild } from './getVersionsForType';

export default async (uuid: string, type: string, _version: string): Promise<MinecraftVersionBuild[]> => {
    const { data } = await http.get<{
        builds: MinecraftVersionBuild[];
    }>(`/api/client/extensions/versionchanger/servers/${uuid}/types/${type.toUpperCase()}/${_version}`);

    return data.builds;
};
