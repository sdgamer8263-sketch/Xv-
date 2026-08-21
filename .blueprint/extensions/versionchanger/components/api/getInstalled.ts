import http from '@/api/http';
import { MinecraftVersionBuild } from './getVersionsForType';

export default async (uuid: string): Promise<{ build: MinecraftVersionBuild; latest: MinecraftVersionBuild } | null> => {
    const { data } = await http.get(`/api/client/extensions/versionchanger/servers/${uuid}/installed`);

    return data.build ? data : null;
};
