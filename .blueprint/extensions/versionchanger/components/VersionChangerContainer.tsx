import React, { useEffect, useState } from 'react';
import { ServerContext } from '@/state/server';
import ServerContentBlock from '@/components/elements/ServerContentBlock';
import { Button } from '@/components/elements/button/index';
import getTypes, { MinecraftVersionProviderType } from './api/getTypes';
import Spinner from '@/components/elements/Spinner';
import Tooltip from '@/components/elements/tooltip/Tooltip';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faDownload, faExclamationTriangle, faSkull, faBoxes } from '@fortawesome/free-solid-svg-icons';
import getVersionsForType, {
    MinecraftVersionBuild,
    MinecraftVersionBuilds,
} from './api/getVersionsForType';
import getBuildsForVersionForType from './api/getBuildsForVersionForType';
import getInstalled from './api/getInstalled';
import installVersion from './api/installVersion';
import { Dialog } from '@/components/elements/dialog';
import { Alert } from '@/components/elements/alert';
import SpinnerOverlay from '@/components/elements/SpinnerOverlay';
import Select from '@/components/elements/Select';
import Switch from '@/components/elements/Switch';
import tw from 'twin.macro';

export default function VersionChangerContainer() {
    const uuid = ServerContext.useStoreState(state => state.server.data!.uuid);

    const [type, setType] = useState<string>();
    const [types, setTypes] = useState<MinecraftVersionProviderType[]>([]);
    const [installed, setInstalled] = useState<{
        build: MinecraftVersionBuild;
        latest: MinecraftVersionBuild;
    } | null>();
    const [installedType, setInstalledType] = useState<MinecraftVersionProviderType | null>();
    const [typeBuilds, setTypeBuilds] = useState<MinecraftVersionBuilds[]>();
    const [versionBuilds, setVersionBuilds] = useState<MinecraftVersionBuild[]>();
    const [selectedVersion, setSelectedVersion] = useState<MinecraftVersionBuilds>();
    const [selectedBuild, setSelectedBuild] = useState<MinecraftVersionBuild>();
    const [deleteServerFiles, setDeleteServerFiles] = useState(false);
    const [showSnapshots, setShowSnapshots] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const submit = () => {
        if (!selectedBuild) {
            return;
        }

        setIsLoading(true);

        installVersion(uuid, selectedBuild.id, deleteServerFiles)
            .then(() => {
                getInstalled(uuid)
                    .then(setInstalled)
                    .catch(error => {
                        console.error(error);
                    });
            })
            .catch(error => {
                console.error(error);
            })
            .finally(() => {
                setIsLoading(false);
                setType(undefined);
                setSelectedVersion(undefined);
                setSelectedBuild(undefined);
            });
    };

    const filterVersion = (version: MinecraftVersionBuilds, __: number, _: any[], ignoreSnapshot = false): boolean => {
        if (ignoreSnapshot && version.type && !showSnapshots && version.type === 'SNAPSHOT') {
            return false;
        }

        if (!version.type) return true;

        return true;
    };

    useEffect(() => {
        getTypes(uuid)
            .then(setTypes)
            .catch(error => {
                console.error(error);
            });

        getInstalled(uuid)
            .then(setInstalled)
            .catch(error => {
                console.error(error);
            });
    }, []);

    useEffect(() => {
        if (!types || installed === undefined) {
            return;
        }

        if (installed === null) {
            setInstalledType(null);
        } else {
            setInstalledType(types.find(t => t.name.toUpperCase() === installed.build.type) || null);
        }
    }, [types, installed]);

    useEffect(() => {
        if (!type) {
            return;
        }

        const typeData = types.find(t => t.name === type);
        if (!typeData) {
            return;
        }

        setSelectedVersion(undefined);
        setSelectedBuild(undefined);
        setTypeBuilds(undefined);

        getVersionsForType(uuid, typeData.name).then(setTypeBuilds);
    }, [type]);

    useEffect(() => {
        if (!selectedVersion || !type) {
            return;
        }

        setVersionBuilds(undefined);
        setSelectedBuild(selectedVersion.latest);

        getBuildsForVersionForType(uuid, type, selectedVersion.version).then(setVersionBuilds);
    }, [type, selectedVersion]);

    if (!types.length || installed === undefined) {
        return <Spinner size={'large'} centered />;
    }

    return (
        <ServerContentBlock title={'Versions'}>
            <SpinnerOverlay visible={isLoading} fixed />

            <Dialog
                title={`Install ${type} ${selectedVersion?.version}`}
                open={!!selectedVersion && !isLoading}
                onClose={() => setSelectedVersion(undefined)}
            >
                <div className={'flex flex-col'}>
                    {!versionBuilds || !selectedVersion ? (
                        <div className={'flex flex-row justify-center items-center h-20'}>
                            <Spinner size={'large'} />
                        </div>
                    ) : (
                        <>
                            {versionBuilds.every(b => b.experimental) && (
                                <Alert type={'danger'} className={'mb-2'}>
                                    This version is experimental and may contain bugs or other issues. Please
                                    make sure to create a backup of your server before installing this version.
                                </Alert>
                            )}

                            <div className={'flex flex-col h-full'}>
                                {type?.toUpperCase() !== 'VANILLA' && (
                                    <Select
                                        className={'mb-6'}
                                        onChange={e =>
                                            setSelectedBuild(versionBuilds.find(b => b.id === parseInt(e.target.value)))
                                        }
                                    >
                                        {versionBuilds.map(build => (
                                            <option key={build.id} value={build.id}>
                                                Build{' '}
                                                {build.buildNumber === 1
                                                    ? build.projectVersionId ?? build.buildNumber.toString()
                                                    : build.buildNumber.toString()}{' '}
                                                [{build.experimental ? 'beta' : 'stable'}]
                                            </option>
                                        ))}
                                    </Select>
                                )}
                            </div>
                            <div>
                                <div css={tw`bg-neutral-700 border border-neutral-800 shadow-inner p-4 rounded`}>
                                    <Switch
                                        name={'delete_server_files'}
                                        label={'Wipe Server Files'}
                                        description={'This will delete all files on your server before installing the new version. This cannot be undone.'}
                                        defaultChecked={deleteServerFiles}
                                        onChange={e => setDeleteServerFiles(e.target.checked)}
                                        readOnly={isLoading}
                                    />
                                </div>
                                <Button className={'mt-2 w-full'} disabled={isLoading} onClick={submit}>
                                    <FontAwesomeIcon icon={faDownload} className={'mr-1 uppercase'} />
                                    Install
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            </Dialog>

            {installed && installedType && (
                <div
                    className={`versionchanger-installed-row relative border-l-4 border-green-500 bg-gray-700 p-3 rounded-md w-full min-w-[20rem] flex flex-row justify-between items-center`}
                >
                    <img src={installedType.icon} className={'rounded object-cover w-16 h-16 mr-2'} />
                    <div className={'flex flex-row pl-2 justify-between w-full'}>
                        <div className={'flex flex-col h-full justify-between w-full'}>
                            <div className={'flex flex-col'}>
                                <h2 className={'break-words w-auto h-auto text-xl'}>
                                    Currently running {installedType.name}
                                    {installedType.experimental && (
                                        <Tooltip content={'Experimental'}>
                                            <span className={'ml-2 text-yellow-500'}>
                                                <FontAwesomeIcon icon={faExclamationTriangle} />
                                            </span>
                                        </Tooltip>
                                    )}
                                    {installedType.deprecated && (
                                        <Tooltip content={'Deprecated'}>
                                            <span className={'ml-2 text-red-500'}>
                                                <FontAwesomeIcon icon={faSkull} />
                                            </span>
                                        </Tooltip>
                                    )}
                                </h2>
                                {installed.build.versionId ? (
                                    <p>
                                        Installed Minecraft Version:{' '}
                                        {installed.build.versionId}
                                    </p>
                                ) : (
                                    <p>
                                        Installed Project Version:{' '}
                                        {installed.build.projectVersionId}
                                    </p>
                                )}
                                {installed.build.type !== 'VANILLA' && (
                                    <p>
                                        Installed Build: {
                                            installed.build.buildNumber === 1
                                                ? installed.build.projectVersionId ??
                                                    installed.build.buildNumber.toString()
                                                : installed.build.buildNumber.toString()
                                        }
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {installed && installedType && installed.build.id !== installed.latest.id && (
                <Alert
                    type={'warning'}
                    className={'mt-2'}
                >
                    Your server is currently running an outdated version of {installedType.name}{' '}
                    {installed.build.versionId ?? installed.build.projectVersionId}.
                </Alert>
            )}

            <div className={'mt-4 w-full grid grid-cols-[repeat(auto-fill,minmax(20rem,1fr))] gap-2'}>
                {!type ? (
                    <>
                        {types.map((type, i) => (
                            <div
                                key={type.name}
                                onClick={() => setType(type.name)}
                                className={`nebula-animation versionchanger-type-row relative border-l-4 ${
                                    installedType?.name === type.name ? 'border-green-500' : 'border-gray-500'
                                } bg-gray-700 cursor-pointer hover:bg-gray-600 transition-all p-3 rounded-md w-full min-w-[20rem] flex flex-row justify-between items-center`}
                            >
                                <img src={type.icon} className={'rounded object-cover w-16 h-16 mr-2'} />
                                <div className={'flex flex-row pl-2 justify-between w-full'}>
                                    <div className={'flex flex-col h-full justify-between w-full'}>
                                        <div className={'flex flex-col'}>
                                            <h2 className={'break-words w-auto h-auto text-xl'}>
                                                {type.name}
                                                {type.experimental && (
                                                    <Tooltip content={'Experimental'}>
                                                        <span className={'ml-2 text-yellow-500'}>
                                                            <FontAwesomeIcon icon={faExclamationTriangle} />
                                                        </span>
                                                    </Tooltip>
                                                )}
                                                {type.deprecated && (
                                                    <Tooltip content={'Deprecated'}>
                                                        <span className={'ml-2 text-red-500'}>
                                                            <FontAwesomeIcon icon={faSkull} />
                                                        </span>
                                                    </Tooltip>
                                                )}
                                            </h2>
                                            {type.versions.minecraft > 0 ? (
                                                <p>
                                                    {type.versions.minecraft} Minecraft versions
                                                </p>
                                            ) : (
                                                <p>
                                                    {type.versions.project} Project versions
                                                </p>
                                            )}
                                            <p>{type.builds} {type.builds === 1 ? 'Build' : 'Builds'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </>
                ) : !typeBuilds ? (
                    <span className={'col-span-full'}>
                        <Spinner size={'large'} centered />
                    </span>
                ) : (
                    <>
                        <div
                            className={`nebula-animation versionchanger-back-row border-l-4 border-gray-500 bg-gray-700 cursor-pointer hover:bg-gray-600 transition-all p-3 rounded-md w-full min-w-[20rem] flex flex-row justify-between items-center`}
                            onClick={() => setType(undefined)}
                        >
                            <span className={'w-10 h-10 mr-2 flex flex-row justify-center items-center'}>
                                <FontAwesomeIcon icon={faArrowLeft} size={'2x'} />
                            </span>
                            <div className={'flex flex-row pl-2 justify-between w-full'}>
                                <div className={'h-full w-full'}>
                                    <h2 className={'break-words w-auto h-auto'}>
                                        Go Back
                                    </h2>
                                </div>
                            </div>
                        </div>

                        {typeBuilds.some(build => build.type === 'SNAPSHOT') && (
                            <div
                                className={`nebula-animation versionchanger-snapshots-row border-l-4 ${
                                    showSnapshots ? 'border-green-500' : 'border-gray-500'
                                } bg-gray-700 cursor-pointer hover:bg-gray-600 transition-all p-3 rounded-md w-full min-w-[20rem] flex flex-row justify-between items-center`}
                                onClick={() => setShowSnapshots((v) => !v)}
                            >
                                <span className={'w-10 h-10 mr-2 flex flex-row justify-center items-center'}>
                                    <FontAwesomeIcon icon={faBoxes} size={'2x'} />
                                </span>
                                <div className={'flex flex-row pl-2 justify-between w-full'}>
                                    <div className={'h-full w-full'}>
                                        <h2 className={'break-words w-auto h-auto'}>
                                            Show Snapshot Versions
                                        </h2>
                                    </div>
                                </div>
                            </div>
                        )}

                        {typeBuilds
                            .filter((v, i, arr) => filterVersion(v, i, arr, true))
                            .map((version, i) => (
                                <div
                                    key={version.version}
                                    className={`nebula-animation versionchanger-version-row border-l-4 ${
                                        (installed?.build.versionId ?? installed?.build.projectVersionId) ===
                                            version.version && installedType?.name.toUpperCase() === version.latest.type
                                            ? 'border-green-500'
                                            : 'border-gray-500'
                                    } bg-gray-700 cursor-pointer hover:bg-gray-600 transition-all p-3 rounded-md w-full min-w-[20rem] flex flex-row justify-between items-center`}
                                    onClick={() => setSelectedVersion(version)}
                                >
                                    <img
                                        src={types.find(t => t.name === type)?.icon}
                                        className={'rounded object-cover w-10 h-10 mr-2'}
                                    />
                                    <div className={'flex flex-row pl-2 justify-between w-full'}>
                                        <div className={'h-full w-full'}>
                                            <div className={'grid grid-cols-2'}>
                                                <h2 className={'break-words w-auto h-auto text-white text-xl'}>
                                                    {version.version}
                                                    <p className={'text-gray-300 text-base -mt-1'}>{version.type}</p>
                                                </h2>
                                                <p className={'my-auto'}>
                                                    {version.builds} {version.builds === 1 ? 'Build' : 'Builds'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                    </>
                )}
            </div>
        </ServerContentBlock>
    );
}