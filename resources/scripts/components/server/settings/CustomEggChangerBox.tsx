import React, { useState, useEffect } from 'react';
import { ServerContext } from '@/state/server';
import TitledGreyBox from '@/components/elements/TitledGreyBox';
import { Button } from '@/components/elements/button/index';
import Select from '@/components/elements/Select';
import Label from '@/components/elements/Label';
import tw from 'twin.macro';
import getServerNests from '@/components/eggchanger/api/getNests';
import updateEgg from '@/components/eggchanger/api/updateEgg';

export default () => {
    const uuid = ServerContext.useStoreState(state => state.server.data!.uuid);
    const serverId = ServerContext.useStoreState(state => state.server.data!.id);
    const [nests, setNests] = useState<any[]>([]);
    const [eggs, setEggs] = useState<any[]>([]);
    const [selectedNest, setSelectedNest] = useState('');
    const [selectedEgg, setSelectedEgg] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        getServerNests(uuid).then(data => {
            setNests(data?.nests || []);
            setLoading(false);
        }).catch(err => {
            console.error(err);
            setError('Failed to load nests.');
            setLoading(false);
        });
    }, [uuid]);

    const handleNestChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const nestId = e.target.value;
        setSelectedNest(nestId);
        const nest = nests.find(n => n.id.toString() === nestId);
        setEggs(nest?.eggs || []);
        setSelectedEgg('');
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedEgg) return;
        setSubmitting(true);
        setError('');

        // Server default actions: Reinstall=true, StartupReset=true
        updateEgg(serverId, selectedEgg, true, true, false)
            .then(() => {
                setTimeout(() => window.location.reload(), 1500);
            })
            .catch(err => {
                console.error(err);
                setError('Failed to update egg. Check console.');
                setSubmitting(false);
            });
    };

    return (
        <TitledGreyBox title={'Change Server Egg'}>
            {error && <p css={tw`text-red-400 mb-4 text-sm`}>{error}</p>}
            <form onSubmit={handleSubmit}>
                <div css={tw`mb-4`}>
                    <Label>Select Nest</Label>
                    <Select value={selectedNest} onChange={handleNestChange} disabled={loading}>
                        <option value="">-- Select Nest --</option>
                        {nests.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
                    </Select>
                </div>
                
                {selectedNest && (
                    <div css={tw`mb-6`}>
                        <Label>Select Egg</Label>
                        <Select value={selectedEgg} onChange={e => setSelectedEgg(e.target.value)}>
                            <option value="">-- Select Egg --</option>
                            {eggs.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                        </Select>
                    </div>
                )}

                <p css={tw`text-xs text-neutral-400 mb-4`}>
                    Warning: Changing the egg will automatically reinstall the server and reset startup variables. Please make sure you have backups.
                </p>

                <div css={tw`flex justify-end`}>
                    <Button type="submit" color="primary" disabled={!selectedEgg || submitting || loading}>
                        {submitting ? 'Processing...' : 'Change Egg'}
                    </Button>
                </div>
            </form>
        </TitledGreyBox>
    );
};
