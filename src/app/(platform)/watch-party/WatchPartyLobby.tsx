'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Plus, Lock, Globe, Search, Loader2, Film, Tv, ArrowRight } from 'lucide-react';
import type { Party } from '@/types/watch-party';

export default function WatchPartyLobby() {
    const router = useRouter();
    const [tab, setTab]           = useState<'public' | 'join' | 'create'>('public');
    const [parties, setParties]   = useState<Party[]>([]);
    const [loading, setLoading]   = useState(true);
    const [joinCode, setJoinCode] = useState('');
    const [joinPass, setJoinPass] = useState('');
    const [joinErr,  setJoinErr]  = useState('');
    const [joining,  setJoining]  = useState(false);

    // Create form
    const [createName,    setCreateName]    = useState('');
    const [isPrivate,     setIsPrivate]     = useState(false);
    const [createPass,    setCreatePass]    = useState('');
    const [creating,      setCreating]      = useState(false);

    useEffect(() => {
        fetch('/api/watch-party')
            .then(r => r.json())
            .then(d => setParties(d.parties ?? []))
            .finally(() => setLoading(false));
    }, []);

    const handleJoin = async (code: string, password?: string) => {
        setJoining(true);
        setJoinErr('');
        const res = await fetch(`/api/watch-party/${code}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password }),
        });
        const data = await res.json();
        if (!res.ok) { setJoinErr(data.error ?? 'Error al unirse'); setJoining(false); return; }
        router.push(`/watch-party/${data.party.room_code}`);
    };

    const handleCreate = async () => {
        setCreating(true);
        // We need a movie to create a party — redirect to browse with a flag
        router.push('/browse?create_party=1');
    };

    const tabClass = (t: typeof tab) =>
        `px-4 h-9 rounded-full md3-label-large transition-colors ${
            tab === t
                ? 'bg-secondary-container text-on-secondary-container'
                : 'text-on-surface-variant hover:bg-on-surface/8'
        }`;

    return (
        <div className="max-w-3xl mx-auto py-8 px-4">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center">
                    <Users className="w-5 h-5 text-on-primary-container" />
                </div>
                <div>
                    <h1 className="md3-title-large text-on-surface">Watch Party</h1>
                    <p className="md3-body-small text-on-surface-variant">Ve películas con amigos en tiempo real</p>
                </div>
                <button
                    onClick={() => router.push('/browse?create_party=1')}
                    className="ml-auto flex items-center gap-2 h-10 px-5 rounded-full bg-primary text-on-primary md3-label-large hover:shadow-[var(--shadow-1)] transition-shadow"
                >
                    <Plus className="w-4 h-4" />
                    Crear sala
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-6 bg-surface-container rounded-full p-1 w-fit">
                <button className={tabClass('public')} onClick={() => setTab('public')}>Salas públicas</button>
                <button className={tabClass('join')}   onClick={() => setTab('join')}>Unirse con código</button>
            </div>

            {/* Public rooms */}
            {tab === 'public' && (
                <div>
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        </div>
                    ) : parties.length === 0 ? (
                        <div className="text-center py-16 bg-surface-container rounded-[var(--radius-xl)] border border-outline-variant">
                            <Users className="w-10 h-10 text-on-surface-variant/30 mx-auto mb-3" />
                            <p className="md3-title-small text-on-surface mb-1">No hay salas públicas</p>
                            <p className="md3-body-small text-on-surface-variant mb-4">Sé el primero en crear una</p>
                            <button
                                onClick={() => router.push('/browse?create_party=1')}
                                className="inline-flex items-center gap-2 h-9 px-5 rounded-full bg-primary text-on-primary md3-label-large"
                            >
                                <Plus className="w-3.5 h-3.5" /> Crear sala
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {parties.map(party => (
                                <PartyCard
                                    key={party.id}
                                    party={party}
                                    onJoin={() => handleJoin(party.room_code)}
                                    loading={joining}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Join with code */}
            {tab === 'join' && (
                <div className="bg-surface-container rounded-[var(--radius-xl)] border border-outline-variant p-6 max-w-sm">
                    <h2 className="md3-title-medium text-on-surface mb-4">Unirse con código</h2>
                    <div className="space-y-3">
                        <input
                            value={joinCode}
                            onChange={e => setJoinCode(e.target.value.toUpperCase())}
                            placeholder="Código de sala (ej: AB12CD)"
                            maxLength={6}
                            className="w-full h-10 rounded-full px-4 bg-surface-container-high border border-outline-variant md3-body-medium text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 uppercase tracking-widest"
                        />
                        <input
                            value={joinPass}
                            onChange={e => setJoinPass(e.target.value)}
                            placeholder="Contraseña (si es privada)"
                            type="password"
                            className="w-full h-10 rounded-full px-4 bg-surface-container-high border border-outline-variant md3-body-medium text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
                        />
                        {joinErr && <p className="md3-body-small text-error">{joinErr}</p>}
                        <button
                            onClick={() => handleJoin(joinCode, joinPass || undefined)}
                            disabled={joinCode.length < 4 || joining}
                            className="w-full h-10 rounded-full bg-primary text-on-primary md3-label-large flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-[var(--shadow-1)] transition-shadow"
                        >
                            {joining ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Unirse <ArrowRight className="w-4 h-4" /></>}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

function PartyCard({ party, onJoin, loading }: { party: Party; onJoin: () => void; loading: boolean }) {
    const count = (party.party_members as any)?.[0]?.count ?? 0;
    const Icon  = party.media_type === 'tv' ? Tv : Film;

    return (
        <div className="flex items-center gap-3 p-3 bg-surface-container rounded-[var(--radius-lg)] border border-outline-variant hover:border-primary/30 transition-colors">
            {party.poster_path ? (
                <img
                    src={`https://image.tmdb.org/t/p/w92${party.poster_path}`}
                    alt={party.title}
                    className="w-10 h-14 rounded-[var(--radius-md)] object-cover shrink-0"
                />
            ) : (
                <div className="w-10 h-14 rounded-[var(--radius-md)] bg-surface-container-high flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-on-surface-variant" />
                </div>
            )}
            <div className="flex-1 min-w-0">
                <p className="md3-label-large text-on-surface truncate">{party.name}</p>
                <p className="md3-body-small text-on-surface-variant truncate">{party.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                    <span className={`md3-label-small px-2 h-5 rounded-full flex items-center ${
                        party.status === 'playing' ? 'bg-[#10b981]/15 text-[#10b981]' : 'bg-secondary-container text-on-secondary-container'
                    }`}>
                        {party.status === 'playing' ? '● En vivo' : 'Esperando'}
                    </span>
                    <span className="md3-label-small text-on-surface-variant flex items-center gap-1">
                        <Users className="w-3 h-3" /> {count}
                    </span>
                    {party.is_private && <Lock className="w-3 h-3 text-on-surface-variant" />}
                </div>
            </div>
            <button
                onClick={onJoin}
                disabled={loading}
                className="h-8 px-4 rounded-full bg-secondary-container text-on-secondary-container md3-label-large hover:shadow-[var(--shadow-1)] transition-shadow disabled:opacity-40 shrink-0"
            >
                Unirse
            </button>
        </div>
    );
}
