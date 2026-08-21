import React, { useState } from 'react';
import tw from 'twin.macro';
import { WorldData, downloadWorldUrl, deleteWorld, restartServer } from './api';
import { ServerContext } from '@/state/server';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faDownload,
    faCog,
    faTrash,
    faFolder,
    faUpload,
    faSyncAlt,
    faGlobe,
    faGamepad,
} from '@fortawesome/free-solid-svg-icons';
import Button from '@/components/elements/Button';
import Modal from '@/components/elements/Modal';
import ConfirmationModal from '@/components/elements/ConfirmationModal';
import SpinnerOverlay from '@/components/elements/SpinnerOverlay';
import UploadWorldModal from './UploadWorldModal';

const bytesToString = (bytes: number): string => {
    if (!bytes || bytes <= 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

interface Props {
    world: WorldData;
    onDeleted: () => void;
    onRefresh: () => void;
    onOptionsClick: (world: string) => void;
    onGamerulesClick: (world: string) => void;
}

const WorldRow = ({ world, onDeleted, onRefresh, onOptionsClick, onGamerulesClick }: Props) => {
    const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);

    const [compressing, setCompressing]               = useState(false);
    const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
    const [deleting, setDeleting]                     = useState(false);
    const [uploadVisible, setUploadVisible]           = useState(false);
    const [generateConfirmVisible, setGenerateConfirmVisible] = useState(false);
    const [generating, setGenerating]                 = useState(false);
    const [generateChecked, setGenerateChecked]       = useState(false);
    const [generateStage, setGenerateStage]           = useState<'idle' | 'deleting' | 'restarting'>('idle');

    const onDownload = () => {
        setCompressing(true);
        downloadWorldUrl(uuid, world.name)
            .then((url) => {
                const a = document.createElement('a');
                a.href = url;
                a.target = '_blank';
                a.rel = 'noopener noreferrer';
                a.click();
            })
            .catch((err) => console.error('Failed to download world', err))
            .finally(() => setCompressing(false));
    };

    const onDelete = () => {
        setDeleting(true);
        deleteWorld(uuid, world.name)
            .then(() => onDeleted())
            .catch((err) => console.error('Failed to delete world', err))
            .finally(() => {
                setDeleting(false);
                setDeleteConfirmVisible(false);
            });
    };

    const onFilesClick = () => {
        window.location.href =
            window.location.href.replace(/\/worldmanager.*/, '') +
            `/files#/${encodeURIComponent(world.name)}`;
    };

    const onGenerate = async () => {
        setGenerating(true);
        try {
            setGenerateStage('deleting');
            await deleteWorld(uuid, world.name);
            setGenerateStage('restarting');
            await restartServer(uuid);
            setGenerateConfirmVisible(false);
            setGenerateChecked(false);
            setGenerateStage('idle');
            onRefresh();
        } catch (err) {
            console.error('Failed to regenerate world', err);
            setGenerateStage('idle');
        } finally {
            setGenerating(false);
        }
    };

    return (
        <>
            <SpinnerOverlay visible={compressing} size={'large'} />

            <ConfirmationModal
                visible={deleteConfirmVisible}
                title={'Delete World?'}
                buttonText={'Yes, delete world'}
                onConfirmed={onDelete}
                showSpinnerOverlay={deleting}
                onModalDismissed={() => setDeleteConfirmVisible(false)}
            >
                Are you sure you want to permanently delete{' '}
                <strong>{world.name}</strong>? This action{' '}
                <strong>cannot be undone</strong>.
            </ConfirmationModal>

            <Modal
                visible={generateConfirmVisible}
                onDismissed={() => {
                    if (!generating) {
                        setGenerateConfirmVisible(false);
                        setGenerateChecked(false);
                        setGenerateStage('idle');
                    }
                }}
            >
                <SpinnerOverlay visible={generating} size={'large'} />
                <h2 css={tw`text-2xl mb-2 text-neutral-100`}>Regenerate World</h2>

                <div css={tw`bg-red-900 bg-opacity-50 border border-red-500 rounded p-3 mb-4`}>
                    <p css={tw`text-sm text-neutral-200`}>
                        <strong css={tw`text-red-400`}>⚠ Warning:</strong> This will{' '}
                        <strong>permanently delete</strong> the{' '}
                        <code css={tw`bg-neutral-800 px-1 rounded font-mono`}>{world.name}</code>{' '}
                        folder and <strong>restart your server</strong>.
                        The server will generate a fresh world with a new seed on startup.
                    </p>
                    <p css={tw`text-xs text-neutral-400 mt-2`}>
                        This action <strong>cannot be undone</strong>. Download a backup first if needed.
                    </p>
                </div>

                {generating && (
                    <p css={tw`text-sm text-primary-400 mb-3`}>
                        {generateStage === 'deleting' ? '🗑️ Deleting world folder...' : '🔄 Restarting server...'}
                    </p>
                )}

                <label
                    css={tw`flex items-center space-x-3 cursor-pointer mb-4 p-3 rounded bg-neutral-800`}
                    onClick={() => !generating && setGenerateChecked(!generateChecked)}
                >
                    <div
                        style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '4px',
                            border: generateChecked ? '2px solid #ef4444' : '2px solid #525252',
                            backgroundColor: generateChecked ? '#ef4444' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            transition: 'all 0.15s ease',
                        }}
                    >
                        {generateChecked && (
                            <span style={{ color: '#fff', fontSize: '13px', fontWeight: 700 }}>✓</span>
                        )}
                    </div>
                    <span css={tw`text-sm text-neutral-300`}>
                        I understand this will <strong css={tw`text-red-400`}>delete</strong>{' '}
                        <strong>{world.name}</strong> and restart my server
                    </span>
                </label>

                <div css={tw`flex justify-end space-x-2`}>
                    <Button
                        color={'secondary'}
                        onClick={() => {
                            setGenerateConfirmVisible(false);
                            setGenerateChecked(false);
                        }}
                        disabled={generating}
                    >
                        Cancel
                    </Button>
                    <Button
                        color={'red'}
                        disabled={!generateChecked || generating}
                        onClick={onGenerate}
                    >
                        {generating
                            ? (generateStage === 'deleting' ? 'Deleting...' : 'Restarting...')
                            : 'Delete & Regenerate'
                        }
                    </Button>
                </div>
            </Modal>

            <UploadWorldModal
                visible={uploadVisible}
                worldName={world.name}
                onDismissed={() => setUploadVisible(false)}
                onUploaded={() => {
                    setUploadVisible(false);
                    onRefresh();
                }}
            />

            <div css={tw`p-4 rounded-lg bg-neutral-700 mb-3 flex items-center justify-between shadow`}>
                {/* Left: world icon + info */}
                <div css={tw`flex items-center min-w-0`}>
                    <div css={tw`w-11 h-11 rounded-full bg-neutral-600 flex items-center justify-center mr-4 flex-shrink-0`}>
                        <FontAwesomeIcon icon={faGlobe} css={tw`text-primary-400 text-lg`} />
                    </div>
                    <div css={tw`flex flex-col min-w-0`}>
                        <span css={tw`font-bold text-gray-100 text-base truncate`}>
                            {world.name}
                        </span>
                        <span css={tw`text-xs text-neutral-400 mt-0.5`}>
                            {bytesToString(world.size)}
                            {world.last_modified
                                ? ` • Modified: ${new Date(world.last_modified).toLocaleString()}`
                                : ''}
                        </span>
                    </div>
                </div>

                {/* Right: action buttons — all secondary (native Pterodactyl), delete is red */}
                <div css={tw`grid grid-cols-3 gap-1 ml-4 flex-shrink-0`}>
                    <Button
                        color={'secondary'}
                        size={'small'}
                        onClick={onDownload}
                        disabled={compressing}
                        css={tw`flex items-center justify-center space-x-1`}
                    >
                        <FontAwesomeIcon icon={faDownload} />
                        <span>Download</span>
                    </Button>

                    <Button
                        color={'secondary'}
                        size={'small'}
                        onClick={() => setUploadVisible(true)}
                        css={tw`flex items-center justify-center space-x-1`}
                    >
                        <FontAwesomeIcon icon={faUpload} />
                        <span>Upload</span>
                    </Button>

                    <Button
                        color={'secondary'}
                        size={'small'}
                        onClick={onFilesClick}
                        css={tw`flex items-center justify-center space-x-1`}
                    >
                        <FontAwesomeIcon icon={faFolder} />
                        <span>Files</span>
                    </Button>

                    <Button
                        color={'secondary'}
                        size={'small'}
                        onClick={() => onOptionsClick(world.name)}
                        css={tw`flex items-center justify-center space-x-1`}
                    >
                        <FontAwesomeIcon icon={faCog} />
                        <span>Options</span>
                    </Button>

                    <Button
                        color={'secondary'}
                        size={'small'}
                        onClick={() => onGamerulesClick(world.name)}
                        css={tw`flex items-center justify-center space-x-1`}
                    >
                        <FontAwesomeIcon icon={faGamepad} />
                        <span>Gamerules</span>
                    </Button>

                    <Button
                        color={'secondary'}
                        size={'small'}
                        onClick={() => setGenerateConfirmVisible(true)}
                        css={tw`flex items-center justify-center space-x-1`}
                    >
                        <FontAwesomeIcon icon={faSyncAlt} />
                        <span>Generate</span>
                    </Button>

                    <Button
                        color={'red'}
                        size={'small'}
                        onClick={() => setDeleteConfirmVisible(true)}
                        css={tw`col-span-3 flex items-center justify-center space-x-1`}
                    >
                        <FontAwesomeIcon icon={faTrash} />
                        <span>Delete</span>
                    </Button>
                </div>
            </div>
        </>
    );
};

export default WorldRow;
