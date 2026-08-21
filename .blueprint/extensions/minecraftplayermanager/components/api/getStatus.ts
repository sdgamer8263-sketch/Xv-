import http from '@/api/http';

export type Player = {
    name: string;
    uuid: string;
    avatar: string;
    render: string;
};

export type OppedPlayer = Player & {
    level: number;
    bypassesPlayerLimit: boolean;
};

export type BannedPlayer = Player & {
    reason: string;
};

export type BannedIP = {
    ip: string;
    reason: string;
};

export default async (uuid: string): Promise<{
    online: true;
    online_mode: boolean;
    opped: OppedPlayer[];

    banned: {
        players: BannedPlayer[];
        ips: BannedIP[];
    };

    whitelist: {
        enabled: boolean;
        list: Player[];
    };

    players: {
        online: number;
        max: number;
        list: Player[];
    };
} | {
    online: false;
    online_mode: boolean;
    opped: OppedPlayer[];

    banned: {
        players: BannedPlayer[];
        ips: BannedIP[];
    };

    whitelist: {
        enabled: boolean;
        list: Player[];
    };
}> => {
    const { data } = await http.get(`/api/client/extensions/minecraftplayermanager/servers/${uuid}`);

    return data;
};
