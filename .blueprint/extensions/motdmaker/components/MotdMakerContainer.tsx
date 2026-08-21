import React, { CSSProperties, useEffect, useMemo, useRef, useState } from 'react';
import tw from 'twin.macro';
import ServerContentBlock from '@/components/elements/ServerContentBlock';
import ContentBox from '@/components/elements/ContentBox';
import Label from '@/components/elements/Label';
import { Textarea } from '@/components/elements/Input';
import FlashMessageRender from '@/components/FlashMessageRender';
import SpinnerOverlay from '@/components/elements/SpinnerOverlay';
import { Button } from '@/components/elements/button';
import http, { httpErrorToHuman } from '@/api/http';
import { Actions, useStoreActions } from 'easy-peasy';
import { ApplicationStore } from '@/state';
import { ServerContext } from '@/state/server';

const FLASH_KEY = 'server:motd-maker';
const SECTION = String.fromCharCode(167);
const MISSING_PROPS_MESSAGE =
    'Oops, we could not find server.properties. It looks like this server is not installed correctly yet, or the file was removed.';

type Edition = 'java' | 'bedrock';

const COLOR_CODES = [
    { code: '&0', name: 'Black' },
    { code: '&1', name: 'Dark Blue' },
    { code: '&2', name: 'Dark Green' },
    { code: '&3', name: 'Dark Aqua' },
    { code: '&4', name: 'Dark Red' },
    { code: '&5', name: 'Dark Purple' },
    { code: '&6', name: 'Gold' },
    { code: '&7', name: 'Gray' },
    { code: '&8', name: 'Dark Gray' },
    { code: '&9', name: 'Blue' },
    { code: '&a', name: 'Green' },
    { code: '&b', name: 'Aqua' },
    { code: '&c', name: 'Red' },
    { code: '&d', name: 'Light Purple' },
    { code: '&e', name: 'Yellow' },
    { code: '&f', name: 'White' },
];

const STYLE_CODES = [
    { code: '&l', name: 'Bold' },
    { code: '&o', name: 'Italic' },
    { code: '&n', name: 'Underline' },
    { code: '&m', name: 'Strikethrough' },
    { code: '&r', name: 'Reset' },
];

const STATUS_PRESETS = [
    { name: 'Offline', value: '&cServer is currently offline!' },
    { name: 'Installing', value: '&eServer is installing, please wait...' },
    { name: 'Suspended', value: '&4This server is suspended' },
    { name: 'Starting', value: '&6Server is starting...' },
];

const ROTATION_PRESETS = [
    '&aWelcome to our server!',
    '&bJoin our Discord for updates',
    '&eStore: store.example.com',
];

const GRADIENT_PALETTES = [
    { name: 'Sunset', codes: ['&6', '&e', '&c', '&d'] },
    { name: 'Ocean', codes: ['&3', '&b', '&9', '&1'] },
    { name: 'Forest', codes: ['&2', '&a', '&e'] },
    { name: 'Candy', codes: ['&d', '&5', '&b'] },
];

const MC_COLOR_MAP: Record<string, string> = {
    '0': '#000000',
    '1': '#0000AA',
    '2': '#00AA00',
    '3': '#00AAAA',
    '4': '#AA0000',
    '5': '#AA00AA',
    '6': '#FFAA00',
    '7': '#AAAAAA',
    '8': '#555555',
    '9': '#5555FF',
    a: '#55FF55',
    b: '#55FFFF',
    c: '#FF5555',
    d: '#FF55FF',
    e: '#FFFF55',
    f: '#FFFFFF',
};

const parseProperties = (content: string) => {
    const result: Record<string, string> = {};

    content.split(/\r?\n/).forEach((line) => {
        if (!line || line.trim().startsWith('#')) return;
        const idx = line.indexOf('=');
        if (idx === -1) return;

        const key = line.slice(0, idx).trim();
        const value = line.slice(idx + 1);
        result[key] = value;
    });

    return result;
};

const detectEdition = (props: Record<string, string>): Edition => {
    const keys = Object.keys(props);
    const bedrockMarkers = ['server-name', 'motd2', 'allow-cheats', 'server-portv6', 'level-name'];
    const javaMarkers = ['enable-command-block', 'white-list', 'enforce-whitelist', 'simulation-distance'];

    const bedrockHits = bedrockMarkers.filter((key) => keys.includes(key)).length;
    const javaHits = javaMarkers.filter((key) => keys.includes(key)).length;

    return bedrockHits > javaHits ? 'bedrock' : 'java';
};

const decodeMotdForEditor = (motd: string) =>
    motd
        .replace(/\\u00a7/gi, '&')
        .replace(new RegExp(`${SECTION}([0-9a-fk-or])`, 'gi'), '&$1');

const encodeMotdForFile = (motd: string, edition: Edition) => {
    if (edition === 'java') {
        return motd.replace(/&([0-9a-fk-or])/gi, '\\u00A7$1');
    }

    return motd.replace(/&([0-9a-fk-or])/gi, `${SECTION}$1`);
};

const withUpdatedMotd = (content: string, motd: string) => {
    const lines = content.split(/\r?\n/);
    const eol = content.includes('\r\n') ? '\r\n' : '\n';
    let found = false;

    const updated = lines.map((line) => {
        if (line.startsWith('motd=')) {
            found = true;
            return `motd=${motd}`;
        }

        return line;
    });

    if (!found) {
        updated.push(`motd=${motd}`);
    }

    return updated.join(eol);
};

const isMissingServerPropertiesError = (error: any): boolean => {
    const status = Number(error?.response?.status || 0);
    const detail = String(
        error?.response?.data?.errors?.[0]?.detail ||
        error?.response?.data?.message ||
        error?.message ||
        ''
    ).toLowerCase();

    const fileHint = detail.includes('server.properties') || detail.includes('no such file') || detail.includes('not found');

    return (status === 404 || status === 500) && fileHint;
};

interface PreviewToken {
    text: string;
    style: CSSProperties;
}

const parsePreviewTokens = (input: string): PreviewToken[] => {
    let color = MC_COLOR_MAP.f;
    let bold = false;
    let italic = false;
    let underline = false;
    let strike = false;

    const tokens: PreviewToken[] = [];
    let chunk = '';

    const pushChunk = () => {
        if (!chunk) return;

        const decorations = [underline ? 'underline' : '', strike ? 'line-through' : ''].filter(Boolean).join(' ');

        tokens.push({
            text: chunk,
            style: {
                color,
                fontWeight: bold ? 700 : 400,
                fontStyle: italic ? 'italic' : 'normal',
                textDecoration: decorations || 'none',
            },
        });

        chunk = '';
    };

    for (let i = 0; i < input.length; i++) {
        const ch = input[i];
        const next = input[i + 1];

        if (ch === '&' && next) {
            const code = next.toLowerCase();
            if (Object.prototype.hasOwnProperty.call(MC_COLOR_MAP, code)) {
                pushChunk();
                color = MC_COLOR_MAP[code];
                bold = false;
                italic = false;
                underline = false;
                strike = false;
                i += 1;
                continue;
            }

            if (code === 'l' || code === 'o' || code === 'n' || code === 'm' || code === 'r') {
                pushChunk();
                if (code === 'l') bold = true;
                if (code === 'o') italic = true;
                if (code === 'n') underline = true;
                if (code === 'm') strike = true;
                if (code === 'r') {
                    color = MC_COLOR_MAP.f;
                    bold = false;
                    italic = false;
                    underline = false;
                    strike = false;
                }

                i += 1;
                continue;
            }
        }

        chunk += ch;
    }

    pushChunk();

    return tokens.length > 0
        ? tokens
        : [
              {
                  text: input,
                  style: { color: MC_COLOR_MAP.f },
              },
          ];
};

export default () => {
    const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);

    const [edition, setEdition] = useState<Edition>('java');
    const [motd, setMotd] = useState('');
    const [serverProperties, setServerProperties] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [missingPropertiesFile, setMissingPropertiesFile] = useState(false);
    const [gradientSource, setGradientSource] = useState('Welcome to our server');
    const [gradientPalette, setGradientPalette] = useState(GRADIENT_PALETTES[0].name);

    const { addFlash, clearFlashes } = useStoreActions((actions: Actions<ApplicationStore>) => actions.flashes);

    useEffect(() => {
        let active = true;
        clearFlashes(FLASH_KEY);
        setIsLoading(true);
        setMissingPropertiesFile(false);

        http
            .get(`/api/client/servers/${uuid}/files/contents`, { params: { file: 'server.properties' } })
            .then(({ data }) => {
                if (!active) return;

                const text = String(data || '');
                const props = parseProperties(text);
                const detectedEdition = detectEdition(props);
                const existingMotd = props.motd || 'A Minecraft Server';

                setServerProperties(text);
                setEdition(detectedEdition);
                setMotd(decodeMotdForEditor(existingMotd));
            })
            .catch((error) => {
                if (!active) return;
                if (isMissingServerPropertiesError(error)) {
                    setMissingPropertiesFile(true);
                    addFlash({ key: FLASH_KEY, type: 'error', message: MISSING_PROPS_MESSAGE });
                    return;
                }

                addFlash({ key: FLASH_KEY, type: 'error', message: httpErrorToHuman(error) });
            })
            .finally(() => {
                if (active) setIsLoading(false);
            });

        return () => {
            active = false;
        };
    }, [uuid, addFlash, clearFlashes]);

    const previewTokens = useMemo(() => parsePreviewTokens(motd), [motd]);
    const savedMotdOutput = useMemo(() => encodeMotdForFile(motd, edition), [motd, edition]);

    const insertCode = (code: string) => {
        const element = textareaRef.current;
        if (!element) {
            setMotd((value) => `${value}${code}`);
            return;
        }

        const start = element.selectionStart || 0;
        const end = element.selectionEnd || 0;

        setMotd((value) => `${value.slice(0, start)}${code}${value.slice(end)}`);

        window.requestAnimationFrame(() => {
            element.focus();
            const next = start + code.length;
            element.setSelectionRange(next, next);
        });
    };

    const applyStatusPreset = (value: string) => {
        setMotd(value);
    };

    const applyRotationPreset = () => {
        setMotd(ROTATION_PRESETS.join(' &7| '));
    };

    const applyGradientPreset = () => {
        const palette = GRADIENT_PALETTES.find((p) => p.name === gradientPalette) || GRADIENT_PALETTES[0];
        const chars = Array.from(gradientSource || '');
        if (chars.length === 0) return;

        const colored = chars
            .map((ch, index) => `${palette.codes[index % palette.codes.length]}${ch}`)
            .join('');
        setMotd(colored);
    };

    const onSave = () => {
        if (isSaving || isLoading || missingPropertiesFile) return;

        clearFlashes(FLASH_KEY);
        setIsSaving(true);

        const encodedMotd = encodeMotdForFile(motd, edition);
        const updated = withUpdatedMotd(serverProperties, encodedMotd);

        http
            .post(`/api/client/servers/${uuid}/files/write`, updated, {
                params: { file: 'server.properties' },
                headers: { 'Content-Type': 'text/plain' },
            })
            .then(() => {
                setServerProperties(updated);
                addFlash({
                    key: FLASH_KEY,
                    type: 'success',
                    message: `MOTD saved for ${edition === 'java' ? 'Java' : 'Bedrock'} server successfully.`,
                });
            })
            .catch((error) => {
                addFlash({ key: FLASH_KEY, type: 'error', message: httpErrorToHuman(error) });
            })
            .finally(() => {
                setIsSaving(false);
            });
    };

    return (
        <ServerContentBlock title={'MOTD Maker'}>
            <SpinnerOverlay visible={isLoading || isSaving} />
            <FlashMessageRender byKey={FLASH_KEY} css={tw`mb-4`} />

            <div css={tw`grid gap-4`}>
                {missingPropertiesFile && (
                    <ContentBox title={'server.properties Missing'}>
                        <p css={tw`text-sm text-neutral-200`}>
                            Oops. It looks like the server is not installed properly yet, or we cannot find <code>server.properties</code>.
                        </p>
                        <p css={tw`text-xs text-neutral-400 mt-2`}>
                            Install/reinstall the server files first, then open MOTD Maker again.
                        </p>
                    </ContentBox>
                )}

                <ContentBox title={'Server Detection'}>
                    <p css={tw`text-sm text-neutral-300`}>
                        Auto detected edition: <strong>{edition === 'java' ? 'Java' : 'Bedrock'}</strong>
                    </p>
                </ContentBox>

                <ContentBox title={'Edit MOTD'}>
                    <div css={tw`grid gap-3`}>
                        <Label>MOTD value (use & color/style codes)</Label>
                        <Textarea
                            ref={textareaRef}
                            rows={3}
                            value={motd}
                            onChange={(event) => setMotd(event.currentTarget.value)}
                            placeholder={'&aWelcome &fto my server'}
                        />

                        <div css={tw`grid gap-2`}>
                            <Label>Color Codes</Label>
                            <div css={tw`flex flex-wrap gap-2`}>
                                {COLOR_CODES.map((item) => (
                                    <Button key={item.code} type={'button'} size={'xsmall'} isSecondary onClick={() => insertCode(item.code)}>
                                        {item.code} {item.name}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        <div css={tw`grid gap-2`}>
                            <Label>Style Codes</Label>
                            <div css={tw`flex flex-wrap gap-2`}>
                                {STYLE_CODES.map((item) => (
                                    <Button key={item.code} type={'button'} size={'xsmall'} isSecondary onClick={() => insertCode(item.code)}>
                                        {item.code} {item.name}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        <div css={tw`grid gap-2`}>
                            <Label>Quick Status Presets</Label>
                            <div css={tw`flex flex-wrap gap-2`}>
                                {STATUS_PRESETS.map((preset) => (
                                    <Button key={preset.name} type={'button'} size={'xsmall'} isSecondary onClick={() => applyStatusPreset(preset.value)}>
                                        {preset.name}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        <div css={tw`grid gap-2`}>
                            <Label>Rotation Style Quick Fill</Label>
                            <div css={tw`flex gap-2 items-center flex-wrap`}>
                                <Button type={'button'} size={'xsmall'} isSecondary onClick={applyRotationPreset}>
                                    Apply Rotating-Style MOTD
                                </Button>
                                <span css={tw`text-xs text-neutral-400`}>
                                    Creates a multi-message MOTD in one line.
                                </span>
                            </div>
                        </div>

                        <div css={tw`grid gap-2`}>
                            <Label>Gradient Style Generator</Label>
                            <Textarea
                                rows={2}
                                value={gradientSource}
                                onChange={(event) => setGradientSource(event.currentTarget.value)}
                                placeholder={'Text for gradient style output'}
                            />
                            <div css={tw`flex gap-2 flex-wrap items-center`}>
                                {GRADIENT_PALETTES.map((palette) => (
                                    <Button
                                        key={palette.name}
                                        type={'button'}
                                        size={'xsmall'}
                                        isSecondary
                                        onClick={() => setGradientPalette(palette.name)}
                                    >
                                        {palette.name}
                                    </Button>
                                ))}
                                <Button type={'button'} size={'xsmall'} onClick={applyGradientPreset}>
                                    Apply Gradient Style
                                </Button>
                            </div>
                        </div>

                        <div css={tw`flex flex-wrap gap-2 justify-end`}>
                            <Button type={'button'} color={'grey'} isSecondary onClick={() => setMotd('A Minecraft Server')}>
                                Reset
                            </Button>
                            <Button type={'button'} disabled={isLoading || isSaving} onClick={onSave}>
                                Save to server.properties
                            </Button>
                        </div>
                    </div>
                </ContentBox>

                <ContentBox title={'Preview'}>
                    <div css={tw`grid gap-2`}>
                        <Label>Live formatted preview</Label>
                        <div css={tw`bg-neutral-900 border border-neutral-700 rounded p-3 text-sm leading-relaxed break-words whitespace-pre-wrap`}>
                            {previewTokens.map((token, index) => (
                                <span key={index} style={token.style}>
                                    {token.text}
                                </span>
                            ))}
                        </div>
                        <p css={tw`text-xs text-neutral-400`}>
                            Saved output value: <code>{savedMotdOutput}</code>
                        </p>
                    </div>
                </ContentBox>
            </div>
        </ServerContentBlock>
    );
};
