import React, { useEffect, useState } from 'react';
import ServerContentBlock from '@/components/elements/ServerContentBlock';
import tw from 'twin.macro';
import { WorldData, getWorlds } from './api';
import { ServerContext } from '@/state/server';
import useFlash from '@/plugins/useFlash';
import FlashMessageRender from '@/components/FlashMessageRender';
import Spinner from '@/components/elements/Spinner';
import { Button } from '@/components/elements/button';
import WorldRow from './WorldRow';
import WorldOptionsModal from './WorldOptionsModal';
import GamerulesModal from './GamerulesModal';

export default () => {
    const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);
    const { addFlash, clearFlashes } = useFlash();

    const [worlds, setWorlds] = useState<WorldData[]>([]);
    const [loading, setLoading] = useState(true);

    const [optionsWorld, setOptionsWorld]     = useState<string | null>(null);
    const [gamerulesWorld, setGamerulesWorld] = useState<string | null>(null);

    const loadWorlds = () => {
        setLoading(true);
        clearFlashes('worldmanager');
        getWorlds(uuid)
            .then((data) => {
                setWorlds(data);
            })
            .catch((error) => {
                console.error(error);
                addFlash({
                    type: 'error',
                    key: 'worldmanager',
                    message: 'Failed to fetch worlds. Make sure the server has run at least once.',
                });
            })
            .finally(() => {
                setLoading(false);
            });
    };

    useEffect(() => {
        loadWorlds();
    }, [uuid]);

    return (
        <ServerContentBlock title={'World Manager'}>
            <FlashMessageRender byKey={'worldmanager'} css={tw`mb-4`} />

            {optionsWorld && (
                <WorldOptionsModal
                    open={true}
                    worldName={optionsWorld}
                    onClose={() => setOptionsWorld(null)}
                    onRenamed={(newName) => {
                        setOptionsWorld(null);
                        loadWorlds();
                    }}
                />
            )}

            {gamerulesWorld && (
                <GamerulesModal
                    open={true}
                    worldName={gamerulesWorld}
                    onClose={() => setGamerulesWorld(null)}
                />
            )}

            <div css={tw`bg-neutral-900 shadow rounded p-4 mb-4 flex justify-between items-center`}>
                <h1 css={tw`text-xl font-bold text-neutral-100`}>Worlds</h1>
                <Button.Text onClick={loadWorlds} disabled={loading}>
                    {loading ? 'Loading…' : 'Refresh'}
                </Button.Text>
            </div>

            {loading ? (
                <div css={tw`flex justify-center p-10`}>
                    <Spinner size={'large'} />
                </div>
            ) : !worlds || worlds.length === 0 ? (
                <p css={tw`text-center text-neutral-400 p-8`}>
                    No Minecraft worlds found. The server must have been started at
                    least once for worlds to appear here.
                </p>
            ) : (
                <div css={tw`flex flex-col`}>
                    {worlds.map((world) => (
                        <WorldRow
                            key={world.name}
                            world={world}
                            onDeleted={loadWorlds}
                            onRefresh={loadWorlds}
                            onOptionsClick={setOptionsWorld}
                            onGamerulesClick={setGamerulesWorld}
                        />
                    ))}
                </div>
            )}
        </ServerContentBlock>
    );
};
