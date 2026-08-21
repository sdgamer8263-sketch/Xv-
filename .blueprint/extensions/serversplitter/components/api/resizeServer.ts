import http from '@/api/http';
import { Server, rawDataToServerObject } from '@/api/server/getServer';

export default async (
    uuid: string,
    subserverUuid: string,
    serverData: {
        name?: string;
        description?: string;
        cpu?: number;
        memory?: number;
        disk?: number;
        feature_limits?: Partial<Server['featureLimits']>;
    }
): Promise<Server> => {
    const { data } = await http.patch(
        `/api/client/extensions/serversplitter/servers/${uuid}/${subserverUuid}`,
        serverData
    );

    return rawDataToServerObject(data);
};
