import http from '@/api/http';

export default async (
    uuid: string,
    egg: string,
    changeStartup: boolean,
    reinstall: boolean,
    deleteFiles: boolean
): Promise<void> => {
    await http.patch(`/api/client/extensions/eggchanger/servers/${uuid}`, {
        egg_id: egg,
        reinstall,
        change_startup: changeStartup,
        delete_files: deleteFiles,
    });
};
