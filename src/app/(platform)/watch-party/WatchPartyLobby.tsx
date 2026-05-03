'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
    Users, Plus, Lock, Globe, Search, Loader2, Film,
    ArrowRight, ArrowLeft, Check, Copy, X,
} from 'lucide-react';
import type { Party } from '@/types/watch-party';

interface MovieResult {
    id: number;
    title?: string;
    name?: string;
    poster_path: string | null;
    release_date?: string;
    first_air_date?: string;
    media_type?: 'movie' | 'tv';
}

type Step = 1 | 2 | 3 | 4;

interface CreateState {
    movie: MovieResult | null;
    isPrivate: boolean;
    password: string;
    confirmPassword: string;
    roomCode: string;
}

// ── Step dots ─────────────────────────────────────────────────────────────────
function StepDots({ current, total }: { current: number; total: number }) {
    return (
        <div className="flex items-center justify-center gap-1.5">
            {Array.from({ length: total }).map((_, i) => {
                const active = i + 1 === current;
                const done   = i + 1 < current;
                const cls = active
                    ? 'w-5 h-1.5 bg-primary'
                    : done
                    ? 'w-1.5 h-1.5 bg-primary/40'
                    : 'w-1.5 h-1.5 bg-outline-variant';
                return <div key={i} className={`rounded-full transition-all duration-300 ${cls}`} />;
            })}
        </div>
    );
}

// ── Step 1: Search ────────────────────────────────────────────────────────────
function StepSearchMovie({ selected, onSelect }: { selected: MovieResult | null; onSelect: (m: MovieResult) => void }) {
    const [query,     setQuery]     = useState('');
    const [results,   setResults]   = useState<MovieResult[]>([]);
    const [searching, setSearching] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (!query.trim()) { setResults([]); return; }
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(async () => {
            setSearching(true);
            try {
                const res  = await fetch('/api/tmdb?action=search-movies&query=' + encodeURIComponent(query));
                const data = await res.json();
                setResults(data.results ?? []);
            } finally { setSearching(false); }
        }, 400);
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    }, [query]);

    return (
        <div className="flex flex-col gap-4">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant pointer-events-none" />
                <input
                    autoFocus
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Buscar película o serie..."
                    className="w-full h-10 pl-9 pr-4 rounded-full bg-surface-container-high border border-outline-variant md3-body-medium text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
                />
                {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-primary" />}
            </div>

            {results.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-64 overflow-y-auto pr-1 scrollbar-hide">
                    {results.map(m => {
                        const isSelected = selected?.id === m.id;
                        const label = m.title || m.name || '';
                        const year  = (m.release_date || m.first_air_date || '').slice(0, 4);
                        return (
                            <button
                                key={m.id}
                                onClick={() => onSelect(m)}
                                className={`relative rounded-[var(--radius-md)] overflow-hidden border-2 transition-all ${isSelected ? 'border-primary' : 'border-transparent hover:border-primary/40'}`}
                            >
                                {m.poster_path ? (
                                    <img src={`https://image.tmdb.org/t/p/w185${m.poster_path}`} alt={label} className="w-full aspect-[2/3] object-cover" />
                                ) : (
                                    <div className="w-full aspect-[2/3] bg-surface-container-high flex items-center justify-center">
                                        <Film className="w-6 h-6 text-on-surface-variant/40" />
                                    </div>
                                )}
                                {isSelected && (
                                    <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                                        <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                                            <Check className="w-3.5 h-3.5 text-on-primary" />
                                        </div>
                                    </div>
                                )}
                                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-1.5">
                                    <p className="text-white text-[10px] font-medium leading-tight line-clamp-2">{label}</p>
                                    {year && <p className="text-white/50 text-[9px]">{year}</p>}
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}

            {!searching && query.trim() && results.length === 0 && (
                <p className="text-center md3-body-small text-on-surface-variant py-4">Sin resultados para &ldquo;{query}&rdquo;</p>
            )}
            {!query.trim() && (
                <p className="text-center md3-body-small text-on-surface-variant/60 py-4">Escribe para buscar una película o serie</p>
            )}
        </div>
    );
}

// ── Step 2: Privacy ───────────────────────────────────────────────────────────
function StepPrivacy({ isPrivate, onChange }: { isPrivate: boolean; onChange: (v: boolean) => void }) {
    return (
        <div className="grid grid-cols-2 gap-3">
            {[
                { value: false, icon: Globe, label: 'Pública',  desc: 'Cualquiera puede unirse con el link' },
                { value: true,  icon: Lock,  label: 'Privada',  desc: 'Solo con contraseña' },
            ].map(({ value, icon: Icon, label, desc }) => {
                const active = isPrivate === value;
                return (
                    <button
                        key={label}
                        onClick={() => onChange(value)}
                        className={`flex flex-col items-center gap-3 p-5 rounded-[var(--radius-lg)] border-2 transition-all ${active ? 'border-primary bg-primary/8' : 'border-outline-variant hover:border-primary/40 bg-surface-container'}`}
                    >
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${active ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface-variant'}`}>
                            <Icon className="w-6 h-6" />
                        </div>
                        <div className="text-center">
                            <p className="md3-label-large text-on-surface">{label}</p>
                            <p className="md3-body-small text-on-surface-variant mt-0.5">{desc}</p>
                        </div>
                        {active && (
                            <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                <Check className="w-3 h-3 text-on-primary" />
                            </div>
                        )}
                    </button>
                );
            })}
        </div>
    );
}

// ── Step 3: Password ──────────────────────────────────────────────────────────
function StepPassword({ password, confirmPassword, onChange, onConfirmChange, error }: {
    password: string; confirmPassword: string;
    onChange: (v: string) => void; onConfirmChange: (v: string) => void; error: string;
}) {
    return (
        <div className="flex flex-col gap-3">
            <p className="md3-body-medium text-on-surface-variant">
                Elige una contraseña para tu sala privada. Los invitados la necesitarán para unirse.
            </p>
            <input autoFocus type="password" value={password} onChange={e => onChange(e.target.value)}
                placeholder="Contraseña (mín. 4 caracteres)"
                className="w-full h-10 rounded-full px-4 bg-surface-container-high border border-outline-variant md3-body-medium text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/40" />
            <input type="password" value={confirmPassword} onChange={e => onConfirmChange(e.target.value)}
                placeholder="Confirmar contraseña"
                className="w-full h-10 rounded-full px-4 bg-surface-container-high border border-outline-variant md3-body-medium text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/40" />
            {error && <p className="md3-body-small text-error">{error}</p>}
        </div>
    );
}

// ── Step 4: Share ─────────────────────────────────────────────────────────────
function StepShare({ roomCode, onEnter }: { roomCode: string; onEnter: () => void }) {
    const [copied, setCopied] = useState(false);
    const copyLink = () => {
        navigator.clipboard.writeText(window.location.origin + '/watch-party/' + roomCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
    };
    return (
        <div className="flex flex-col items-center gap-5 py-2">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="w-8 h-8 text-primary" />
            </div>
            <div className="text-center">
                <p className="md3-body-medium text-on-surface-variant mb-2">Código de sala</p>
                <p className="text-4xl font-bold tracking-[0.3em] text-on-surface font-mono">{roomCode}</p>
            </div>
            <div className="flex flex-col gap-2 w-full">
                <button onClick={copyLink}
                    className={`w-full h-10 rounded-full border md3-label-large flex items-center justify-center gap-2 transition-colors ${copied ? 'bg-[#10b981]/10 text-[#10b981] border-[#10b981]/30' : 'border-outline-variant text-on-surface hover:bg-on-surface/8'}`}>
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'Link copiado' : 'Copiar link de invitación'}
                </button>
                <button onClick={onEnter}
                    className="w-full h-10 rounded-full bg-primary text-on-primary md3-label-large flex items-center justify-center gap-2 hover:shadow-[var(--shadow-1)] transition-shadow">
                    Entrar a la sala <ArrowRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}

// ── Create Modal ──────────────────────────────────────────────────────────────
function CreatePartyModal({ onClose, onCreated }: { onClose: () => void; onCreated: (code: string) => void }) {
    const router = useRouter();
    const [step, setStep] = useState<Step>(1);
    const [state, setState] = useState<CreateState>({
        movie: null, isPrivate: false, password: '', confirmPassword: '', roomCode: '',
    });
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState('');

    const totalSteps = state.isPrivate ? 4 : 3;
    const displayStep = !state.isPrivate && step >= 3 ? step - 1 : step;

    const canAdvance = () => {
        if (step === 1) return !!state.movie;
        if (step === 3 && state.isPrivate) return state.password.length >= 4 && state.password === state.confirmPassword;
        return true;
    };

    const createParty = async () => {
        if (!state.movie) return;
        setCreating(true);
        try {
            const res = await fetch('/api/watch-party', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tmdb_id:     state.movie.id,
                    title:       state.movie.title || state.movie.name,
                    poster_path: state.movie.poster_path,
                    media_type:  state.movie.media_type ?? 'movie',
                    name:        (state.movie.title || state.movie.name || 'Sala de Cine'),
                    is_private:  state.isPrivate,
                    password:    state.isPrivate ? state.password : undefined,
                }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error ?? 'Error al crear la sala'); return; }
            setState(prev => ({ ...prev, roomCode: data.party.room_code }));
            setStep(4);
            onCreated(data.party.room_code);
        } finally { setCreating(false); }
    };

    const advance = async () => {
        setError('');
        if (step === 1) { setStep(2); return; }
        if (step === 2) { if (!state.isPrivate) { await createParty(); } else { setStep(3); } return; }
        if (step === 3 && state.isPrivate) {
            if (state.password !== state.confirmPassword) { setError('Las contraseñas no coinciden'); return; }
            await createParty();
        }
    };

    const back = () => {
        setError('');
        if (step === 3) { setStep(2); return; }
        if (step === 2) { setStep(1); }
    };

    const titles: Record<number, string> = {
        1: 'Elige una película',
        2: 'Privacidad de la sala',
        3: state.isPrivate ? 'Contraseña' : 'Compartir sala',
        4: 'Compartir sala',
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-md bg-surface rounded-[var(--radius-xl)] shadow-[var(--shadow-5)] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center gap-2 px-5 pt-5 pb-4 border-b border-outline-variant">
                    {step > 1 && step < 4 && (
                        <button onClick={back} className="w-8 h-8 rounded-full hover:bg-on-surface/8 flex items-center justify-center text-on-surface-variant transition-colors shrink-0">
                            <ArrowLeft className="w-4 h-4" />
                        </button>
                    )}
                    <p className="md3-title-medium text-on-surface flex-1">{titles[step]}</p>
                    {step < 4 && (
                        <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-on-surface/8 flex items-center justify-center text-on-surface-variant transition-colors shrink-0">
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {/* Progress */}
                <div className="pt-4 pb-1">
                    <StepDots current={displayStep} total={totalSteps} />
                </div>

                {/* Content */}
                <div className="px-5 py-4 flex-1 overflow-y-auto">
                    {step === 1 && <StepSearchMovie selected={state.movie} onSelect={m => setState(p => ({ ...p, movie: m }))} />}
                    {step === 2 && <StepPrivacy isPrivate={state.isPrivate} onChange={v => setState(p => ({ ...p, isPrivate: v }))} />}
                    {step === 3 && state.isPrivate && (
                        <StepPassword
                            password={state.password} confirmPassword={state.confirmPassword}
                            onChange={v => setState(p => ({ ...p, password: v }))}
                            onConfirmChange={v => setState(p => ({ ...p, confirmPassword: v }))}
                            error={error}
                        />
                    )}
                    {step === 4 && (
                        <StepShare
                            roomCode={state.roomCode}
                            onEnter={() => { onClose(); router.push('/watch-party/' + state.roomCode); }}
                        />
                    )}
                </div>

                {/* Footer */}
                {step < 4 && (
                    <div className="px-5 pb-5 pt-2 border-t border-outline-variant">
                        {error && step !== 3 && <p className="md3-body-small text-error mb-2">{error}</p>}
                        <button
                            onClick={advance}
                            disabled={!canAdvance() || creating}
                            className="w-full h-10 rounded-full bg-primary text-on-primary md3-label-large flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-[var(--shadow-1)] transition-all"
                        >
                            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                                step === 2 && !state.isPrivate ? <>Crear sala <ArrowRight className="w-4 h-4" /></> :
                                step === 3 ? <>Crear sala <ArrowRight className="w-4 h-4" /></> :
                                <>Siguiente <ArrowRight className="w-4 h-4" /></>
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Join with code ────────────────────────────────────────────────────────────
function JoinWithCode() {
    const router = useRouter();
    const [code,    setCode]    = useState('');
    const [pass,    setPass]    = useState('');
    const [error,   setError]   = useState('');
    const [joining, setJoining] = useState(false);

    const join = async () => {
        if (!code.trim()) return;
        setJoining(true); setError('');
        const res  = await fetch(`/api/watch-party/${code.toUpperCase()}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: pass || undefined }),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error ?? 'Error al unirse'); setJoining(false); return; }
        router.push('/watch-party/' + data.party.room_code);
    };

    return (
        <div className="bg-surface-container rounded-[var(--radius-xl)] border border-outline-variant p-5 max-w-sm">
            <h2 className="md3-title-small text-on-surface mb-4">Unirse con código</h2>
            <div className="space-y-3">
                <input
                    value={code} onChange={e => setCode(e.target.value.toUpperCase())}
                    placeholder="Código (ej: AB12CD)" maxLength={6}
                    onKeyDown={e => e.key === 'Enter' && join()}
                    className="w-full h-10 rounded-full px-4 bg-surface-container-high border border-outline-variant md3-body-medium text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 uppercase tracking-widest"
                />
                <input
                    value={pass} onChange={e => setPass(e.target.value)} type="password"
                    placeholder="Contraseña (si es privada)"
                    onKeyDown={e => e.key === 'Enter' && join()}
                    className="w-full h-10 rounded-full px-4 bg-surface-container-high border border-outline-variant md3-body-medium text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
                />
                {error && <p className="md3-body-small text-error">{error}</p>}
                <button
                    onClick={join} disabled={code.length < 4 || joining}
                    className="w-full h-10 rounded-full bg-primary text-on-primary md3-label-large flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-[var(--shadow-1)] transition-shadow"
                >
                    {joining ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Unirse <ArrowRight className="w-4 h-4" /></>}
                </button>
            </div>
        </div>
    );
}

// ── Party card ────────────────────────────────────────────────────────────────
function PartyCard({ party, onJoin, loading }: { party: Party; onJoin: () => void; loading: boolean }) {
    const count = (party.party_members as any)?.[0]?.count ?? 0;
    return (
        <div className="flex items-center gap-3 p-3 bg-surface-container rounded-[var(--radius-lg)] border border-outline-variant hover:border-primary/30 transition-colors">
            {party.poster_path ? (
                <img src={`https://image.tmdb.org/t/p/w92${party.poster_path}`} alt={party.title}
                    className="w-10 h-14 rounded-[var(--radius-md)] object-cover shrink-0" />
            ) : (
                <div className="w-10 h-14 rounded-[var(--radius-md)] bg-surface-container-high flex items-center justify-center shrink-0">
                    <Film className="w-4 h-4 text-on-surface-variant" />
                </div>
            )}
            <div className="flex-1 min-w-0">
                <p className="md3-label-large text-on-surface truncate">{party.name}</p>
                <p className="md3-body-small text-on-surface-variant truncate">{party.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                    <span className={`md3-label-small px-2 h-5 rounded-full flex items-center ${party.status === 'playing' ? 'bg-[#10b981]/15 text-[#10b981]' : 'bg-secondary-container text-on-secondary-container'}`}>
                        {party.status === 'playing' ? '● En vivo' : 'Esperando'}
                    </span>
                    <span className="md3-label-small text-on-surface-variant flex items-center gap-1">
                        <Users className="w-3 h-3" /> {count}
                    </span>
                    {party.is_private && <Lock className="w-3 h-3 text-on-surface-variant" />}
                </div>
            </div>
            <button onClick={onJoin} disabled={loading}
                className="h-8 px-4 rounded-full bg-secondary-container text-on-secondary-container md3-label-large hover:shadow-[var(--shadow-1)] transition-shadow disabled:opacity-40 shrink-0">
                Unirse
            </button>
        </div>
    );
}

// ── Main Lobby ────────────────────────────────────────────────────────────────
export default function WatchPartyLobby() {
    const router = useRouter();
    const [tab,       setTab]       = useState<'public' | 'join'>('public');
    const [parties,   setParties]   = useState<Party[]>([]);
    const [loading,   setLoading]   = useState(true);
    const [joining,   setJoining]   = useState(false);
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        fetch('/api/watch-party')
            .then(r => r.json())
            .then(d => setParties(d.parties ?? []))
            .finally(() => setLoading(false));
    }, []);

    const handleJoin = async (code: string, password?: string) => {
        setJoining(true);
        const res  = await fetch(`/api/watch-party/${code}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password }),
        });
        const data = await res.json();
        if (!res.ok) { setJoining(false); return; }
        router.push('/watch-party/' + data.party.room_code);
    };

    const tabCls = (t: typeof tab) =>
        `px-4 h-9 rounded-full md3-label-large transition-colors ${tab === t ? 'bg-secondary-container text-on-secondary-container' : 'text-on-surface-variant hover:bg-on-surface/8'}`;

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
                    onClick={() => setShowModal(true)}
                    className="ml-auto flex items-center gap-2 h-10 px-5 rounded-full bg-primary text-on-primary md3-label-large hover:shadow-[var(--shadow-1)] transition-shadow"
                >
                    <Plus className="w-4 h-4" /> Crear sala
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-6 bg-surface-container rounded-full p-1 w-fit">
                <button className={tabCls('public')} onClick={() => setTab('public')}>Salas públicas</button>
                <button className={tabCls('join')}   onClick={() => setTab('join')}>Unirse con código</button>
            </div>

            {tab === 'public' && (
                loading ? (
                    <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
                ) : parties.length === 0 ? (
                    <div className="text-center py-16 bg-surface-container rounded-[var(--radius-xl)] border border-outline-variant">
                        <Users className="w-10 h-10 text-on-surface-variant/30 mx-auto mb-3" />
                        <p className="md3-title-small text-on-surface mb-1">No hay salas públicas</p>
                        <p className="md3-body-small text-on-surface-variant mb-4">Sé el primero en crear una</p>
                        <button onClick={() => setShowModal(true)}
                            className="inline-flex items-center gap-2 h-9 px-5 rounded-full bg-primary text-on-primary md3-label-large">
                            <Plus className="w-3.5 h-3.5" /> Crear sala
                        </button>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {parties.map(p => (
                            <PartyCard key={p.id} party={p} onJoin={() => handleJoin(p.room_code)} loading={joining} />
                        ))}
                    </div>
                )
            )}

            {tab === 'join' && <JoinWithCode />}

            {showModal && (
                <CreatePartyModal
                    onClose={() => setShowModal(false)}
                    onCreated={() => {}}
                />
            )}
        </div>
    );
}
