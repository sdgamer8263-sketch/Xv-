import React, { useState, useEffect } from 'react';
import { ServerContext } from '@/state/server';
import Can from '@/components/elements/Can';
import TitledGreyBox from '@/components/elements/TitledGreyBox';
import Label from '@/components/elements/Label';
import getNests from './api/getNests';
import updateEgg from './api/updateEgg';
import useSWR from 'swr';
import Select from '@/components/elements/Select';
import { Button } from '@/components/elements/button/index';
import { Dialog } from '@/components/elements/dialog';
import Switch from '@/components/elements/Switch';

export default function EggChangerBox() {
    const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);
    const [egg, setEgg] = useState('');
    const [changeStartup, setChangeStartup] = useState(false);
    const [reinstall, setReinstall] = useState(false);
    const [deleteFiles, setDeleteFiles] = useState(false);
    const [modal, setModal] = useState(false);
    const [isLoading, setLoading] = useState(false);

    const { data: nests } = useSWR(uuid, getNests);

    useEffect(() => {
        if (
            nests?.current &&
            Object.values(nests.nests).some((n) => n.map((e) => e.attributes.uuid).includes(nests.current))
        ) {
            setEgg(nests.current);
        } else if (!egg && nests?.nests && Object.keys(nests.nests).length > 0) {
            setEgg(nests.nests[Object.keys(nests.nests)[0]][0].attributes.uuid);
        }
    }, [nests]);

    const isNova = 'solstice'.includes('nova');

    const submit = () => {
        setLoading(true);
        updateEgg(uuid, egg, changeStartup, reinstall, deleteFiles).then(() => {
            setLoading(false);
            setModal(false);
        });
    };

    if (!nests?.nests || Object.keys(nests.nests).length === 0) {
        console.error(
            'EGG-CHANGER | No eggs available for server. Please enable on the admin panel, left for eggs that the change applies to, right for the eggs they can select.'
        );

        return <></>;
    }

    return (
        <>
            <Dialog
                title={'Change Egg'}
                description={`Changing the egg can be a destructive process. Please ensure you have backups of your server data before proceeding.${
                    reinstall || nests.config.force_reinstall ? ' This will also reinstall your server.' : ''
                }${deleteFiles || nests.config.force_delete_files ? ' All server files will be deleted.' : ''}`}
                open={modal}
                onClose={() => setModal(false)}
            >
                <div className={Object.values(nests.config).some((c) => !c) ? 'mt-4' : undefined}>
                    {!nests.config.force_update_startup_command && (
                        <div className={'bg-neutral-700 border border-neutral-800 shadow-inner p-4 rounded'}>
                            <Switch
                                name={'change_startup'}
                                label={'Change Startup Command'}
                                description={
                                    'This will change the startup command of your server to the one, that the new egg uses.'
                                }
                                defaultChecked={changeStartup}
                                onChange={(e) => setChangeStartup(e.target.checked)}
                                readOnly={isLoading}
                            />
                        </div>
                    )}
                    {!nests.config.force_reinstall && (
                        <div className={'mt-4 bg-neutral-700 border border-neutral-800 shadow-inner p-4 rounded'}>
                            <Switch
                                name={'reinstall_server'}
                                label={'Reinstall Server'}
                                description={'This will reinstall the server with the new egg. This cannot be undone.'}
                                defaultChecked={reinstall}
                                onChange={(e) => setReinstall(e.target.checked)}
                                readOnly={isLoading}
                            />
                        </div>
                    )}
                    {(reinstall || nests.config.force_reinstall) && !nests.config.force_delete_files && (
                        <div className={'mt-4 bg-neutral-700 border border-neutral-800 shadow-inner p-4 rounded'}>
                            <Switch
                                name={'delete_server_files'}
                                label={'Wipe Server Files'}
                                description={
                                    'This will delete all files on your server before changing the egg. This cannot be undone.'
                                }
                                defaultChecked={deleteFiles}
                                onChange={(e) => setDeleteFiles(e.target.checked)}
                                readOnly={isLoading}
                            />
                        </div>
                    )}

                    <Dialog.Footer>
                        <Button.Text disabled={isLoading} onClick={() => setModal(false)}>
                            Cancel
                        </Button.Text>
                        <Button.Danger disabled={isLoading} onClick={submit}>
                            Change Egg
                        </Button.Danger>
                    </Dialog.Footer>
                </div>
            </Dialog>

            {isNova ? (
                <Can action={'settings.change-egg'}>
                    <div className={'flex flex-col md:grid grid-cols-7 gap-8 mt-16'}>
                        <div className='col-span-3'>
                            <h2 className='text-xl font-bold text-gray-100'>Change Egg</h2>
                            <p className='mt-1'>Change your egg to a different one.</p>
                        </div>
                        <div className='col-span-4'>
                            {Object.keys(nests.nests).length > 0 && (
                                <div>
                                    <Label>Egg</Label>
                                    <Select value={egg} onChange={(e) => setEgg(e.target.value)}>
                                        {Object.keys(nests.nests).map((nest) => (
                                            <optgroup key={nest} label={nest}>
                                                {nests.nests[nest].map((egg) => (
                                                    <option key={egg.attributes.uuid} value={egg.attributes.uuid}>
                                                        {egg.attributes.name}
                                                    </option>
                                                ))}
                                            </optgroup>
                                        ))}
                                    </Select>
                                </div>
                            )}

                            <div className={'mt-6 text-right'}>
                                <Button onClick={() => setModal(true)}>Apply</Button>
                            </div>
                        </div>
                    </div>
                </Can>
            ) : (
                <div className={'md:w-1/2 w-full pr-5'}>
                    <Can action={'settings.change-egg'}>
                        <TitledGreyBox title={'Change Egg'} className={'md:-mt-12 mt-6'}>
                            {Object.keys(nests.nests).length > 0 && (
                                <div>
                                    <Label>Egg</Label>
                                    <Select value={egg} onChange={(e) => setEgg(e.target.value)}>
                                        {Object.keys(nests.nests).map((nest) => (
                                            <optgroup key={nest} label={nest}>
                                                {nests.nests[nest].map((egg) => (
                                                    <option key={egg.attributes.uuid} value={egg.attributes.uuid}>
                                                        {egg.attributes.name}
                                                    </option>
                                                ))}
                                            </optgroup>
                                        ))}
                                    </Select>
                                </div>
                            )}

                            <div className={'mt-6 text-right'}>
                                <Button onClick={() => setModal(true)}>Apply</Button>
                            </div>
                        </TitledGreyBox>
                    </Can>
                </div>
            )}
        </>
    );
}
