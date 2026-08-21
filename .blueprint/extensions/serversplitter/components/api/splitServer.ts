import http from '@/api/http';
import { Server, rawDataToServerObject } from '@/api/server/getServer';

export default async (
    uuid: string,
    serverData: {
        name: string;
        description: string | null;
        sync_subusers: boolean;
        cpu: number;
        memory: number;
        disk: number;
        feature_limits: Partial<Server['featureLimits']>;
        egg_id?: string;
    }
): Promise<Server> => {
    const { data } = await http.post(`/api/client/extensions/serversplitter/servers/${uuid}`, serverData);

    return rawDataToServerObject(data);
};
