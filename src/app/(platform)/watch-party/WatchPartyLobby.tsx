'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
    Users, Plus, Lock, Globe, Search, Loader2, Film, Tv,
    ArrowRight, ArrowLeft, Check, Copy, X, Radio, RefreshCw,
    Popcorn, MessageSquare, Sparkles,
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

/** "hace 5 min" / "hace 2 h" a partir de un ISO timestamp. */
function timeAgo(iso: string): string {
    const mins = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60_000));
    if (mins < 1) return 'ahora mismo';
    if (mins < 60) return `hace ${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `hace ${hours} h`;
    return `hace ${Math.floor(hours / 24)} d`;
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
                <Popcorn className="w-8 h-8 text-primary" />
            </div>
            <div className="text-center">
                <p className="md3-body-medium text-on-surface-variant mb-2">¡Sala lista! Comparte el código</p>
                <div className="flex justify-center gap-1.5">
                    {roomCode.split('').map((c, i) => (
                        <span key={i}
                            className="w-10 h-12 rounded-[var(--radius)] bg-surface-container-high border border-outline-variant flex items-center justify-center text-xl font-bold font-mono text-on-surface">
                            {c}
                        </span>
                    ))}
                </div>
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
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-md bg-surface rounded-t-[var(--radius-xl)] sm:rounded-[var(--radius-xl)] shadow-[var(--shadow-5)] flex flex-col overflow-hidden max-h-[92dvh] sm:max-h-[90vh]">
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

// ── Input de código segmentado (6 casillas) ──────────────────────────────────
function CodeInput({ value, onChange, onSubmit }: {
    value: string;
    onChange: (v: string) => void;
    onSubmit: () => void;
}) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [focused, setFocused] = useState(false);
    const chars = Array.from({ length: 6 }, (_, i) => value[i] ?? '');

    return (
        <div
            className="relative cursor-text"
            onClick={() => inputRef.current?.focus()}
        >
            {/* Input real (invisible): captura teclado y pegado */}
            <input
                ref={inputRef}
                value={value}
                onChange={e => onChange(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
                onKeyDown={e => { if (e.key === 'Enter' && value.length === 6) onSubmit(); }}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                className="absolute inset-0 w-full h-full opacity-0"
                autoCapitalize="characters" autoComplete="off" autoCorrect="off"
                spellCheck={false} inputMode="text"
                aria-label="Código de sala (6 caracteres)"
            />
            <div className="flex gap-1.5 pointer-events-none" aria-hidden="true">
                {chars.map((c, i) => {
                    const isCursor = focused && i === Math.min(value.length, 5) && value.length < 6;
                    return (
                        <div
                            key={i}
                            className={`flex-1 h-12 rounded-[var(--radius)] border flex items-center justify-center text-xl font-bold font-mono transition-colors ${
                                isCursor
                                    ? 'border-primary bg-primary/8 text-on-surface'
                                    : c
                                    ? 'border-outline-variant bg-surface-container-high text-on-surface'
                                    : 'border-outline-variant bg-surface-container-high/50 text-on-surface-variant/30'
                            }`}
                        >
                            {c || (isCursor ? <span className="w-0.5 h-6 bg-primary animate-pulse rounded" /> : '·')}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ── Party card ────────────────────────────────────────────────────────────────
function PartyCard({ party, onJoin, joining }: { party: Party; onJoin: () => void; joining: boolean }) {
    const memberCount = Array.isArray(party.party_members)
        ? party.party_members[0]?.count ?? 0
        : 0;
    const isLive = party.status === 'playing';

    return (
        <div className="group flex items-center gap-3.5 p-3.5 bg-surface-container rounded-[var(--radius-lg)] border border-outline-variant hover:border-primary/40 hover:shadow-[var(--shadow-2)] transition-all">
            <div className="relative shrink-0 overflow-hidden rounded-[var(--radius)]">
                {party.poster_path ? (
                    <Image
                        src={`https://image.tmdb.org/t/p/w92${party.poster_path}`}
                        alt={party.title}
                        width={56}
                        height={84}
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                ) : (
                    <div className="w-14 h-[84px] bg-surface-container-high flex items-center justify-center">
                        <Film className="w-6 h-6 text-on-surface-variant/40" />
                    </div>
                )}
                {isLive && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-1 px-1.5 py-px rounded-full bg-black/70 text-[#10b981] text-[9px] font-bold uppercase">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" /> Live
                    </span>
                )}
            </div>
            <div className="flex-1 min-w-0">
                <p className="md3-label-large text-on-surface truncate flex items-center gap-1.5">
                    <span className="truncate">{party.name}</span>
                    {party.is_private && <Lock className="w-3 h-3 text-[#f59e0b] shrink-0" />}
                </p>
                <p className="md3-body-small text-on-surface-variant truncate flex items-center gap-1.5 mt-0.5">
                    {party.media_type === 'tv' ? <Tv className="w-3 h-3 shrink-0" /> : <Film className="w-3 h-3 shrink-0" />}
                    <span className="truncate">{party.title}</span>
                    {party.media_type === 'tv' && party.season != null && <span className="shrink-0">· T{party.season}E{party.episode ?? 1}</span>}
                </p>
                <div className="flex items-center gap-2 mt-1.5">
                    <span className={`md3-label-small px-2 py-0.5 rounded-full flex items-center gap-1 ${
                        isLive ? 'bg-[#10b981]/10 text-[#10b981]' : 'bg-secondary-container text-on-secondary-container'
                    }`}>
                        {isLive && <Radio className="w-2.5 h-2.5 animate-pulse" />}
                        {isLive ? 'En vivo' : 'Esperando'}
                    </span>
                    <span className="md3-label-small text-on-surface-variant flex items-center gap-1">
                        <Users className="w-3 h-3" /> {memberCount}
                    </span>
                    <span className="md3-label-small text-on-surface-variant/60 hidden sm:inline">
                        {timeAgo(party.created_at)}
                    </span>
                </div>
            </div>
            <button onClick={onJoin} disabled={joining}
                className="h-9 px-4 rounded-full bg-primary text-on-primary md3-label-medium flex items-center gap-1.5 hover:shadow-[var(--shadow-2)] disabled:opacity-50 transition-all shrink-0">
                {joining ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <>Unirse <ArrowRight className="w-3.5 h-3.5 hidden sm:block" /></>}
            </button>
        </div>
    );
}

// ── Skeleton de tarjeta (carga) ───────────────────────────────────────────────
function PartyCardSkeleton() {
    return (
        <div className="flex items-center gap-3.5 p-3.5 bg-surface-container rounded-[var(--radius-lg)] border border-outline-variant animate-pulse">
            <div className="w-14 h-[84px] rounded-[var(--radius)] bg-surface-container-high shrink-0" />
            <div className="flex-1 space-y-2">
                <div className="h-3.5 w-2/3 rounded-full bg-surface-container-high" />
                <div className="h-3 w-1/2 rounded-full bg-surface-container-high" />
                <div className="h-3 w-1/3 rounded-full bg-surface-container-high" />
            </div>
            <div className="h-9 w-20 rounded-full bg-surface-container-high shrink-0" />
        </div>
    );
}

// ── Main Lobby ────────────────────────────────────────────────────────────────
export default function WatchPartyLobby() {
    const router = useRouter();
    const [parties,     setParties]     = useState<Party[]>([]);
    const [loading,     setLoading]     = useState(true);
    const [refreshing,  setRefreshing]  = useState(false);
    const [joiningCode, setJoiningCode] = useState<string | null>(null);
    const [showModal,   setShowModal]   = useState(false);
    const [search,      setSearch]      = useState('');
    const [code,        setCode]        = useState('');
    const [toast,       setToast]       = useState('');
    const pollRef  = useRef<ReturnType<typeof setInterval> | null>(null);
    const toastRef = useRef<ReturnType<typeof setTimeout>  | null>(null);

    const showToast = useCallback((msg: string) => {
        setToast(msg);
        if (toastRef.current) clearTimeout(toastRef.current);
        toastRef.current = setTimeout(() => setToast(''), 4000);
    }, []);

    const loadParties = useCallback(async (manual = false) => {
        if (manual) setRefreshing(true);
        try {
            const r = await fetch('/api/watch-party');
            const d = await r.json();
            setParties(d.parties ?? []);
        } catch (err) {
            console.error('Error cargando salas:', err);
        } finally {
            setLoading(false);
            if (manual) setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        void loadParties();
        // Sondeo + refresco al volver el foco a la pestaña.
        pollRef.current = setInterval(() => { void loadParties(); }, LOBBY_POLL_MS);
        const onFocus = () => { void loadParties(); };
        window.addEventListener('focus', onFocus);
        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
            if (toastRef.current) clearTimeout(toastRef.current);
            window.removeEventListener('focus', onFocus);
        };
    }, [loadParties]);

    const handleJoin = async (roomCode: string) => {
        setJoiningCode(roomCode);
        try {
            const res  = await fetch(`/api/watch-party/${roomCode}`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
            });
            const data = await res.json();
            if (!res.ok) {
                // Las salas privadas piden contraseña dentro de la propia sala.
                if (res.status === 403) { router.push('/watch-party/' + roomCode); return; }
                showToast(data.error ?? 'Error al unirse a la sala');
                return;
            }
            router.push('/watch-party/' + data.party.room_code);
        } catch {
            showToast('Error de conexión');
        } finally {
            setJoiningCode(null);
        }
    };

    const joinWithCode = () => {
        if (code.length !== 6 || joiningCode) return;
        void handleJoin(code);
    };

    const filtered = parties.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.title.toLowerCase().includes(search.toLowerCase())
    );

    const totalViewers = parties.reduce((acc, p) =>
        acc + (Array.isArray(p.party_members) ? p.party_members[0]?.count ?? 0 : 0), 0);
    const liveCount = parties.filter(p => p.status === 'playing').length;

    return (
        <div className="max-w-4xl mx-auto py-6 sm:py-8 px-4">

            {/* ── Hero ── */}
            <div className="relative overflow-hidden rounded-[var(--radius-xl)] border border-outline-variant bg-surface-container mb-6">
                {/* Decoración de fondo */}
                <div className="absolute -top-24 -right-16 w-72 h-72 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
                <div className="absolute -bottom-28 -left-16 w-72 h-72 rounded-full bg-primary/5 blur-3xl pointer-events-none" />

                <div className="relative p-5 sm:p-8 flex flex-col md:flex-row gap-6 md:items-center">
                    {/* Título + valor */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-11 h-11 rounded-[var(--radius-lg)] bg-primary-container flex items-center justify-center shrink-0">
                                <Popcorn className="w-6 h-6 text-on-primary-container" />
                            </div>
                            <h1 className="md3-headline-small font-semibold text-on-surface">Watch Party</h1>
                        </div>
                        <p className="md3-body-medium text-on-surface-variant max-w-md">
                            Películas y series con tus amigos: reproducción sincronizada,
                            chat y reacciones en tiempo real.
                        </p>

                        {/* Stats */}
                        <div className="flex flex-wrap items-center gap-2 mt-4">
                            <span className="flex items-center gap-1.5 px-2.5 h-7 rounded-full bg-surface-container-high border border-outline-variant md3-label-small text-on-surface-variant">
                                <Sparkles className="w-3 h-3 text-primary" /> {parties.length} sala{parties.length === 1 ? '' : 's'} activa{parties.length === 1 ? '' : 's'}
                            </span>
                            {liveCount > 0 && (
                                <span className="flex items-center gap-1.5 px-2.5 h-7 rounded-full bg-[#10b981]/10 md3-label-small text-[#10b981]">
                                    <Radio className="w-3 h-3 animate-pulse" /> {liveCount} en vivo
                                </span>
                            )}
                            {totalViewers > 0 && (
                                <span className="flex items-center gap-1.5 px-2.5 h-7 rounded-full bg-surface-container-high border border-outline-variant md3-label-small text-on-surface-variant">
                                    <Users className="w-3 h-3" /> {totalViewers} viendo ahora
                                </span>
                            )}
                        </div>

                        <button
                            onClick={() => setShowModal(true)}
                            className="mt-5 flex items-center gap-2 h-11 px-6 rounded-full bg-primary text-on-primary md3-label-large hover:shadow-[var(--shadow-2)] transition-shadow"
                        >
                            <Plus className="w-4 h-4" /> Crear sala
                        </button>
                    </div>

                    {/* Unirse con código */}
                    <div className="w-full md:w-72 shrink-0 bg-surface-container-low/80 backdrop-blur rounded-[var(--radius-lg)] border border-outline-variant p-4">
                        <p className="md3-label-large text-on-surface mb-1">¿Te invitaron?</p>
                        <p className="md3-body-small text-on-surface-variant mb-3">Escribe o pega el código de la sala</p>
                        <CodeInput value={code} onChange={setCode} onSubmit={joinWithCode} />
                        <button
                            onClick={joinWithCode}
                            disabled={code.length !== 6 || joiningCode === code}
                            className="mt-3 w-full h-10 rounded-full bg-primary text-on-primary md3-label-large flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-[var(--shadow-1)] transition-all"
                        >
                            {joiningCode === code ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Unirse <ArrowRight className="w-4 h-4" /></>}
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Salas públicas ── */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
                <h2 className="md3-title-medium text-on-surface flex items-center gap-2">
                    <Globe className="w-4 h-4 text-on-surface-variant" /> Salas públicas
                </h2>
                <div className="flex-1" />
                {parties.length > 0 && (
                    <div className="relative flex-1 min-w-[160px] sm:flex-none sm:w-[220px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant pointer-events-none" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Filtrar salas..."
                            className="w-full h-9 pl-9 pr-4 rounded-full bg-surface-container border border-outline-variant md3-body-small text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary"
                        />
                    </div>
                )}
                <button
                    onClick={() => loadParties(true)}
                    disabled={refreshing}
                    className="w-9 h-9 rounded-full border border-outline-variant text-on-surface-variant hover:bg-on-surface/8 flex items-center justify-center transition-colors shrink-0"
                    aria-label="Actualizar lista de salas"
                >
                    <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {loading ? (
                <div className="grid sm:grid-cols-2 gap-3">
                    <PartyCardSkeleton /><PartyCardSkeleton /><PartyCardSkeleton /><PartyCardSkeleton />
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-14 bg-surface-container rounded-[var(--radius-xl)] border border-outline-variant">
                    <div className="w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center mx-auto mb-3">
                        <MessageSquare className="w-7 h-7 text-on-surface-variant/40" />
                    </div>
                    <p className="md3-title-small text-on-surface mb-1">
                        {search ? 'Ninguna sala coincide con tu búsqueda' : 'No hay salas públicas ahora mismo'}
                    </p>
                    <p className="md3-body-small text-on-surface-variant mb-4">
                        {search ? 'Prueba con otro nombre' : 'Crea la tuya e invita a tus amigos'}
                    </p>
                    {!search && (
                        <button onClick={() => setShowModal(true)}
                            className="inline-flex items-center gap-2 h-9 px-5 rounded-full bg-primary text-on-primary md3-label-large">
                            <Plus className="w-3.5 h-3.5" /> Crear sala
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid sm:grid-cols-2 gap-3">
                    {filtered.map(p => (
                        <PartyCard
                            key={p.id}
                            party={p}
                            onJoin={() => handleJoin(p.room_code)}
                            joining={joiningCode === p.room_code}
                        />
                    ))}
                </div>
            )}

            {/* ── Toast de error ── */}
            {toast && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[90] px-4 py-2.5 rounded-full bg-error-container text-on-error-container md3-label-medium shadow-[var(--shadow-4)]">
                    {toast}
                </div>
            )}

            {showModal && <CreatePartyModal onClose={() => setShowModal(false)} />}
        </div>
    );
}
