import http from '@/api/http';

export default async (uuid: string, subserverUuid: string): Promise<void> => {
    await http.delete(`/api/client/extensions/serversplitter/servers/${uuid}/${subserverUuid}`);
};
