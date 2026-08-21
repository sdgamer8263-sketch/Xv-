import React, { useEffect, useState } from 'react';
import { ServerContext } from '@/state/server';
import ServerContentBlock from '@/components/elements/ServerContentBlock';
import Spinner from '@/components/elements/Spinner';
import useSWR from 'swr';
import useFlash from '@/plugins/useFlash';
import getData from './api/getData';
import Can from '@/components/elements/Can';
import {
    faExternalLinkSquareAlt,
    faHdd,
    faMemory,
    faMicrochip,
    faNetworkWired,
    faPlus,
    faServer,
    faTrash,
} from '@fortawesome/free-solid-svg-icons';
import getNests from './api/getNests';
import { Button } from '@/components/elements/button/index';
import { Dialog } from '@/components/elements/dialog';
import { Server } from '@/api/server/getServer';
import { Input } from '@/components/elements/inputs';
import Label from '@/components/elements/Label';
import deleteServer from './api/deleteServer';
import splitServer from './api/splitServer';
import Switch from '@/components/elements/Switch';
import Select from '@/components/elements/Select';
import resizeServer from './api/resizeServer';
import apiSyncSubusers from './api/syncSubusers';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import FlashMessageRender from '@/components/FlashMessageRender';
import { bytesToString } from '@/lib/formatters';
import { useHistory } from 'react-router-dom';
import { usePermissions } from '@/plugins/usePermissions';
import classNames from 'classnames';

const closestGoodLookingNumberMB = (mb: number) => {
    return Math.floor(mb / 512) * 512;
};

const closestGoodLookingNumberGB = (mb: number) => {
    return closestGoodLookingNumberMB(mb) / 1024;
};

export default function ServerSplitterContainer() {
    const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);
    const parentId = ServerContext.useStoreState((state) => state.server.data!.parentId);
    const splitterLimit = ServerContext.useStoreState((state) => state.server.data!.featureLimits.splits);
    const swapLimit = ServerContext.useStoreState((state) => state.server.data!.limits.swap);
    const [viewServer, setViewServer] = useState<Server>();
    const [deleteServerAction, setDeleteServerAction] = useState<Server>();
    const [isLoading, setIsLoading] = useState(false);
    const [create, setCreate] = useState(false);
    const [syncSubusers, setSyncSubusers] = useState(true);
    const { clearFlashes, clearAndAddHttpError } = useFlash();

    const history = useHistory();
    const [canCreate] = usePermissions('splitter.create');

    const [displayMode, setDisplayMode] = useState<'mb' | 'gb'>('gb');
    const [_name, setName] = React.useState<string>();
    const [description, setDescription] = React.useState<string>();
    const [cpu, setCpu] = React.useState<number>();
    const [memory, setMemory] = React.useState<number>();
    const [memoryRaw, setMemoryRaw] = React.useState<string>();
    const [disk, setDisk] = React.useState<number>();
    const [diskRaw, setDiskRaw] = React.useState<string>();
    const [featureLimits, setFeatureLimits] = React.useState<Server['featureLimits']>();
    const [egg, setEgg] = React.useState<string>();

    const { data, mutate } = useSWR(['splitter', 'data', uuid], () => getData(uuid), {
        refreshInterval: 10000,
    });

    const { data: nests } = useSWR(['splitter', 'nests', uuid], () => getNests(uuid), {
        refreshInterval: 30000,
    });

    useEffect(() => {
        clearFlashes('splitter');
    }, []);

    useEffect(() => {
        if (!nests) return;

        setEgg(nests[Object.keys(nests)[0]]?.[0].attributes.uuid);
    }, [nests]);

    useEffect(() => {
        if (!viewServer) {
            setName(undefined);
            setDescription(undefined);
            setCpu(undefined);
            setMemory(undefined);
            setDisk(undefined);
            setFeatureLimits(undefined);
            setMemoryRaw(undefined);
            setDiskRaw(undefined);

            return;
        }

        setDisplayMode(
            closestGoodLookingNumberMB(viewServer.limits.memory) > 0 &&
                closestGoodLookingNumberMB(viewServer.limits.disk) > 0
                ? 'gb'
                : 'mb'
        );
        setName(viewServer.name);
        setDescription(viewServer.description ?? undefined);
        setCpu(viewServer.limits.cpu);
        setMemory(viewServer.limits.memory);
        setDisk(viewServer.limits.disk);
        setFeatureLimits(viewServer.featureLimits);
    }, [viewServer]);

    useEffect(() => {
        if (!create || !data) return;

        const mode =
            closestGoodLookingNumberGB(data.resources.remaining.memory) > 0 &&
            closestGoodLookingNumberGB(data.resources.remaining.disk) > 0
                ? 'gb'
                : 'mb';
        setName('');
        setDescription('');
        setCpu(Math.floor(data.resources.remaining.cpu / 2));
        setDisplayMode(mode);

        if (mode === 'gb') {
            setMemory(closestGoodLookingNumberMB(data.resources.remaining.memory / 2));
            setDisk(closestGoodLookingNumberMB(data.resources.remaining.disk / 2));
        } else {
            setMemory(Math.floor(data.resources.remaining.memory / 2));
            setDisk(Math.floor(data.resources.remaining.disk / 2));
        }

        setFeatureLimits(
            Object.keys(data.resources.remaining.featureLimits).reduce(
                (prev, curr) => ({
                    ...prev,
                    [curr]: Math.floor(
                        data.resources.remaining.featureLimits[curr as keyof Server['featureLimits']] / 2
                    ),
                }),
                {}
            ) as any
        );
    }, [create, data]);

    useEffect(() => {
        if (!cpu || !data) return;

        if (viewServer?.limits.cpu === 0) {
            setCpu(data.resources.remaining.cpu);
        } else if (cpu > data.resources.remaining.cpu + (viewServer?.limits.cpu ?? 0)) {
            setCpu(data.resources.remaining.cpu + (viewServer?.limits.cpu ?? 0));
        }
    }, [cpu, data]);

    useEffect(() => {
        if (!memory || !data) return;

        if (memory > data.resources.remaining.memory + (viewServer?.limits.memory ?? 0)) {
            if (displayMode === 'gb') {
                setMemory(
                    closestGoodLookingNumberMB(data.resources.remaining.memory + (viewServer?.limits.memory ?? 0))
                );
            } else {
                setMemory(data.resources.remaining.memory + (viewServer?.limits.memory ?? 0));
            }
        }
    }, [memory, data]);

    useEffect(() => {
        if (!disk || !data) return;

        if (viewServer?.limits.disk === 0) {
            setDisk(data.resources.remaining.disk);
        } else if (disk > data.resources.remaining.disk + (viewServer?.limits.disk ?? 0)) {
            if (displayMode === 'gb') {
                setDisk(closestGoodLookingNumberMB(data.resources.remaining.disk + (viewServer?.limits.disk ?? 0)));
            } else {
                setDisk(data.resources.remaining.disk + (viewServer?.limits.disk ?? 0));
            }
        }
    }, [disk, data]);

    useEffect(() => {
        if (!featureLimits || !data) return;

        for (const key of Object.keys(featureLimits)) {
            if (
                featureLimits[key as keyof Server['featureLimits']] >
                data.resources.remaining.featureLimits[key as keyof Server['featureLimits']] +
                    (viewServer?.featureLimits[key as keyof Server['featureLimits']] ?? 0)
            ) {
                setFeatureLimits(
                    (prev) =>
                        ({
                            ...prev,
                            [key]:
                                data.resources.remaining.featureLimits[key as keyof Server['featureLimits']] +
                                (viewServer?.featureLimits[key as keyof Server['featureLimits']] ?? 0),
                        } as any)
                );
            }
        }
    }, [featureLimits, data]);

    useEffect(() => {
        if (displayMode === 'gb') {
            if (memory && memory % 512 !== 0) {
                setMemory(closestGoodLookingNumberMB(memory));
            }

            if (disk && disk % 512 !== 0) {
                setDisk(closestGoodLookingNumberMB(disk));
            }
        }
    }, [displayMode]);

    useEffect(() => {
        if (memoryRaw && !memoryRaw.endsWith('.')) {
            setMemory(closestGoodLookingNumberMB(parseFloat(memoryRaw) * 1024));
            setMemoryRaw(undefined);
        }

        if (diskRaw && !diskRaw.endsWith('.')) {
            setDisk(closestGoodLookingNumberMB(parseFloat(diskRaw) * 1024));
            setDiskRaw(undefined);
        }
    }, [memoryRaw, diskRaw]);

    if (!data) {
        return <Spinner size={'large'} centered />;
    }

    return (
        <ServerContentBlock title={'Splitter'}>
            <Dialog.Confirm
                open={!!deleteServerAction}
                confirm={'Delete'}
                title={'Delete Server'}
                onConfirmed={() => {
                    setIsLoading(true);

                    deleteServer(uuid, deleteServerAction!.uuid)
                        .then(() => {
                            mutate();
                            setDeleteServerAction(undefined);
                        })
                        .catch((error) => {
                            setIsLoading(false);
                            clearAndAddHttpError({ key: 'splitter', error });
                        })
                        .finally(() => setIsLoading(false));
                }}
                onClose={() => {
                    setViewServer(deleteServerAction);
                    setDeleteServerAction(undefined);
                }}
            >
                Are you sure you want to delete this server? This action is irreversible.
            </Dialog.Confirm>
            <Dialog open={create} onClose={() => setCreate(false)} title={'Create new Split'}>
                {!nests ? (
                    <Spinner centered size={'large'} />
                ) : (
                    <>
                        <FlashMessageRender byKey={'splitter'} className={'mb-4'} />
                        <div className={'grid grid-cols-2 gap-4'}>
                            <div>
                                <Label>Name</Label>
                                <Input.Text
                                    value={_name}
                                    className={!_name ? 'ring-red-400 ring-2' : undefined}
                                    placeholder={'Name'}
                                    onChange={(e) => setName(e.target.value)}
                                />
                            </div>
                            <div>
                                <Label>Description</Label>
                                <Input.Text
                                    value={description}
                                    placeholder={'Description'}
                                    onChange={(e) => setDescription(e.target.value)}
                                />
                            </div>
                            <div>
                                <Label>
                                    CPU Limit ({data.resources.remaining.cpu} % Max, {data.resources.reserved.cpu} %
                                    Min)
                                </Label>
                                <Input.Text
                                    type={'number'}
                                    placeholder={'50'}
                                    className={
                                        !cpu || cpu < data.resources.reserved.cpu ? 'ring-red-400 ring-2' : undefined
                                    }
                                    value={cpu}
                                    onChange={(e) => setCpu(e.target.valueAsNumber)}
                                />
                            </div>
                            {displayMode === 'gb' ? (
                                <div>
                                    <Label>
                                        Memory Limit ({closestGoodLookingNumberGB(data.resources.remaining.memory)} GiB
                                        Max,{' '}
                                        {data.resources.reserved.memory % 512 === 0
                                            ? `${data.resources.reserved.memory / 1024} GiB`
                                            : `${data.resources.reserved.memory} MiB`}{' '}
                                        Min)
                                    </Label>
                                    <Input.Text
                                        type={'number'}
                                        lang={'en'}
                                        placeholder={'0.5'}
                                        className={
                                            !memory || memory < data.resources.reserved.memory
                                                ? 'ring-red-400 ring-2'
                                                : undefined
                                        }
                                        value={memoryRaw ?? (memory ?? 0) / 1024}
                                        onChange={(e) => setMemoryRaw(e.target.value)}
                                    />
                                </div>
                            ) : (
                                <div>
                                    <Label>
                                        Memory Limit ({data.resources.remaining.memory} MiB Max,{' '}
                                        {data.resources.reserved.memory} MiB Min)
                                    </Label>
                                    <Input.Text
                                        type={'number'}
                                        placeholder={'512'}
                                        className={
                                            !memory || memory < data.resources.reserved.memory
                                                ? 'ring-red-400 ring-2'
                                                : undefined
                                        }
                                        value={memory}
                                        onChange={(e) => setMemory(e.target.valueAsNumber)}
                                    />
                                </div>
                            )}
                            {displayMode === 'gb' ? (
                                <div>
                                    <Label>
                                        Disk Limit ({closestGoodLookingNumberGB(data.resources.remaining.disk)} GiB Max,{' '}
                                        {data.resources.reserved.disk % 512 === 0
                                            ? `${data.resources.reserved.disk / 1024} GiB`
                                            : `${data.resources.reserved.disk} MiB`}{' '}
                                        Min)
                                    </Label>
                                    <Input.Text
                                        type={'number'}
                                        placeholder={'0.5'}
                                        className={
                                            !disk || disk < data.resources.reserved.disk
                                                ? 'ring-red-400 ring-2'
                                                : undefined
                                        }
                                        lang={'en'}
                                        value={diskRaw ?? (disk ?? 0) / 1024}
                                        onChange={(e) => setDiskRaw(e.target.value)}
                                    />
                                </div>
                            ) : (
                                <div>
                                    <Label>
                                        Disk Limit ({data.resources.remaining.disk} MiB Max,{' '}
                                        {data.resources.reserved.disk} MiB Min)
                                    </Label>
                                    <Input.Text
                                        type={'number'}
                                        placeholder={'512'}
                                        className={
                                            !disk || disk < data.resources.reserved.disk
                                                ? 'ring-red-400 ring-2'
                                                : undefined
                                        }
                                        value={disk}
                                        onChange={(e) => setDisk(e.target.valueAsNumber)}
                                    />
                                </div>
                            )}
                            <div>
                                <Label>
                                    {swapLimit > 0 || swapLimit === -1 ? 'Swap Limit (1/4 of Memory)' : 'Swap Limit'}
                                </Label>
                                <Input.Text
                                    type={'number'}
                                    placeholder={'512'}
                                    value={swapLimit > 0 || swapLimit === -1 ? Math.floor((memory ?? 0) / 4) : 0}
                                    disabled={true}
                                />
                            </div>
                            {Object.keys(data.resources.remaining.featureLimits)
                                .map((key, _, all) =>
                                    key === 'splits' && all.length % 2 === 1 ? null : (
                                        <div key={key}>
                                            <Label>
                                                {key[0].toUpperCase()}
                                                {key.slice(1)} (
                                                {
                                                    data.resources.remaining.featureLimits[
                                                        key as keyof Server['featureLimits']
                                                    ]
                                                }{' '}
                                                Max{key === 'allocations' ? ', 1 Min' : ''})
                                            </Label>
                                            <Input.Text
                                                type={'number'}
                                                placeholder={'0'}
                                                min={0}
                                                className={
                                                    key === 'allocations' && !featureLimits?.allocations
                                                        ? 'ring-red-400 ring-2'
                                                        : undefined
                                                }
                                                value={featureLimits?.[key as keyof Server['featureLimits']]}
                                                disabled={
                                                    data.resources.remaining.featureLimits[
                                                        key as keyof Server['featureLimits']
                                                    ] === 0 || key === 'splits'
                                                }
                                                onChange={(e) => {
                                                    setFeatureLimits(
                                                        (prev) =>
                                                            ({
                                                                ...prev,
                                                                [key]: e.target.valueAsNumber,
                                                            } as any)
                                                    );
                                                }}
                                            />
                                        </div>
                                    )
                                )
                                .filter(Boolean)}
                        </div>

                        {Object.keys(nests).length > 0 && (
                            <div className={'mt-6'}>
                                <Label>Egg</Label>
                                <Select value={egg} onChange={(e) => setEgg(e.target.value)}>
                                    {Object.keys(nests).map((nest) => (
                                        <optgroup key={nest} label={nest}>
                                            {nests![nest].map((egg) => (
                                                <option key={egg.attributes.uuid} value={egg.attributes.uuid}>
                                                    {egg.attributes.name}
                                                </option>
                                            ))}
                                        </optgroup>
                                    ))}
                                </Select>
                            </div>
                        )}

                        <div className={'mt-4 bg-neutral-700 border border-neutral-800 shadow-inner p-4 rounded'}>
                            <Switch
                                name={'sync_subusers'}
                                label={'Sync Subusers'}
                                description={'Sync subusers from the master server to this server.'}
                                defaultChecked={syncSubusers}
                                onChange={(e) => setSyncSubusers(e.target.checked)}
                                readOnly={isLoading}
                            />
                        </div>

                        {closestGoodLookingNumberGB(data.resources.remaining.memory) > 0 &&
                            closestGoodLookingNumberGB(data.resources.remaining.disk) > 0 && (
                                <div
                                    className={'mt-4 bg-neutral-700 border border-neutral-800 shadow-inner p-4 rounded'}
                                >
                                    <Switch
                                        name={'use_gb'}
                                        label={'Use Gibibytes'}
                                        description={'Use Gibibytes instead of mebibytes for memory and disk limits.'}
                                        defaultChecked={syncSubusers}
                                        onChange={(e) => setDisplayMode(e.target.checked ? 'gb' : 'mb')}
                                        readOnly={isLoading}
                                    />
                                </div>
                            )}

                        <Dialog.Footer>
                            <Button.Text disabled={isLoading} onClick={() => setCreate(false)}>
                                Cancel
                            </Button.Text>
                            <Button
                                disabled={
                                    isLoading ||
                                    !_name ||
                                    !featureLimits?.allocations ||
                                    !cpu ||
                                    cpu < data.resources.reserved.cpu ||
                                    !memory ||
                                    memory < data.resources.reserved.memory ||
                                    !disk ||
                                    disk < data.resources.reserved.disk
                                }
                                onClick={() => {
                                    setIsLoading(true);

                                    splitServer(uuid, {
                                        name: _name!,
                                        description: description!,
                                        cpu: cpu!,
                                        memory: memory!,
                                        disk: disk!,
                                        feature_limits: featureLimits!,
                                        egg_id: egg,
                                        sync_subusers: syncSubusers,
                                    })
                                        .then(() => {
                                            mutate();
                                            setCreate(false);
                                            setSyncSubusers(true);
                                            clearFlashes('splitter');
                                        })
                                        .catch((error) => {
                                            setIsLoading(false);
                                            clearAndAddHttpError({ key: 'splitter', error });
                                        })
                                        .finally(() => setIsLoading(false));
                                }}
                            >
                                Split Server
                            </Button>
                        </Dialog.Footer>
                    </>
                )}
            </Dialog>
            <Dialog open={!!viewServer} onClose={() => setViewServer(undefined)} title={viewServer?.name}>
                {!viewServer ? (
                    <Spinner centered size={'large'} />
                ) : (
                    <>
                        <FlashMessageRender byKey={'splitter'} className={'mb-4'} />
                        <div className={'grid grid-cols-2 gap-4'}>
                            <div>
                                <Label>Name</Label>
                                <Input.Text
                                    value={_name}
                                    className={!_name ? 'ring-red-400 ring-2' : undefined}
                                    placeholder={'Name'}
                                    onChange={(e) => setName(e.target.value)}
                                />
                            </div>
                            <div>
                                <Label>Description</Label>
                                <Input.Text
                                    value={description}
                                    placeholder={'Description'}
                                    onChange={(e) => setDescription(e.target.value)}
                                />
                            </div>
                            <div>
                                <Label>
                                    CPU Limit ({data.resources.remaining.cpu + viewServer.limits.cpu} % Max,{' '}
                                    {data.resources.reserved.cpu} % Min)
                                </Label>
                                <Input.Text
                                    type={'number'}
                                    placeholder={'50'}
                                    className={
                                        !cpu || cpu < data.resources.reserved.cpu ? 'ring-red-400 ring-2' : undefined
                                    }
                                    value={cpu}
                                    onChange={(e) => setCpu(e.target.valueAsNumber)}
                                />
                            </div>
                            {displayMode === 'gb' ? (
                                <div>
                                    <Label>
                                        Memory Limit (
                                        {closestGoodLookingNumberGB(
                                            data.resources.remaining.memory + viewServer.limits.memory
                                        )}{' '}
                                        GiB Max,{' '}
                                        {data.resources.reserved.memory % 512 === 0
                                            ? `${data.resources.reserved.memory / 1024} GiB`
                                            : `${data.resources.reserved.memory} MiB`}{' '}
                                        Min)
                                    </Label>
                                    <Input.Text
                                        type={'number'}
                                        placeholder={'0.5'}
                                        lang={'en'}
                                        className={
                                            !memory || memory < data.resources.reserved.memory
                                                ? 'ring-red-400 ring-2'
                                                : undefined
                                        }
                                        value={memoryRaw ?? (memory ?? 0) / 1024}
                                        onChange={(e) => setMemoryRaw(e.target.value)}
                                    />
                                </div>
                            ) : (
                                <div>
                                    <Label>
                                        Memory Limit ({data.resources.remaining.memory + viewServer.limits.memory} MiB
                                        Max, {data.resources.reserved.memory} MiB Min)
                                    </Label>
                                    <Input.Text
                                        type={'number'}
                                        placeholder={'512'}
                                        className={
                                            !memory || memory < data.resources.reserved.memory
                                                ? 'ring-red-400 ring-2'
                                                : undefined
                                        }
                                        value={memory}
                                        onChange={(e) => setMemory(e.target.valueAsNumber)}
                                    />
                                </div>
                            )}
                            {displayMode === 'gb' ? (
                                <div>
                                    <Label>
                                        Disk Limit (
                                        {closestGoodLookingNumberGB(
                                            data.resources.remaining.disk + viewServer.limits.disk
                                        )}{' '}
                                        GiB Max,{' '}
                                        {data.resources.reserved.disk % 512 === 0
                                            ? `${data.resources.reserved.disk / 1024} GiB`
                                            : `${data.resources.reserved.disk} MiB`}{' '}
                                        Min)
                                    </Label>
                                    <Input.Text
                                        type={'number'}
                                        placeholder={'0.5'}
                                        lang={'en'}
                                        className={
                                            !disk || disk < data.resources.reserved.disk
                                                ? 'ring-red-400 ring-2'
                                                : undefined
                                        }
                                        value={diskRaw ?? (disk ?? 0) / 1024}
                                        onChange={(e) => setDiskRaw(e.target.value)}
                                    />
                                </div>
                            ) : (
                                <div>
                                    <Label>
                                        Disk Limit ({data.resources.remaining.disk + viewServer.limits.disk} MiB Max,{' '}
                                        {data.resources.reserved.disk} MiB Min)
                                    </Label>
                                    <Input.Text
                                        type={'number'}
                                        placeholder={'512'}
                                        className={
                                            !disk || disk < data.resources.reserved.disk
                                                ? 'ring-red-400 ring-2'
                                                : undefined
                                        }
                                        value={disk}
                                        onChange={(e) => setDisk(e.target.valueAsNumber)}
                                    />
                                </div>
                            )}
                            <div>
                                <Label>
                                    {swapLimit > 0 || swapLimit === -1 ? 'Swap Limit (1/4 of Memory)' : 'Swap Limit'}
                                </Label>
                                <Input.Text
                                    type={'number'}
                                    placeholder={'512'}
                                    value={swapLimit > 0 || swapLimit === -1 ? Math.floor((memory ?? 0) / 4) : 0}
                                    disabled={true}
                                />
                            </div>
                            {Object.keys(viewServer.featureLimits)
                                .map((key, _, all) =>
                                    key === 'splits' && all.length % 2 === 1 ? null : (
                                        <div key={key}>
                                            <Label>
                                                {key[0].toUpperCase()}
                                                {key.slice(1)} (
                                                {data.resources.remaining.featureLimits[
                                                    key as keyof Server['featureLimits']
                                                ] + viewServer.featureLimits[key as keyof Server['featureLimits']]}{' '}
                                                Max{key === 'allocations' ? ', 1 Min' : ''})
                                            </Label>
                                            <Input.Text
                                                type={'number'}
                                                placeholder={'0'}
                                                min={0}
                                                className={
                                                    key === 'allocations' && !featureLimits?.allocations
                                                        ? 'ring-red-400 ring-2'
                                                        : undefined
                                                }
                                                value={featureLimits?.[key as keyof Server['featureLimits']]}
                                                disabled={key === 'splits'}
                                                onChange={(e) => {
                                                    setFeatureLimits(
                                                        (prev) =>
                                                            ({
                                                                ...prev,
                                                                [key]: e.target.valueAsNumber,
                                                            } as any)
                                                    );
                                                }}
                                            />
                                        </div>
                                    )
                                )
                                .filter(Boolean)}
                        </div>

                        {closestGoodLookingNumberGB(data.resources.remaining.memory) > 0 &&
                            closestGoodLookingNumberGB(data.resources.remaining.disk) > 0 && (
                                <div
                                    className={'mt-4 bg-neutral-700 border border-neutral-800 shadow-inner p-4 rounded'}
                                >
                                    <Switch
                                        name={'use_gb'}
                                        label={'Use Gibibytes'}
                                        description={'Use Gibibytes instead of mebibytes for memory and disk limits.'}
                                        defaultChecked={syncSubusers}
                                        onChange={(e) => setDisplayMode(e.target.checked ? 'gb' : 'mb')}
                                        readOnly={isLoading}
                                    />
                                </div>
                            )}

                        <Dialog.Footer>
                            <Can action={'splitter.delete'}>
                                <Button.Danger
                                    disabled={isLoading}
                                    shape={Button.Shapes.IconSquare}
                                    onClick={() => {
                                        setDeleteServerAction(viewServer);
                                        setViewServer(undefined);
                                    }}
                                >
                                    <FontAwesomeIcon icon={faTrash} />
                                </Button.Danger>
                            </Can>
                            <Button.Text
                                disabled={isLoading}
                                shape={Button.Shapes.IconSquare}
                                onClick={() => window.open(`/server/${viewServer.id}`, '_blank')}
                            >
                                <FontAwesomeIcon icon={faExternalLinkSquareAlt} />
                            </Button.Text>
                            <Can action={'splitter.update'}>
                                <Button.Text
                                    disabled={isLoading}
                                    onClick={() => {
                                        setIsLoading(true);

                                        apiSyncSubusers(uuid, viewServer.uuid)
                                            .then(() => {
                                                mutate();
                                                clearFlashes('splitter');
                                            })
                                            .catch((error) => {
                                                setIsLoading(false);
                                                clearAndAddHttpError({ key: 'splitter', error });
                                            })
                                            .finally(() => setIsLoading(false));
                                    }}
                                    className={'h-12'}
                                >
                                    Sync Subusers
                                </Button.Text>
                            </Can>
                            <Can action={'splitter.update'}>
                                <Button
                                    disabled={
                                        isLoading ||
                                        !_name ||
                                        !featureLimits?.allocations ||
                                        !cpu ||
                                        cpu < data.resources.reserved.cpu ||
                                        !memory ||
                                        memory < data.resources.reserved.memory ||
                                        !disk ||
                                        disk < data.resources.reserved.disk
                                    }
                                    onClick={() => {
                                        setIsLoading(true);

                                        resizeServer(uuid, viewServer.uuid, {
                                            name: _name,
                                            description,
                                            cpu,
                                            memory,
                                            disk,
                                            feature_limits: featureLimits,
                                        })
                                            .then(() => {
                                                mutate();
                                                clearFlashes('splitter');
                                                setViewServer(undefined);
                                            })
                                            .catch((error) => {
                                                setIsLoading(false);
                                                clearAndAddHttpError({ key: 'splitter', error });
                                            })
                                            .finally(() => setIsLoading(false));
                                    }}
                                    className={'h-12'}
                                >
                                    Update Server
                                </Button>
                            </Can>
                        </Dialog.Footer>
                    </>
                )}
            </Dialog>

            <div className={'w-full flex flex-row md:flex-nowrap flex-wrap'}>
                <div
                    className={`serversplitter-resource-row mx-1 my-1 relative border-l-4 border-gray-500 bg-gray-700 p-3 rounded-md w-full flex flex-row justify-between items-center`}
                >
                    <FontAwesomeIcon size={'4x'} icon={faMicrochip} className={'w-16 h-16 ml-1 mr-2'} />
                    <div className={'flex flex-row pl-2 justify-between w-full'}>
                        <div className={'flex flex-col h-full justify-between w-full'}>
                            <div className={'flex flex-col'}>
                                <h2 className={'break-words w-auto h-auto text-xl'}>Assigned CPU</h2>
                                {data.resources.remainingDisplay.cpu === Infinity
                                    ? Infinity
                                    : data.resources.total.cpu - data.resources.remainingDisplay.cpu}{' '}
                                % / {data.resources.total.cpu} %
                            </div>
                        </div>
                    </div>
                </div>
                <div
                    className={`serversplitter-resource-row mx-1 my-1 relative border-l-4 border-gray-500 bg-gray-700 p-3 rounded-md w-full flex flex-row justify-between items-center`}
                >
                    <FontAwesomeIcon size={'4x'} icon={faMemory} className={'w-16 h-16 ml-1 mr-2'} />
                    <div className={'flex flex-row pl-2 justify-between w-full'}>
                        <div className={'flex flex-col h-full justify-between w-full'}>
                            <div className={'flex flex-col'}>
                                <h2 className={'break-words w-auto h-auto text-xl'}>Assigned Memory</h2>
                                {data.resources.total.memory - data.resources.remainingDisplay.memory} MiB /{' '}
                                {data.resources.total.memory} MiB
                            </div>
                        </div>
                    </div>
                </div>
                <div
                    className={`serversplitter-resource-row mx-1 my-1 relative border-l-4 border-gray-500 bg-gray-700 p-3 rounded-md w-full flex flex-row justify-between items-center`}
                >
                    <FontAwesomeIcon size={'4x'} icon={faHdd} className={'w-16 h-16 ml-1 mr-2'} />
                    <div className={'flex flex-row pl-2 justify-between w-full'}>
                        <div className={'flex flex-col h-full justify-between w-full'}>
                            <div className={'flex flex-col'}>
                                <h2 className={'break-words w-auto h-auto text-xl'}>Assigned Disk</h2>
                                {data.resources.remainingDisplay.disk === Infinity
                                    ? Infinity
                                    : data.resources.total.disk - data.resources.remainingDisplay.disk}{' '}
                                MiB / {data.resources.total.disk} MiB
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div
                className={`serversplitter-master-row mb-2 mx-1 mt-1 border-l-4 cursor-pointer hover:bg-gray-600 transition-all border-gray-500 bg-gray-700 p-3 rounded-md flex flex-row justify-between items-center`}
                onClick={() => history.push(`/server/${data.master.id}`)}
            >
                <FontAwesomeIcon size={'4x'} icon={faServer} className={'w-16 h-16 ml-1 mr-2'} />
                <div className={'flex flex-row pl-2 justify-between w-full'}>
                    <div className={'flex flex-col h-full justify-between w-full'}>
                        <div className={'flex flex-col'}>
                            <h2 className={'break-words w-auto h-auto text-xl'}>{data.master.name}</h2>

                            <div className={'flex flex-row flex-wrap'}>
                                <span className={'mr-3 min-w-fit'}>
                                    <FontAwesomeIcon icon={faNetworkWired} className={'mr-1'} />
                                    {data.master.allocations.find((alloc) => alloc.isDefault)?.alias ??
                                        data.master.allocations.find((alloc) => alloc.isDefault)?.ip}
                                    :{data.master.allocations.find((alloc) => alloc.isDefault)?.port}
                                </span>
                                <span className={'mr-3 min-w-fit'}>
                                    <FontAwesomeIcon icon={faMicrochip} className={'mr-1'} />
                                    {data.master.limits.cpu === 0 ? 'Infinity' : `${data.master.limits.cpu} %`}
                                </span>
                                <span className={'mr-3 min-w-fit'}>
                                    <FontAwesomeIcon icon={faMemory} className={'mr-1'} />
                                    {data.master.limits.memory === 0
                                        ? 'Infinity'
                                        : bytesToString(data.master.limits.memory * 1024 * 1024)}
                                </span>
                                <span className={'min-w-fit'}>
                                    <FontAwesomeIcon icon={faHdd} className={'mr-1'} />
                                    {data.master.limits.disk === 0
                                        ? 'Infinity'
                                        : bytesToString(data.master.limits.disk * 1024 * 1024)}
                                </span>
                            </div>

                            <p className={'text-sm text-neutral-300 break-words line-clamp-2'}>
                                {data.master.description}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className={'flex flex-row items-center'}>
                <div className={'flex-1 mx-1 my-4 border border-gray-700 border-b'} />
                <p className={'text-neutral-300 text-sm mx-2'}>Splits</p>
                <div className={'flex-1 mx-1 my-4 border border-gray-700 border-b'} />
            </div>

            <div className={'mt-2 w-full grid md:grid-cols-3 grid-cols-1 gap-2 px-1'}>
                {data.servers.map((server, i, all) => (
                    <div
                        key={i}
                        className={classNames(
                            i === all.length - 1 && all.length < data.master.featureLimits.splits && canCreate
                                ? 'md:col-span-2'
                                : 'md:col-span-3',
                            `serversplitter-server-row relative border-l-4 cursor-pointer hover:bg-gray-600 transition-all border-gray-500 bg-gray-700 p-3 rounded-md w-full flex flex-row justify-between items-center`
                        )}
                        onClick={() => setViewServer(server)}
                    >
                        <FontAwesomeIcon size={'4x'} icon={faServer} className={'w-16 h-16 ml-1 mr-2'} />
                        <div className={'flex flex-row pl-2 justify-between w-full'}>
                            <div className={'flex flex-col h-full justify-between w-full'}>
                                <div className={'flex flex-col'}>
                                    <h2 className={'break-words w-auto h-auto text-xl'}>{server.name}</h2>

                                    <div className={'flex flex-row flex-wrap'}>
                                        <span className={'mr-3 min-w-fit'}>
                                            <FontAwesomeIcon icon={faNetworkWired} className={'mr-1'} />
                                            {server.allocations.find((alloc) => alloc.isDefault)?.alias ??
                                                server.allocations.find((alloc) => alloc.isDefault)?.ip}
                                            :{server.allocations.find((alloc) => alloc.isDefault)?.port}
                                        </span>
                                        <span className={'mr-3 min-w-fit'}>
                                            <FontAwesomeIcon icon={faMicrochip} className={'mr-1'} />
                                            {server.limits.cpu === 0 ? 'Infinity' : `${server.limits.cpu} %`}
                                        </span>
                                        <span className={'mr-3 min-w-fit'}>
                                            <FontAwesomeIcon icon={faMemory} className={'mr-1'} />
                                            {server.limits.memory === 0
                                                ? 'Infinity'
                                                : bytesToString(server.limits.memory * 1024 * 1024)}
                                        </span>
                                        <span className={'min-w-fit'}>
                                            <FontAwesomeIcon icon={faHdd} className={'mr-1'} />
                                            {server.limits.disk === 0
                                                ? 'Infinity'
                                                : bytesToString(server.limits.disk * 1024 * 1024)}
                                        </span>
                                    </div>
                                    <p className={'text-sm text-neutral-300 break-words line-clamp-2'}>
                                        {server.description}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}

                {data.servers.length < data.master.featureLimits.splits && canCreate && (
                    <div
                        className={
                            'bg-gray-700 min-h-[88px] cursor-pointer hover:bg-gray-600 transition-all p-3 rounded-md w-full flex flex-row justify-center items-center'
                        }
                        onClick={() => setCreate(true)}
                    >
                        <FontAwesomeIcon icon={faPlus} />
                    </div>
                )}

                {parentId ? (
                    <p className={'md:col-span-3 text-sm text-neutral-300 mb-4 sm:mr-6 sm:mb-0'}>
                        This server is a subserver follows the same split limits as the master server,{' '}
                        {data.servers.length} of {data.master.featureLimits.splits} splits have been created.
                    </p>
                ) : (
                    <p className={'md:col-span-3 text-sm text-neutral-300 mb-4 sm:mr-6 sm:mb-0'}>
                        {data.servers.length} of {splitterLimit} splits have been created on this server.
                    </p>
                )}
            </div>
        </ServerContentBlock>
    );
}
