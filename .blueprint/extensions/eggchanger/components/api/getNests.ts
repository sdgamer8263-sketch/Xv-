import http from '@/api/http';

export type Egg = {
    object: 'egg';
    attributes: {
        uuid: string;
        name: string;
    };
};

export default async (
    uuid: string
): Promise<{
    nests: Record<string, Egg[]>;
    current: string;
    config: {
        force_update_startup_command: boolean;
        force_reinstall: boolean;
        force_delete_files: boolean;
    };
}> => {
    const { data } = await http.get(`/api/client/extensions/eggchanger/servers/${uuid}/nests`);

    return data;
};
