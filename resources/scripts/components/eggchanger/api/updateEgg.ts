import http from '@/api/http';

export default async (
    serverId: string,
    egg: string,
    changeStartup: boolean,
    reinstall: boolean,
    deleteFiles: boolean
): Promise<void> => {
    await http.patch(`/api/client/extensions/eggchanger/servers/${serverId}`, {
        egg_id: egg,
        reinstall: reinstall,
        change_startup: changeStartup,
        delete_files: deleteFiles,
    });
};
