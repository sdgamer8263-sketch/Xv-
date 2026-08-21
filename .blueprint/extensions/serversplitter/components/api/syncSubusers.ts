import http from '@/api/http';

export default async (uuid: string, serverUuid: string): Promise<void> => {
    await http.post(`/api/client/extensions/serversplitter/servers/${uuid}/${serverUuid}/subusers-sync`);
};
