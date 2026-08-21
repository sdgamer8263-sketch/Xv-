import http from '@/api/http';

export type Egg = {
    object: 'egg';
    attributes: {
        uuid: string;
        name: string;
    };
};

export default async (uuid: string): Promise<Record<string, Egg[]>> => {
    const { data } = await http.get(`/api/client/extensions/serversplitter/servers/${uuid}/nests`);

    return Array.isArray(data) ? {} : data;
};
