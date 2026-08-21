import React, { useState, useEffect } from 'react';
import { ServerContext } from '@/state/server';
import Spinner from '@/components/elements/Spinner';
import getServerNests from './api/getNests';
import updateEgg from './api/updateEgg';

export default function EggChangerBox() {
    const uuid = ServerContext.useStoreState(state => state.server?.data?.uuid);
    const [nests, setNests] = useState<any[]>([]);
    const [selectedNest, setSelectedNest] = useState<string>('');
    const [eggs, setEggs] = useState<any[]>([]);
    const [selectedEgg, setSelectedEgg] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const [reinstall, setReinstall] = useState(false);
    const [changeStartup, setChangeStartup] = useState(false);
    const [deleteFiles, setDeleteFiles] = useState(false);

    useEffect(() => {
        if (!uuid) return;
        getServerNests(uuid)
            .then(data => {
                setNests(data?.nests || []);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setError('Failed to load nests.');
                setLoading(false);
            });
    }, [uuid]);

    const handleNestChange = (nestId: string) => {
        setSelectedNest(nestId);
        const nest = nests.find(n => n.id.toString() === nestId);
        setEggs(nest?.eggs || []);
        setSelectedEgg('');
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!uuid || !selectedEgg) return;

        setError(null);
        setSuccess(null);
        setSubmitting(true);

        updateEgg(uuid, selectedEgg, changeStartup, reinstall, deleteFiles)
            .then(() => {
                setSuccess('Egg successfully changed! Reloading...');
                setSubmitting(false);
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            })
            .catch(err => {
                console.error(err);
                setError('Failed to update egg.');
                setSubmitting(false);
            });
    };

    if (!uuid || loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '2rem' }}>
                <Spinner size="large" />
            </div>
        );
    }

    return (
        <div style={{ background: '#171717', borderRadius: '0.5rem', padding: '1.5rem', marginBottom: '1.5rem', color: '#f5f5f5', border: '1px solid #262626' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Egg Changer</h2>
            <p style={{ color: '#a3a3a3', marginBottom: '1.25rem', fontSize: '0.875rem' }}>Change your server's egg, nest, and manage server files.</p>
            
            {error && (
                <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', color: '#fca5a5', borderRadius: '0.375rem', fontSize: '0.875rem' }}>
                    {error}
                </div>
            )}

            {success && (
                <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'rgba(34, 197, 94, 0.2)', border: '1px solid #22c55e', color: '#86efac', borderRadius: '0.375rem', fontSize: '0.875rem' }}>
                    {success}
                </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#d4d4d4', marginBottom: '0.375rem' }}>Select Nest</label>
                    <select
                        style={{ width: '100%', background: '#262626', border: '1px solid #404040', borderRadius: '0.375rem', padding: '0.625rem', color: '#fff', fontSize: '0.875rem' }}
                        value={selectedNest}
                        onChange={e => handleNestChange(e.target.value)}
                    >
                        <option value="">-- Select Nest --</option>
                        {nests.map(nest => (
                            <option key={nest.id} value={nest.id}>
                                {nest.name}
                            </option>
                        ))}
                    </select>
                </div>

                {selectedNest && (
                    <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#d4d4d4', marginBottom: '0.375rem' }}>Select Egg</label>
                        <select
                            style={{ width: '100%', background: '#262626', border: '1px solid #404040', borderRadius: '0.375rem', padding: '0.625rem', color: '#fff', fontSize: '0.875rem' }}
                            value={selectedEgg}
                            onChange={e => setSelectedEgg(e.target.value)}
                        >
                            <option value="">-- Select Egg --</option>
                            {eggs.map(egg => (
                                <option key={egg.id} value={egg.id}>
                                    {egg.name}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', background: 'rgba(38, 38, 38, 0.5)', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #262626' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            style={{ width: '1rem', height: '1rem', accentColor: '#2563eb' }}
                            checked={reinstall}
                            onChange={e => setReinstall(e.target.checked)}
                        />
                        <span style={{ fontSize: '0.875rem', color: '#e5e5e5' }}>Reinstall server upon changing egg</span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            style={{ width: '1rem', height: '1rem', accentColor: '#2563eb' }}
                            checked={changeStartup}
                            onChange={e => setChangeStartup(e.target.checked)}
                        />
                        <span style={{ fontSize: '0.875rem', color: '#e5e5e5' }}>Reset startup variables to default</span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            style={{ width: '1rem', height: '1rem', accentColor: '#dc2626' }}
                            checked={deleteFiles}
                            onChange={e => setDeleteFiles(e.target.checked)}
                        />
                        <span style={{ fontSize: '0.875rem', color: '#f87171', fontWeight: '500' }}>Delete all existing server files (Wipe server)</span>
                    </label>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '0.5rem' }}>
                    <button 
                        type="submit" 
                        disabled={submitting || !selectedEgg}
                        style={{ padding: '0.625rem 1.25rem', background: '#2563eb', color: '#fff', fontWeight: '500', borderRadius: '0.375rem', border: 'none', cursor: submitting || !selectedEgg ? 'not-allowed' : 'pointer', opacity: submitting || !selectedEgg ? 0.5 : 1, fontSize: '0.875rem' }}
                    >
                        {submitting ? 'Processing...' : 'Change Egg'}
                    </button>
                </div>
            </form>
        </div>
    );
}
