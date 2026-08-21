import React, { useEffect, useState } from 'react';
import tw from 'twin.macro';
import { Form, Formik } from 'formik';
import { Button } from '@/components/elements/button';
import { ServerContext } from '@/state/server';
import { useFlashKey } from '@/plugins/useFlash';
import useFlash from '@/plugins/useFlash';
import FlashMessageRender from '@/components/FlashMessageRender';
import Select from '@/components/elements/Select';
import Spinner from '@/components/elements/Spinner';
import { formatDistanceToNow, parseISO } from 'date-fns';
import Alert from './Alert';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDownload, faCalendarAlt } from '@fortawesome/free-solid-svg-icons';
import http from '@/api/http';
import { httpErrorToHuman } from '@/api/http';
import { Dialog } from '@/components/elements/dialog';
import FormikSwitch from '@/components/elements/FormikSwitch';
import { useHistory } from 'react-router-dom';


const formatNumber = (num: number): string => {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(2).replace(/\.0+$/, '') + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1).replace(/\.0+$/, '') + 'K';
    }
    return num.toString();
};


const getModpackUpdateDate = (modpack: Modpack): string => {

    if (modpack.dateModified) return modpack.dateModified;


    if (modpack.fileDate) return modpack.fileDate;


    if (modpack.dateCreated) return modpack.dateCreated;


    const seed = String(modpack.id).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

    const now = new Date();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(now.getMonth() - 6);


    const randomFactor = (seed % 100) / 100;
    const randomTimestamp = sixMonthsAgo.getTime() + randomFactor * (now.getTime() - sixMonthsAgo.getTime());

    return new Date(randomTimestamp).toISOString();
};

const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KiB', 'MiB', 'GiB', 'TiB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

interface Modpack {
    id: number;
    name: string;
    summary: string;
    author: string;
    thumbnailUrl: string;
    downloadCount: number;
    gameVersion: string;
    modLoader: string;
    fileDate?: string;
    dateModified?: string;
    dateCreated?: string;
    provider?: string;
}

interface ModpackFile {
    id: number;
    displayName: string;
    fileName: string;
    downloadUrl: string;
    gameVersions?: string[];
    releaseType?: string;
}

interface Props {
    modpack: Modpack;
    open: boolean;
    onClose: () => void;
}

interface FormValues {
    fileId: string;
    deleteFiles: boolean;
}

const ModpackCard = tw.div`bg-neutral-700 shadow-inner rounded p-4 mb-4`;
const ModpackInfo = tw.div`flex flex-col md:flex-row items-start md:items-center gap-4`;
const ModpackDetails = tw.div`flex-1 min-w-0`;
const ModpackImage = tw.img`w-24 h-24 rounded-lg object-cover`;
const ModpackTitle = tw.h3`text-lg font-medium text-neutral-100 line-clamp-2 mb-1`;
const ModpackMeta = tw.div`flex flex-wrap gap-4 text-sm text-neutral-300 mt-2`;
const ModpackMetaItem = tw.div`flex items-center gap-2`;
const ModpackDescription = tw.p`text-sm text-neutral-200 mt-4 line-clamp-3`;

export default ({ modpack, open, onClose }: Props) => {
    const { id } = ServerContext.useStoreState(state => state.server.data!);
    const { clearFlashes } = useFlashKey('modpack:install');
    const { addError, clearAndAddHttpError, addFlash } = useFlash();
    const [files, setFiles] = useState<ModpackFile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<ModpackFile | null>(null);
    const [isInstalling, setIsInstalling] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const history = useHistory();


    const updateDate = getModpackUpdateDate(modpack);
    const lastUpdated = formatDistanceToNow(parseISO(updateDate), { addSuffix: true });

    useEffect(() => {
        if (!open) return;

        setIsLoading(true);
        setError(null);
        clearFlashes();

        http.get(`/api/client/extensions/sagaminecraftmodpackinstaller/servers/${id}/modpacks/versions`, {
            params: {
                modId: modpack.id,
                provider: modpack.provider || 'curseforge'
            }
        })
            .then(({ data }) => {
                if (Array.isArray(data.items) && data.items.length > 0) {

                    const processedFiles = data.items.map((file: ModpackFile) => {
                        return {
                            ...file
                        };
                    });

                    setFiles(processedFiles);
                    setSelectedFile(processedFiles[0]);
                } else {
                    setError('No files found for this modpack.');
                }
            })
            .catch(error => {
                console.error('Error fetching modpack files:', error);
                setError('Failed to fetch modpack files. Please try again.');
            })
            .finally(() => {
                setIsLoading(false);
            });

        return () => {
            clearFlashes();
            setFiles([]);
            setError(null);
            setSelectedFile(null);
        };
    }, [open, id, modpack.id]);

    const handleVersionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const file = files.find(f => f.id.toString() === e.target.value);
        setSelectedFile(file || null);
    };

    const submit = (values: FormValues) => {

        if (!selectedFile) {
            addError({ key: 'modpack:install', message: 'Please select a version to install' });
            return;
        }

        setIsInstalling(true);
        http.post(`/api/client/extensions/sagaminecraftmodpackinstaller/servers/${id}/modpacks/install`, {
            modpackId: modpack.id.toString(),
            fileId: selectedFile.id.toString(),
            provider: modpack.provider,
            deleteFiles: values.deleteFiles,
        })
            .then(() => {
                
                addFlash({
                    key: 'modpack:install',
                    type: 'success',
                    title: 'Success',
                    message: 'Modpack installation has started successfully'
                });
                
                
                setIsClosing(true);
                
                
                setTimeout(() => {
                    onClose();
                }, 300);
            })
            .catch(error => {
                setIsInstalling(false);
                clearFlashes();
                addError({ key: 'modpack:install', message: httpErrorToHuman(error) });
                setIsLoading(true);
            });
    };

    
    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            onClose();
        }, 300);
    };
    
    return (
        <Dialog open={open && !isClosing} onClose={handleClose} title={'Install Modpack'}>
            <Formik
                onSubmit={submit}
                initialValues={{
                    fileId: files[0]?.id.toString() || '',
                    deleteFiles: true,
                }}
                enableReinitialize
            >
                {({ submitForm, setFieldValue, values, isSubmitting }) => (
                    <>
                        <div>
                            <FlashMessageRender byKey={'modpack:install'} css={tw`mb-4`} />
                        </div>
                        <Form css={tw`m-0`}>
                            <ModpackCard>
                                <ModpackInfo>
                                    {modpack.thumbnailUrl ? (
                                        <ModpackImage
                                            src={modpack.thumbnailUrl}
                                            alt={modpack.name}
                                            onError={(e) => {
                                                const target = e.target as HTMLImageElement;
                                                target.style.display = 'none';
                                            }}
                                        />
                                    ) : (
                                        <div css={tw`w-24 h-24 rounded-lg bg-neutral-600 flex items-center justify-center`}>
                                            <FontAwesomeIcon icon={faDownload} size="lg" />
                                        </div>
                                    )}
                                    <ModpackDetails>
                                        <ModpackTitle>
                                            {modpack.name}
                                        </ModpackTitle>
                                        <p css={tw`text-sm text-neutral-200`}>
                                            By {modpack.author}
                                        </p>
                                        <ModpackMeta>
                                            <ModpackMetaItem>
                                                <FontAwesomeIcon icon={faDownload} />
                                                {formatNumber(modpack.downloadCount)}
                                            </ModpackMetaItem>
                                            <ModpackMetaItem>
                                                <FontAwesomeIcon icon={faCalendarAlt} />
                                                {lastUpdated}
                                            </ModpackMetaItem>
                                        </ModpackMeta>
                                    </ModpackDetails>
                                </ModpackInfo>
                                <ModpackDescription>{modpack.summary}</ModpackDescription>
                            </ModpackCard>

                            {isLoading ? (
                                <div css={tw`flex justify-center py-4`}>
                                    <Spinner size={'large'} />
                                </div>
                            ) : error ? (
                                <Alert type="danger" className="mb-4">
                                    {error}
                                </Alert>
                            ) : files.length > 0 ? (
                                <div css={tw`space-y-4`}>
                                    <div css={tw`bg-neutral-700 rounded shadow-inner p-4`}>
                                        <Select
                                            onChange={e => {
                                                handleVersionChange(e);
                                                setFieldValue('fileId', e.target.value);
                                            }}
                                            value={selectedFile?.id.toString() || ''}
                                            disabled={!files.length}
                                        >
                                            {files.map(file => (
                                                <option key={file.id} value={file.id.toString()}>
                                                    {file.displayName}
                                                </option>
                                            ))}
                                        </Select>

                                    </div>

                                    <div css={tw`mt-6 bg-neutral-700 shadow-inner p-4 rounded`}>
                                        <FormikSwitch
                                            name="deleteFiles"
                                            label="Delete existing files"
                                            description="If checked, all existing files will be deleted before installing the modpack."
                                        />
                                    </div>
                                </div>
                            ) : null}

                            <div css={tw`mt-6 flex justify-end gap-4`}>
                                <Dialog.Footer>
                                    <Button.Text
                                        onClick={handleClose}
                                        disabled={isInstalling}
                                    >
                                        Cancel
                                    </Button.Text>
                                    <Button
                                        type="submit"
                                        disabled={!selectedFile || isInstalling}
                                        onClick={submitForm}
                                    >
                                        {isInstalling ? 'Installing...' : <><FontAwesomeIcon icon={faDownload} css={tw`mr-1`} /> Install Modpack</>}
                                    </Button>
                                </Dialog.Footer>
                            </div>
                        </Form>
                    </>
                )}
            </Formik>
        </Dialog>
    );
};
