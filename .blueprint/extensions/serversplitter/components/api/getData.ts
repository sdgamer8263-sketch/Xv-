import http from '@/api/http';
import { Server, rawDataToServerObject } from '@/api/server/getServer';

export type SplitterResources = {
    cpu: number;
    memory: number;
    disk: number;
    featureLimits: Server['featureLimits'];
};

export type SplitterResponse = {
    resources: {
        total: SplitterResources;
        remaining: SplitterResources;
        remainingDisplay: SplitterResources;

        reserved: {
            cpu: number;
            memory: number;
            disk: number;
        };
    };

    master: Server;
    servers: Server[];
};

export const resourcesToProperType = (data: any): SplitterResources => ({
    cpu: data.cpu === -1 ? Infinity : data.cpu,
    memory: data.memory,
    disk: data.disk === -1 ? Infinity : data.disk,
    featureLimits: data.feature_limits,
});

export default async (uuid: string): Promise<SplitterResponse> => {
    const { data } = await http.get(`/api/client/extensions/serversplitter/servers/${uuid}`);

    return {
        resources: {
            total: resourcesToProperType(data.resources.total),
            remaining: resourcesToProperType(data.resources.remaining),
            remainingDisplay: resourcesToProperType(data.resources.remaining_display),

            reserved: {
                cpu: data.resources.reserved.cpu,
                memory: data.resources.reserved.memory,
                disk: data.resources.reserved.disk,
            },
        },

        master: rawDataToServerObject(data.master),
        servers: data.servers.map(rawDataToServerObject),
    };
};
