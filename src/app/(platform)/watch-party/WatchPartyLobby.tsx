'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
    Users, Plus, Lock, Globe, Search, Loader2, Film, Tv,
    ArrowRight, ArrowLeft, Check, Copy, X, Radio,
} from 'lucide-react';
import TitleSearchPicker, { type PickedTitle } from '@/components/features/TitleSearchPicker';
import SeasonEpisodePicker from '@/components/features/SeasonEpisodePicker';
import type { Party } from '@/types/watch-party';

type Step = 1 | 2 | 3 | 4;

interface CreateState {
    movie: PickedTitle | null;
    season: number;
    episode: number;
    roomName: string;
    isPrivate: boolean;
    password: string;
    confirmPassword: string;
    roomCode: string;
}

/** El listado de salas se refresca por sondeo: la tabla parties no emite
 *  eventos de Realtime (verificado), así que postgres_changes no sirve aquí. */
const LOBBY_POLL_MS = 15_000;

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

// ── Step 2: Privacy + nombre ──────────────────────────────────────────────────
function StepPrivacy({
    isPrivate, roomName, onChange, onNameChange,
}: {
    isPrivate: boolean; roomName: string;
    onChange: (v: boolean) => void; onNameChange: (v: string) => void;
}) {
    return (
        <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
                <span className="md3-label-medium text-on-surface-variant">Nombre de la sala</span>
                <input
                    value={roomName}
                    onChange={e => onNameChange(e.target.value)}
                    maxLength={60}
                    placeholder="Ej: Viernes de terror 🍿"
                    className="w-full h-10 rounded-full px-4 bg-surface-container-high border border-outline-variant md3-body-medium text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
                />
            </label>

            <div className="grid grid-cols-2 gap-3">
                {[
                    { value: false, icon: Globe, label: 'Pública',  desc: 'Aparece en el lobby y cualquiera puede unirse' },
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
function CreatePartyModal({ onClose }: { onClose: () => void }) {
    const router = useRouter();
    const [step, setStep] = useState<Step>(1);
    const [state, setState] = useState<CreateState>({
        movie: null, season: 1, episode: 1, roomName: '',
        isPrivate: false, password: '', confirmPassword: '', roomCode: '',
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
        setError('');
        try {
            const res = await fetch('/api/watch-party', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tmdb_id:     state.movie.id,
                    title:       state.movie.title,
                    poster_path: state.movie.poster_path,
                    media_type:  state.movie.media_type,
                    season:      state.movie.media_type === 'tv' ? state.season : undefined,
                    episode:     state.movie.media_type === 'tv' ? state.episode : undefined,
                    name:        state.roomName.trim() || `Sala de ${state.movie.title}`,
                    is_private:  state.isPrivate,
                    password:    state.isPrivate ? state.password : undefined,
                }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error ?? 'Error al crear la sala'); return; }
            setState(prev => ({ ...prev, roomCode: data.party.room_code }));
            setStep(4);
        } catch {
            setError('Error de conexión al crear la sala');
        } finally {
            setCreating(false);
        }
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
        1: 'Elige qué ver',
        2: 'Configura tu sala',
        3: state.isPrivate ? 'Contraseña' : 'Compartir sala',
        4: 'Compartir sala',
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-md bg-surface rounded-[var(--radius-xl)] shadow-[var(--shadow-5)] flex flex-col overflow-hidden max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center gap-2 px-5 pt-5 pb-4 border-b border-outline-variant shrink-0">
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
                <div className="pt-4 pb-1 shrink-0">
                    <StepDots current={displayStep} total={totalSteps} />
                </div>

                {/* Content */}
                <div className="px-5 py-4 flex-1 overflow-y-auto">
                    {step === 1 && (
                        <div className="flex flex-col gap-4">
                            <TitleSearchPicker
                                selectedId={state.movie?.id ?? null}
                                onSelect={m => setState(p => ({ ...p, movie: m, season: 1, episode: 1 }))}
                            />
                            {state.movie?.media_type === 'tv' && (
                                <SeasonEpisodePicker
                                    tmdbId={state.movie.id}
                                    season={state.season}
                                    episode={state.episode}
                                    onChange={(s, e) => setState(p => ({ ...p, season: s, episode: e }))}
                                />
                            )}
                        </div>
                    )}
                    {step === 2 && (
                        <StepPrivacy
                            isPrivate={state.isPrivate}
                            roomName={state.roomName}
                            onChange={v => setState(p => ({ ...p, isPrivate: v }))}
                            onNameChange={v => setState(p => ({ ...p, roomName: v }))}
                        />
                    )}
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
                    <div className="px-5 pb-5 pt-2 border-t border-outline-variant shrink-0">
                        {error && step !== 3 && <p className="md3-body-small text-error mb-2">{error}</p>}
                        <button
                            onClick={advance}
                            disabled={!canAdvance() || creating}
                            className="w-full h-10 rounded-full bg-primary text-on-primary md3-label-large flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-[var(--shadow-1)] transition-all"
                        >
                            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                                (step === 2 && !state.isPrivate) || step === 3 ? <>Crear sala <ArrowRight className="w-4 h-4" /></> :
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
        try {
            const res  = await fetch(`/api/watch-party/${code.toUpperCase()}`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: pass || undefined }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error ?? 'Error al unirse'); return; }
            router.push('/watch-party/' + data.party.room_code);
        } catch {
            setError('Error de conexión');
        } finally {
            setJoining(false);
        }
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
    const memberCount = Array.isArray(party.party_members)
        ? party.party_members[0]?.count ?? 0
        : 0;
    const isLive = party.status === 'playing';

    return (
        <div className="flex items-center gap-4 p-4 bg-surface-container rounded-xl border border-outline-variant hover:border-primary/40 transition">
            {party.poster_path ? (
                <Image
                    src={`https://image.tmdb.org/t/p/w92${party.poster_path}`}
                    alt={party.title}
                    width={64}
                    height={96}
                    className="rounded-lg object-cover"
                />
            ) : (
                <div className="w-16 h-24 rounded-lg bg-surface-container-high flex items-center justify-center shrink-0">
                    <Film className="w-6 h-6 text-on-surface-variant/40" />
                </div>
            )}
            <div className="flex-1 min-w-0">
                <p className="font-medium text-on-surface truncate">{party.name}</p>
                <p className="text-sm text-on-surface-variant truncate flex items-center gap-1.5">
                    {party.media_type === 'tv' ? <Tv className="w-3 h-3 shrink-0" /> : <Film className="w-3 h-3 shrink-0" />}
                    {party.title}
                    {party.media_type === 'tv' && party.season != null && ` · T${party.season}E${party.episode ?? 1}`}
                </p>
                <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${
                        isLive ? 'bg-[#10b981]/10 text-[#10b981]' : 'bg-secondary-container text-on-secondary-container'
                    }`}>
                        {isLive && <Radio className="w-2.5 h-2.5 animate-pulse" />}
                        {isLive ? 'En vivo' : 'Esperando'}
                    </span>
                    <span className="text-xs text-on-surface-variant flex items-center gap-1">
                        <Users className="w-3 h-3" /> {memberCount}
                    </span>
                    {party.is_private && <Lock className="w-3 h-3 text-yellow-500" />}
                </div>
            </div>
            <button onClick={onJoin} disabled={loading}
                className="px-4 py-2 rounded-full bg-primary text-on-primary font-medium hover:shadow-md disabled:opacity-50 transition">
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
    const [search,    setSearch]    = useState('');
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const loadParties = async () => {
        try {
            const r = await fetch('/api/watch-party');
            const d = await r.json();
            setParties(d.parties ?? []);
        } catch (err) {
            console.error('Error cargando salas:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void loadParties();
        // Sondeo + refresco al volver el foco a la pestaña.
        pollRef.current = setInterval(loadParties, LOBBY_POLL_MS);
        const onFocus = () => { void loadParties(); };
        window.addEventListener('focus', onFocus);
        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
            window.removeEventListener('focus', onFocus);
        };
    }, []);

    const handleJoin = async (code: string, password?: string) => {
        setJoining(true);
        try {
            const res  = await fetch(`/api/watch-party/${code}`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password }),
            });
            const data = await res.json();
            if (!res.ok) {
                // Las salas privadas piden contraseña dentro de la propia sala.
                if (res.status === 403) { router.push('/watch-party/' + code); return; }
                alert(data.error ?? 'Error al unirse');
                return;
            }
            router.push('/watch-party/' + data.party.room_code);
        } catch {
            alert('Error de conexión');
        } finally {
            setJoining(false);
        }
    };

    const filtered = parties.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.title.toLowerCase().includes(search.toLowerCase())
    );

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
                    <p className="md3-body-small text-on-surface-variant">Ve películas y series con amigos, en sincronía y con chat</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="ml-auto flex items-center gap-2 h-10 px-5 rounded-full bg-primary text-on-primary md3-label-large hover:shadow-[var(--shadow-1)] transition-shadow"
                >
                    <Plus className="w-4 h-4" /> Crear sala
                </button>
            </div>

            {/* Tabs */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
                <div className="flex gap-1 bg-surface-container rounded-full p-1">
                    <button className={tabCls('public')} onClick={() => setTab('public')}>Salas públicas</button>
                    <button className={tabCls('join')}   onClick={() => setTab('join')}>Unirse con código</button>
                </div>
                {tab === 'public' && parties.length > 0 && (
                    <div className="relative flex-1 max-w-xs ml-auto">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Filtrar salas..."
                            className="w-full h-9 pl-9 pr-4 rounded-full bg-surface-container border border-outline-variant text-sm text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:border-primary"
                        />
                    </div>
                )}
            </div>

            {tab === 'public' && (
                loading ? (
                    <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
                ) : filtered.length === 0 ? (
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
                    <div className="space-y-3">
                        {filtered.map(p => (
                            <PartyCard key={p.id} party={p} onJoin={() => handleJoin(p.room_code)} loading={joining} />
                        ))}
                    </div>
                )
            )}

            {tab === 'join' && <JoinWithCode />}

            {showModal && <CreatePartyModal onClose={() => setShowModal(false)} />}
        </div>
    );
}
