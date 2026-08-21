import React, { useState, useEffect } from 'react';
import { Dialog } from '@/components/elements/dialog';
import { Button } from '@/components/elements/button';
import Input from '@/components/elements/Input';
import Select from '@/components/elements/Select';
import tw from 'twin.macro';
import { getWorldOptions, updateWorldOptions, renameWorld } from './api';
import { ServerContext } from '@/state/server';
import useFlash from '@/plugins/useFlash';
import SpinnerOverlay from '@/components/elements/SpinnerOverlay';

interface Props {
    open: boolean;
    worldName: string;
    onClose: () => void;
    onRenamed?: (newName: string) => void;
}

export default ({ open, worldName, onClose, onRenamed }: Props) => {
    const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);
    const { addFlash, clearFlashes } = useFlash();

    const [loading, setLoading]   = useState(true);
    const [saving, setSaving]     = useState(false);
    const [renaming, setRenaming] = useState(false);

    const [newFolderName, setNewFolderName] = useState('');

    const [levelSeed, setLevelSeed]                   = useState('');
    const [generatorSettings, setGeneratorSettings]   = useState('');
    const [levelType, setLevelType]                   = useState('DEFAULT');
    const [generateStructures, setGenerateStructures] = useState(true);
    const [hardcore, setHardcore]                     = useState(false);
    const [difficulty, setDifficulty]                 = useState('easy');

    useEffect(() => {
        if (!open) return;
        setLoading(true);
        setNewFolderName(worldName);
        getWorldOptions(uuid, worldName)
            .then((data) => {
                setLevelSeed(data['level-seed'] ?? '');
                setGeneratorSettings(data['generator-settings'] ?? '');
                setLevelType(data['level-type'] ?? 'DEFAULT');
                setGenerateStructures(
                    data['generate-structures'] === true ||
                        String(data['generate-structures']) === 'true'
                );
                setHardcore(
                    data['hardcore'] === true || String(data['hardcore']) === 'true'
                );
                setDifficulty(data['difficulty'] ?? 'easy');
            })
            .catch((err) => console.error(err))
            .finally(() => setLoading(false));
    }, [open, worldName, uuid]);

    const handleRename = () => {
        const trimmed = newFolderName.trim();
        if (!trimmed || trimmed === worldName) return;
        setRenaming(true);
        clearFlashes('worldmanager');
        renameWorld(uuid, worldName, trimmed)
            .then(() => {
                addFlash({
                    type: 'success',
                    key: 'worldmanager',
                    message: `World folder renamed to "${trimmed}" successfully.`,
                });
                if (onRenamed) onRenamed(trimmed);
                onClose();
            })
            .catch((err) => {
                console.error(err);
                addFlash({
                    type: 'error',
                    key: 'worldmanager',
                    message: 'Failed to rename world folder.',
                });
            })
            .finally(() => setRenaming(false));
    };

    const submit = () => {
        setSaving(true);
        clearFlashes('worldmanager');
        updateWorldOptions(uuid, worldName, {
            'level-seed': levelSeed,
            'generator-settings': generatorSettings,
            'level-type': levelType,
            'generate-structures': generateStructures,
            hardcore,
            difficulty,
        })
            .then(() => {
                addFlash({
                    type: 'success',
                    key: 'worldmanager',
                    message:
                        'World options saved to server.properties. Restart the server for changes to take effect.',
                });
                onClose();
            })
            .catch((err) => {
                console.error(err);
                addFlash({
                    type: 'error',
                    key: 'worldmanager',
                    message: 'Failed to save world options.',
                });
            })
            .finally(() => setSaving(false));
    };

    const Toggle = ({
        label,
        value,
        onChange,
    }: {
        label: string;
        value: boolean;
        onChange: (v: boolean) => void;
    }) => (
        <label css={tw`flex items-center space-x-2 text-sm text-neutral-300 cursor-pointer`}>
            <button
                type={'button'}
                onClick={() => onChange(!value)}
                css={[
                    tw`w-8 h-8 rounded flex items-center justify-center font-bold text-white text-lg`,
                    value
                        ? tw`bg-green-600 hover:bg-green-500`
                        : tw`bg-red-600 hover:bg-red-500`,
                ]}
            >
                {value ? '✓' : '✗'}
            </button>
            <span>{label}</span>
        </label>
    );

    return (
        <Dialog open={open} onClose={onClose} title={`Options: ${worldName}`}>
            <SpinnerOverlay visible={loading || saving || renaming} />

            <div css={tw`bg-neutral-800 rounded-lg p-4 mb-5`}>
                <h3 css={tw`text-sm font-semibold text-neutral-200 mb-1`}>
                    Rename Folder
                </h3>
                <p css={tw`text-xs text-neutral-500 mb-3`}>
                    Renames the folder on disk only. Does not modify server.properties.
                </p>
                <div css={tw`flex space-x-2`}>
                    <Input
                        value={newFolderName}
                        onChange={(e: any) => setNewFolderName(e.target.value)}
                        css={tw`flex-1`}
                    />
                    <Button
                        disabled={
                            !newFolderName.trim() ||
                            newFolderName.trim() === worldName ||
                            renaming
                        }
                        onClick={handleRename}
                    >
                        Rename
                    </Button>
                </div>
            </div>

            <div css={tw`grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5`}>
                {/* Seed */}
                <div>
                    <label css={tw`block text-sm text-neutral-300 mb-1`}>
                        Seed{' '}
                        <span css={tw`text-neutral-500 text-xs`}>(level-seed)</span>
                    </label>
                    <Input
                        value={levelSeed}
                        onChange={(e: any) => setLevelSeed(e.target.value)}
                        placeholder={'Leave blank for random'}
                    />
                    {levelSeed === '' && (
                        <p css={tw`text-xs text-neutral-500 mt-1`}>
                            A random seed will be chosen on next generation.
                        </p>
                    )}
                </div>

                {/* Level Type */}
                <div>
                    <label css={tw`block text-sm text-neutral-300 mb-1`}>
                        World Type{' '}
                        <span css={tw`text-neutral-500 text-xs`}>(level-type)</span>
                    </label>
                    <Select
                        value={levelType}
                        onChange={(e: any) => setLevelType(e.target.value)}
                    >
                        <option value={'DEFAULT'}>Default</option>
                        <option value={'minecraft:normal'}>Normal (1.19+)</option>
                        <option value={'FLAT'}>Flat</option>
                        <option value={'minecraft:flat'}>Flat (1.19+)</option>
                        <option value={'LARGEBIOMES'}>Large Biomes</option>
                        <option value={'AMPLIFIED'}>Amplified</option>
                        <option value={'CUSTOMIZED'}>Customised</option>
                        <option value={'BUFFET'}>Buffet</option>
                    </Select>
                </div>

                {/* Difficulty */}
                <div>
                    <label css={tw`block text-sm text-neutral-300 mb-1`}>
                        Difficulty{' '}
                        <span css={tw`text-neutral-500 text-xs`}>(difficulty)</span>
                    </label>
                    <Select
                        value={difficulty}
                        onChange={(e: any) => setDifficulty(e.target.value)}
                    >
                        <option value={'peaceful'}>Peaceful</option>
                        <option value={'easy'}>Easy</option>
                        <option value={'normal'}>Normal</option>
                        <option value={'hard'}>Hard</option>
                    </Select>
                </div>

                {/* Generator Settings JSON */}
                <div css={tw`col-span-1 sm:col-span-2`}>
                    <label css={tw`block text-sm text-neutral-300 mb-1`}>
                        Generator Settings{' '}
                        <span css={tw`text-neutral-500 text-xs`}>
                            (generator-settings — JSON, optional)
                        </span>
                    </label>
                    <Input
                        value={generatorSettings}
                        onChange={(e: any) => setGeneratorSettings(e.target.value)}
                        placeholder={'{"biome":"minecraft:plains","layers":[...]}'}
                    />
                </div>

                {/* Toggles */}
                <div css={tw`col-span-1 sm:col-span-2 flex flex-wrap gap-4`}>
                    <Toggle
                        label={'Generate Structures'}
                        value={generateStructures}
                        onChange={setGenerateStructures}
                    />
                    <Toggle
                        label={'Hardcore Mode'}
                        value={hardcore}
                        onChange={setHardcore}
                    />
                </div>
            </div>

            {/* Footer */}
            <Dialog.Footer>
                <Button.Text onClick={onClose}>
                    Cancel
                </Button.Text>
                <Button disabled={loading || saving} onClick={submit}>
                    Save Options
                </Button>
            </Dialog.Footer>
        </Dialog>
    );
};
