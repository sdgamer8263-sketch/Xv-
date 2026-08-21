import React, { useState } from 'react';
import { Dialog } from '@/components/elements/dialog';
import { Button } from '@/components/elements/button';
import tw from 'twin.macro';
import { getUploadUrl, decompressFile, deleteWorld } from './api';
import { ServerContext } from '@/state/server';
import useFlash from '@/plugins/useFlash';
import axios from 'axios';

interface Props {
    open: boolean;
    worldName: string;
    onClose: () => void;
    onUploaded: () => void;
}

export default ({ open, worldName, onClose, onUploaded }: Props) => {
    const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);
    const { addFlash, clearFlashes } = useFlash();

    const [file, setFile]         = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress]   = useState(0);
    const [stage, setStage] = useState<'idle' | 'uploading' | 'deleting' | 'extracting'>('idle');
    const [error, setError] = useState<string | null>(null);

    const reset = () => {
        setFile(null);
        setProgress(0);
        setError(null);
        setStage('idle');
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0] ?? null;
        setError(null);
        if (selected && !selected.name.endsWith('.zip')) {
            setError('Only .zip archives are supported.');
            setFile(null);
            return;
        }
        setFile(selected);
    };

    const submit = async () => {
        if (!file) return;

        setUploading(true);
        setProgress(0);
        clearFlashes('worldmanager');
        setError(null);

        try {
            setStage('uploading');
            const uploadUrl = await getUploadUrl(uuid);

            const formData = new FormData();
            formData.append('files', file);

            await axios.post(uploadUrl, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                onUploadProgress: (progressEvent) => {
                    if (progressEvent.total) {
                        setProgress(
                            Math.round((progressEvent.loaded * 100) / progressEvent.total)
                        );
                    }
                },
            });

            setStage('deleting');
            await deleteWorld(uuid, worldName);

            setStage('extracting');
            await decompressFile(uuid, '/', file.name);

            try {
                await deleteWorld(uuid, file.name);
            } catch {
            }

            addFlash({
                type: 'success',
                key: 'worldmanager',
                message: `"${worldName}" has been replaced with "${file.name}" successfully!`,
            });

            reset();
            onUploaded();
        } catch (err: any) {
            console.error(err);
            const message =
                err?.response?.data?.errors?.[0]?.detail ??
                err?.message ??
                'An unknown error occurred during upload.';
            setError(message);
            addFlash({ type: 'error', key: 'worldmanager', message });
        } finally {
            setUploading(false);
            setStage('idle');
        }
    };

    const stageLabel = () => {
        switch (stage) {
            case 'uploading':   return `Uploading… ${progress}%`;
            case 'deleting':    return `Removing old "${worldName}"…`;
            case 'extracting':  return 'Extracting new world…';
            default:            return 'Upload & Replace';
        }
    };

    return (
        <Dialog
            open={open}
            onClose={() => {
                if (!uploading) {
                    reset();
                    onClose();
                }
            }}
            title={'Replace World'}
            preventExternalClose={uploading}
        >
            <div css={tw`bg-neutral-800 border border-neutral-600 rounded p-3 mb-4`}>
                <p css={tw`text-sm text-neutral-300`}>
                    Warning: This will <strong>permanently delete</strong> the current{' '}
                    <code css={tw`bg-neutral-700 px-1 rounded font-mono`}>{worldName}</code>{' '}
                    folder and replace it with the contents of your uploaded zip.{' '}
                    <strong>This cannot be undone.</strong>
                </p>
            </div>

            <p css={tw`text-sm text-neutral-300 mb-3`}>
                Upload a <strong>.zip</strong> archive containing your world folder. The zip
                must include a{' '}
                <code css={tw`bg-neutral-800 px-1 rounded`}>level.dat</code> at its root or
                inside a single folder. It will replace{' '}
                <strong css={tw`text-white`}>{worldName}</strong>.
            </p>

            <input
                type={'file'}
                accept={'.zip'}
                onChange={handleFileChange}
                disabled={uploading}
                css={tw`w-full bg-neutral-800 border border-neutral-700 p-2 rounded mb-3 text-sm text-neutral-200 cursor-pointer`}
            />

            {file && !error && (
                <p css={tw`text-xs text-neutral-400 mb-3`}>
                    Selected: <strong css={tw`text-neutral-200`}>{file.name}</strong>{' '}
                    ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </p>
            )}

            {error && (
                <p css={tw`text-sm text-red-400 mb-3`}>{error}</p>
            )}

            {uploading && (
                <div css={tw`mb-4`}>
                    <div css={tw`flex justify-between text-xs text-neutral-400 mb-1`}>
                        <span>{stageLabel()}</span>
                        {stage === 'uploading' && <span>{progress}%</span>}
                    </div>
                    <div css={tw`w-full bg-neutral-700 h-2 rounded`}>
                        <div
                            css={tw`bg-primary-500 h-2 rounded transition-all duration-300`}
                            style={{ width: stage === 'uploading' ? `${progress}%` : '100%' }}
                        />
                    </div>
                </div>
            )}

            <Dialog.Footer>
                <Button.Text
                    onClick={() => { reset(); onClose(); }}
                    disabled={uploading}
                >
                    Cancel
                </Button.Text>
                <Button.Danger
                    disabled={!file || uploading}
                    onClick={submit}
                >
                    {uploading ? stageLabel() : 'Replace World'}
                </Button.Danger>
            </Dialog.Footer>
        </Dialog>
    );
};
