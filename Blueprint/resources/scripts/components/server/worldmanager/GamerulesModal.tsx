import React, { useState, useEffect } from 'react';
import { Dialog } from '@/components/elements/dialog';
import { Button } from '@/components/elements/button';
import Input from '@/components/elements/Input';
import tw from 'twin.macro';
import { getGamerules, updateGamerules, ALL_GAMERULES } from './api';
import { ServerContext } from '@/state/server';
import useFlash from '@/plugins/useFlash';
import SpinnerOverlay from '@/components/elements/SpinnerOverlay';

interface Props {
    open: boolean;
    worldName: string;
    onClose: () => void;
}

const ToggleSwitch = ({
    enabled,
    onChange,
}: {
    enabled: boolean;
    onChange: (v: boolean) => void;
}) => (
    <button
        type={'button'}
        role={'switch'}
        aria-checked={enabled}
        onClick={() => onChange(!enabled)}
        style={{
            display: 'inline-flex',
            alignItems: 'center',
            width: '44px',
            height: '24px',
            borderRadius: '9999px',
            padding: '2px',
            transition: 'background-color 0.2s ease',
            backgroundColor: enabled ? '#0ea5e9' : '#525252',
            border: 'none',
            cursor: 'pointer',
            flexShrink: 0,
        }}
    >
        <span
            style={{
                display: 'block',
                width: '20px',
                height: '20px',
                borderRadius: '9999px',
                backgroundColor: '#ffffff',
                transition: 'transform 0.2s ease',
                transform: enabled ? 'translateX(20px)' : 'translateX(0)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
            }}
        />
    </button>
);

export default ({ open, worldName, onClose }: Props) => {
    const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);
    const { addFlash, clearFlashes } = useFlash();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [rules, setRules] = useState<Record<string, string>>({});
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState<'boolean' | 'integer'>('boolean');

    useEffect(() => {
        if (!open) return;
        setLoading(true);
        setSearch('');
        getGamerules(uuid, worldName)
            .then((data) => setRules(data ?? {}))
            .catch((err) => console.error(err))
            .finally(() => setLoading(false));
    }, [open, worldName, uuid]);

    const submit = () => {
        setSaving(true);
        clearFlashes('worldmanager');
        updateGamerules(uuid, worldName, rules)
            .then(() => {
                addFlash({
                    type: 'success',
                    key: 'worldmanager',
                    message: 'Gamerules sent via console. Server must be ONLINE for changes to take effect.',
                });
                onClose();
            })
            .catch((err) => {
                console.error(err);
                addFlash({
                    type: 'error',
                    key: 'worldmanager',
                    message: 'Failed to update gamerules. Is the server online?',
                });
            })
            .finally(() => setSaving(false));
    };

    const handleChange = (key: string, value: string) => {
        setRules((prev) => ({ ...prev, [key]: value }));
    };

    const filteredRules = ALL_GAMERULES.filter(
        (rule) =>
            rule.type === activeTab &&
            rule.key.toLowerCase().includes(search.toLowerCase())
    );

    const boolCount = ALL_GAMERULES.filter((r) => r.type === 'boolean').length;
    const intCount = ALL_GAMERULES.filter((r) => r.type === 'integer').length;

    return (
        <Dialog open={open} onClose={onClose} title={`Gamerules — ${worldName}`}>
            <SpinnerOverlay visible={loading || saving} />

            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    maxHeight: '60vh',
                    overflow: 'hidden',
                }}
            >
                <div style={{ flexShrink: 0 }} css={tw`pb-2 mb-2 border-b border-neutral-800`}>
                    <p css={tw`text-xs text-neutral-400 mb-3`}>
                        Changes are sent as console commands. Server must be{' '}
                        <strong>ONLINE</strong>.
                    </p>

                    <Input
                        type={'text'}
                        placeholder={'Search gamerules…'}
                        value={search}
                        onChange={(e: any) => setSearch(e.target.value)}
                        css={tw`mb-3`}
                    />

                    <div css={tw`flex space-x-1`}>
                        <button
                            type={'button'}
                            onClick={() => setActiveTab('boolean')}
                            style={{
                                padding: '6px 16px',
                                borderRadius: '6px',
                                fontSize: '13px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                border: 'none',
                                backgroundColor: activeTab === 'boolean' ? '#0ea5e9' : '#404040',
                                color: '#ffffff',
                                transition: 'background-color 0.15s',
                            }}
                        >
                            On/Off ({boolCount})
                        </button>
                        <button
                            type={'button'}
                            onClick={() => setActiveTab('integer')}
                            style={{
                                padding: '6px 16px',
                                borderRadius: '6px',
                                fontSize: '13px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                border: 'none',
                                backgroundColor: activeTab === 'integer' ? '#0ea5e9' : '#404040',
                                color: '#ffffff',
                                transition: 'background-color 0.15s',
                            }}
                        >
                            Numeric ({intCount})
                        </button>
                    </div>
                </div>

                <div
                    style={{
                        flex: '1 1 auto',
                        overflowY: 'auto',
                        overflowX: 'hidden',
                        paddingRight: '4px',
                        marginBottom: '12px',
                    }}
                >
                    <div css={tw`grid grid-cols-1 sm:grid-cols-2 gap-2`}>
                        {filteredRules.map((def) => {
                            const currentValue = rules[def.key] ?? def.default;

                            return (
                                <div
                                    key={def.key}
                                    css={tw`bg-neutral-800 rounded-lg p-3 flex items-center justify-between`}
                                >
                                    <div css={tw`flex flex-col min-w-0 mr-3`}>
                                        <span css={tw`text-sm font-semibold text-neutral-100 truncate`}>
                                            {def.key}
                                        </span>
                                        {def.description && (
                                            <span css={tw`text-xs text-neutral-500 mt-0.5 leading-tight`}>
                                                {def.description}
                                            </span>
                                        )}
                                    </div>

                                    {def.type === 'boolean' ? (
                                        <div css={tw`flex flex-col items-center flex-shrink-0`}>
                                            <ToggleSwitch
                                                enabled={currentValue === 'true'}
                                                onChange={(v) =>
                                                    handleChange(def.key, v ? 'true' : 'false')
                                                }
                                            />
                                            <span
                                                css={tw`text-xs mt-1`}
                                                style={{
                                                    color: currentValue === 'true' ? '#38bdf8' : '#737373',
                                                }}
                                            >
                                                {currentValue === 'true' ? 'ON' : 'OFF'}
                                            </span>
                                        </div>
                                    ) : (
                                        <div css={tw`flex items-center space-x-1 flex-shrink-0`}>
                                            <button
                                                type={'button'}
                                                css={tw`text-neutral-300 hover:text-neutral-100 w-6 h-6 flex items-center justify-center bg-neutral-700 hover:bg-neutral-600 rounded`}
                                                onClick={() =>
                                                    handleChange(
                                                        def.key,
                                                        String(Math.max(0, Number(currentValue) - 1))
                                                    )
                                                }
                                            >
                                                −
                                            </button>
                                            <Input
                                                type={'number'}
                                                value={currentValue}
                                                min={0}
                                                onChange={(e: any) =>
                                                    handleChange(def.key, e.target.value)
                                                }
                                                css={tw`w-20 text-sm text-center`}
                                            />
                                            <button
                                                type={'button'}
                                                css={tw`text-neutral-300 hover:text-neutral-100 w-6 h-6 flex items-center justify-center bg-neutral-700 hover:bg-neutral-600 rounded`}
                                                onClick={() =>
                                                    handleChange(
                                                        def.key,
                                                        String(Number(currentValue) + 1)
                                                    )
                                                }
                                            >
                                                +
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {filteredRules.length === 0 && (
                            <p css={tw`col-span-2 text-center text-neutral-400 py-4`}>
                                No gamerules match &quot;{search}&quot;.
                            </p>
                        )}
                    </div>
                </div>
            </div>

            <Dialog.Footer>
                <Button.Text onClick={onClose}>
                    Cancel
                </Button.Text>
                <Button disabled={loading || saving} onClick={submit}>
                    Apply All
                </Button>
            </Dialog.Footer>
        </Dialog>
    );
};
