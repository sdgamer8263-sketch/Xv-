import React, { useEffect, useMemo, useState } from 'react';
import tw from 'twin.macro';
import ServerContentBlock from '@/components/elements/ServerContentBlock';
import ContentBox from '@/components/elements/ContentBox';
import Input, { Textarea } from '@/components/elements/Input';
import Select from '@/components/elements/Select';
import SpinnerOverlay from '@/components/elements/SpinnerOverlay';
import FlashMessageRender from '@/components/FlashMessageRender';
import http, { httpErrorToHuman } from '@/api/http';
import { Actions, useStoreActions } from 'easy-peasy';
import { ApplicationStore } from '@/state';
import { ServerContext } from '@/state/server';
import { Button } from '@/components/elements/button';

type Edition = 'java' | 'bedrock';
type PropertyType = 'boolean' | 'number' | 'text' | 'select';

interface PropertyDef {
  key: string;
  label: string;
  category: string;
  type: PropertyType;
  options?: string[];
}

const FLASH_KEY = 'server:properties-manager';
const MISSING_PROPS_MESSAGE =
  'Oops, we could not find server.properties. It looks like this server is not installed correctly yet, or the file was removed.';

const JAVA_DEFS: PropertyDef[] = [
  { key: 'motd', label: 'MOTD', category: 'General', type: 'text' },
  { key: 'max-players', label: 'Max Players', category: 'General', type: 'number' },
  { key: 'gamemode', label: 'Gamemode', category: 'Gameplay', type: 'select', options: ['survival', 'creative', 'adventure', 'spectator'] },
  { key: 'difficulty', label: 'Difficulty', category: 'Gameplay', type: 'select', options: ['peaceful', 'easy', 'normal', 'hard'] },
  { key: 'hardcore', label: 'Hardcore', category: 'Gameplay', type: 'boolean' },
  { key: 'pvp', label: 'PVP', category: 'Gameplay', type: 'boolean' },
  { key: 'allow-flight', label: 'Allow Flight', category: 'Gameplay', type: 'boolean' },
  { key: 'enable-command-block', label: 'Enable Command Block', category: 'Gameplay', type: 'boolean' },
  { key: 'spawn-protection', label: 'Spawn Protection', category: 'World', type: 'number' },
  { key: 'view-distance', label: 'View Distance', category: 'Performance', type: 'number' },
  { key: 'simulation-distance', label: 'Simulation Distance', category: 'Performance', type: 'number' },
  { key: 'network-compression-threshold', label: 'Compression Threshold', category: 'Performance', type: 'number' },
  { key: 'online-mode', label: 'Online Mode', category: 'Security', type: 'boolean' },
  { key: 'enforce-whitelist', label: 'Enforce Whitelist', category: 'Security', type: 'boolean' },
  { key: 'white-list', label: 'Whitelist Enabled', category: 'Security', type: 'boolean' },
  { key: 'prevent-proxy-connections', label: 'Prevent Proxy Connections', category: 'Security', type: 'boolean' },
];

const BEDROCK_DEFS: PropertyDef[] = [
  { key: 'server-name', label: 'Server Name', category: 'General', type: 'text' },
  { key: 'max-players', label: 'Max Players', category: 'General', type: 'number' },
  { key: 'gamemode', label: 'Gamemode', category: 'Gameplay', type: 'select', options: ['survival', 'creative', 'adventure'] },
  { key: 'difficulty', label: 'Difficulty', category: 'Gameplay', type: 'select', options: ['peaceful', 'easy', 'normal', 'hard'] },
  { key: 'allow-cheats', label: 'Allow Cheats', category: 'Gameplay', type: 'boolean' },
  { key: 'force-gamemode', label: 'Force Gamemode', category: 'Gameplay', type: 'boolean' },
  { key: 'pvp', label: 'PVP', category: 'Gameplay', type: 'boolean' },
  { key: 'view-distance', label: 'View Distance', category: 'Performance', type: 'number' },
  { key: 'tick-distance', label: 'Tick Distance', category: 'Performance', type: 'number' },
  { key: 'max-threads', label: 'Max Threads', category: 'Performance', type: 'number' },
  { key: 'online-mode', label: 'Online Mode', category: 'Security', type: 'boolean' },
  { key: 'allow-list', label: 'Allow List Enabled', category: 'Security', type: 'boolean' },
  { key: 'player-idle-timeout', label: 'Player Idle Timeout', category: 'Security', type: 'number' },
];

const parseProperties = (raw: string): Record<string, string> => {
  const entries: Record<string, string> = {};

  raw.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;

    const idx = line.indexOf('=');
    if (idx === -1) return;

    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1);
    entries[key] = value;
  });

  return entries;
};

const detectEdition = (entries: Record<string, string>): Edition => {
  const keys = Object.keys(entries);
  const bedrockMarkers = ['server-name', 'allow-cheats', 'tick-distance', 'allow-list'];
  const javaMarkers = ['motd', 'enable-command-block', 'white-list', 'enforce-whitelist'];

  const bedrockHits = bedrockMarkers.filter((k) => keys.includes(k)).length;
  const javaHits = javaMarkers.filter((k) => keys.includes(k)).length;

  return bedrockHits > javaHits ? 'bedrock' : 'java';
};

const mergeBack = (raw: string, values: Record<string, string>): string => {
  const lines = raw.split(/\r?\n/);
  const seen = new Set<string>();
  const eol = raw.includes('\r\n') ? '\r\n' : '\n';

  const updated = lines.map((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return line;

    const idx = line.indexOf('=');
    if (idx === -1) return line;

    const key = line.slice(0, idx).trim();
    if (!(key in values)) return line;

    seen.add(key);
    return `${key}=${values[key]}`;
  });

  Object.keys(values).forEach((key) => {
    if (!seen.has(key)) {
      updated.push(`${key}=${values[key]}`);
    }
  });

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

export default () => {
  const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);
  const { addFlash, clearFlashes } = useStoreActions((actions: Actions<ApplicationStore>) => actions.flashes);

  const [raw, setRaw] = useState('');
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [missingPropertiesFile, setMissingPropertiesFile] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setMissingPropertiesFile(false);
    clearFlashes(FLASH_KEY);

    http
      .get(`/api/client/servers/${uuid}/files/contents`, { params: { file: 'server.properties' } })
      .then(({ data }) => {
        if (!active) return;
        const text = String(data || '');
        setRaw(text);
        setValues(parseProperties(text));
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
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [uuid]);

  const edition = useMemo(() => detectEdition(values), [values]);
  const defs = useMemo(() => (edition === 'java' ? JAVA_DEFS : BEDROCK_DEFS), [edition]);

  const knownByKey = useMemo(
    () => defs.reduce<Record<string, PropertyDef>>((acc, def) => ({ ...acc, [def.key]: def }), {}),
    [defs]
  );

  const visibleKeys = useMemo(() => {
    return Object.keys(values).sort((a, b) => a.localeCompare(b));
  }, [values]);

  const onSave = () => {
    if (saving || loading || missingPropertiesFile) return;
    clearFlashes(FLASH_KEY);
    setSaving(true);

    const merged = mergeBack(raw, values);

    http
      .post(`/api/client/servers/${uuid}/files/write`, merged, {
        params: { file: 'server.properties' },
        headers: { 'Content-Type': 'text/plain' },
      })
      .then(() => {
        setRaw(merged);
        addFlash({ key: FLASH_KEY, type: 'success', message: 'Saved server.properties successfully.' });
      })
      .catch((error) => {
        addFlash({ key: FLASH_KEY, type: 'error', message: httpErrorToHuman(error) });
      })
      .finally(() => setSaving(false));
  };

  return (
    <ServerContentBlock title={'Server Properties Manager'}>
      <SpinnerOverlay visible={loading || saving} />
      <FlashMessageRender byKey={FLASH_KEY} css={tw`mb-4`} />

      <div css={tw`grid gap-4`}>
        {missingPropertiesFile && (
          <ContentBox title={'server.properties Missing'}>
            <p css={tw`text-sm text-neutral-200`}>
              Oops. It looks like the server is not installed properly yet, or we cannot find <code>server.properties</code>.
            </p>
            <p css={tw`text-xs text-neutral-400 mt-2`}>
              Install/reinstall the server files first, then open this page again.
            </p>
          </ContentBox>
        )}

        <ContentBox title={'Mode Detection'}>
          <p css={tw`text-sm text-neutral-300`}>
            Auto detected: <strong>{edition === 'java' ? 'Java Edition' : 'Bedrock Edition'}</strong>
          </p>
        </ContentBox>

        <ContentBox title={'Properties'}>
          <div css={tw`flex justify-end mb-3`}>
            <Button type={'button'} disabled={saving || loading} onClick={onSave}>Save server.properties</Button>
          </div>
          <div css={tw`grid gap-3`}>
            {visibleKeys.map((key) => {
              const def = knownByKey[key];
              const type = def?.type || 'text';
              const label = def?.label || key;
              const value = String(values[key] ?? '');

              return (
                <div key={key} css={tw`bg-neutral-800 rounded p-3`}>
                  <p css={tw`text-sm text-neutral-100 mb-2`}>{label}</p>
                  <p css={tw`text-xs text-neutral-500 mb-2`}>{key}</p>

                  {type === 'boolean' ? (
                    <Select
                      value={value.toLowerCase() === 'true' ? 'true' : 'false'}
                      onChange={(e) => setValues((v) => ({ ...v, [key]: e.currentTarget.value }))}
                    >
                      <option value={'true'}>true</option>
                      <option value={'false'}>false</option>
                    </Select>
                  ) : type === 'select' && def?.options ? (
                    <Select value={value} onChange={(e) => setValues((v) => ({ ...v, [key]: e.currentTarget.value }))}>
                      {value && !def.options.includes(value) && (
                        <option value={value}>{value}</option>
                      )}
                      {def.options.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </Select>
                  ) : (
                    <Input
                      type={'text'}
                      inputMode={type === 'number' ? 'numeric' : undefined}
                      value={value}
                      onChange={(e) => setValues((v) => ({ ...v, [key]: String(e.currentTarget.value ?? '') }))}
                    />
                  )}
                </div>
              );
            })}

            {visibleKeys.length === 0 && (
              <p css={tw`text-sm text-neutral-400`}>No properties match your filters.</p>
            )}
          </div>
        </ContentBox>

        <ContentBox title={'Raw Preview'}>
          <Textarea readOnly rows={8} value={mergeBack(raw, values)} />
        </ContentBox>
      </div>
    </ServerContentBlock>
  );
};
