'use client';

/**
 * Sala de Watch Party — orquestador.
 *
 * Sincronización: Supabase Broadcast + Presence (canal wp:{partyId}).
 * El host emite transiciones de reproducción (countdown/playing/paused) que
 * todos los clientes reflejan; el estado también se persiste vía API para
 * quienes entran tarde. El chat usa postgres_changes (verificado funcional).
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
    Users, Send, LogOut, Crown, Loader2, MessageSquare,
    Play, Pause, Copy, Check, Lock, Globe, X, Reply, Smile,
    RefreshCw, Film, Tv, Flag, ShieldAlert, Radio,
} from 'lucide-react';
import {
    getPartyMessages, watchPartyClient, subscribeToMessages,
} from '@/lib/watch-party';
import {
    joinRoomChannel, makeHostActions, playbackFromParty, effectivePhase,
    listenVimeusTime, formatTime, IDLE_PLAYBACK,
    type PlaybackState, type PresenceMeta, type MediaChange,
    type RoomChannel,
} from '@/lib/watch-party-sync';

/** Acciones del host envueltas para aplicar el estado localmente (void). */
interface LocalHostActions {
    startCountdown: (seconds?: number) => void;
    confirmPlaying: () => void;
    pause: () => void;
    resume: (seconds?: number) => void;
    stop: () => void;
}
import type { Party, ChatMessage } from '@/types/watch-party';
import PartyPlayer, { type ReactionBubble } from './PartyPlayer';
import ChangeMediaModal from './ChangeMediaModal';

interface Props { code: string; }

const REACTION_EMOJIS = ['😂', '🔥', '😍', '😱', '👏', '💀'];
const HEARTBEAT_MS = 20_000;
const HOST_MISSING_CLAIM_MS = 45_000;

// ── Emoji picker ──────────────────────────────────────────────────────────────
const EMOJI_GROUPS = [
    { label: 'Reacciones', emojis: ['😂','😭','😍','🔥','👏','💀','😮','🤣','❤️','😎','🥹','😤','🤯','😱','🥲','😅','🤩','😏','🙄','😒'] },
    { label: 'Cine',       emojis: ['🎬','🍿','🎥','📽️','🎞️','🎭','🌟','⭐','💫','🏆','👑','🎉','🎊','🎶','🎵','🎸','🎤','🎧','📺','🖥️'] },
    { label: 'Gestos',     emojis: ['👍','👎','👋','🤝','🙌','🤜','🤛','✌️','🤞','👌','🤌','💪','🫶','🫂','🙏','🤷','🤦','💁','🫡','🫠'] },
    { label: 'Objetos',    emojis: ['💬','💭','❓','❗','✅','❌','⚡','💥','✨','🌈','🎯','🚀','💡','🔑','🎁','🍕','🍔','🍦','☕','🧃'] },
];

function EmojiPicker({
    anchorRef, onSelect, onClose,
}: {
    anchorRef: React.RefObject<HTMLButtonElement | null>;
    onSelect: (e: string) => void;
    onClose: () => void;
}) {
    const [tab, setTab] = useState(0);
    const pickerRef = useRef<HTMLDivElement>(null);
    const [pos, setPos] = useState({ bottom: 0, left: 0 });

    useEffect(() => {
        const updatePos = () => {
            if (!anchorRef.current) return;
            const rect = anchorRef.current.getBoundingClientRect();
            setPos({
                bottom: window.innerHeight - rect.top + 8,
                left: Math.max(8, rect.left - 8),
            });
        };
        updatePos();
        window.addEventListener('scroll', updatePos, true);
        window.addEventListener('resize', updatePos);
        return () => {
            window.removeEventListener('scroll', updatePos, true);
            window.removeEventListener('resize', updatePos);
        };
    }, [anchorRef]);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (
                pickerRef.current && !pickerRef.current.contains(e.target as Node) &&
                anchorRef.current && !anchorRef.current.contains(e.target as Node)
            ) onClose();
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [onClose, anchorRef]);

    return (
        <div
            ref={pickerRef}
            style={{ position: 'fixed', bottom: pos.bottom, left: pos.left, zIndex: 9999 }}
            className="w-72 bg-surface-container rounded-[var(--radius-lg)] border border-outline-variant shadow-[var(--shadow-5)] overflow-hidden"
        >
            <div className="flex border-b border-outline-variant overflow-x-auto scrollbar-hide">
                {EMOJI_GROUPS.map((g, i) => (
                    <button
                        key={g.label}
                        onClick={() => setTab(i)}
                        className={`px-3 py-2 md3-label-small whitespace-nowrap transition-colors ${tab === i ? 'text-primary border-b-2 border-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
                    >
                        {g.label}
                    </button>
                ))}
            </div>
            <div className="grid grid-cols-8 gap-0.5 p-2 max-h-44 overflow-y-auto scrollbar-hide">
                {EMOJI_GROUPS[tab].emojis.map(e => (
                    <button
                        key={e}
                        onClick={() => onSelect(e)}
                        className="text-xl p-1 rounded hover:bg-on-surface/8 transition-colors leading-none"
                    >
                        {e}
                    </button>
                ))}
            </div>
        </div>
    );
}

// ── Reply preview bar ─────────────────────────────────────────────────────────
function ReplyBar({ msg, onCancel }: { msg: ChatMessage; onCancel: () => void }) {
    return (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/8 border-t border-primary/20">
            <Reply className="w-3.5 h-3.5 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
                <p className="md3-label-small text-primary truncate">{msg.username}</p>
                <p className="md3-body-small text-on-surface-variant truncate">{msg.text}</p>
            </div>
            <button onClick={onCancel} className="w-6 h-6 rounded-full hover:bg-on-surface/8 flex items-center justify-center text-on-surface-variant shrink-0">
                <X className="w-3 h-3" />
            </button>
        </div>
    );
}

// ── Single message bubble ─────────────────────────────────────────────────────
function MessageBubble({
    msg, isMe, onReply,
}: {
    msg: ChatMessage;
    isMe: boolean;
    onReply: (msg: ChatMessage) => void;
}) {
    const [showActions, setShowActions] = useState(false);

    if (msg.type === 'system') {
        return (
            <div className="text-center py-0.5">
                <span className="md3-label-small text-on-surface-variant/60 italic">{msg.text}</span>
            </div>
        );
    }

    return (
        <div
            className={`flex gap-2 group ${isMe ? 'flex-row-reverse' : ''}`}
            onMouseEnter={() => setShowActions(true)}
            onMouseLeave={() => setShowActions(false)}
        >
            <div className="w-6 h-6 rounded-full bg-primary-container flex items-center justify-center shrink-0 overflow-hidden mt-auto mb-0.5">
                {msg.avatar_url
                    ? <Image src={msg.avatar_url} alt="" width={24} height={24} className="object-cover" />
                    : <span className="text-[9px] font-bold text-on-primary-container">{msg.username[0]?.toUpperCase()}</span>
                }
            </div>

            <div className={`flex flex-col max-w-[78%] ${isMe ? 'items-end' : 'items-start'}`}>
                {!isMe && (
                    <span className="md3-label-small text-on-surface-variant mb-0.5 ml-1">{msg.username}</span>
                )}

                {msg.reply_preview && (
                    <div className={`flex items-start gap-1.5 px-2.5 py-1 mb-0.5 rounded-xl border-l-2 border-primary/60 bg-primary/8 max-w-full ${isMe ? 'self-end' : 'self-start'}`}>
                        <Reply className="w-3 h-3 text-primary/60 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                            <p className="md3-label-small text-primary/80 truncate">{msg.reply_username ?? 'Usuario'}</p>
                            <p className="md3-body-small text-on-surface-variant/70 truncate">{msg.reply_preview}</p>
                        </div>
                    </div>
                )}

                <div className="flex items-end gap-1.5">
                    {isMe && (
                        <button
                            onClick={() => onReply(msg)}
                            className={`w-6 h-6 rounded-full hover:bg-on-surface/8 flex items-center justify-center text-on-surface-variant transition-all ${showActions ? 'opacity-100' : 'opacity-0'}`}
                            aria-label="Responder"
                        >
                            <Reply className="w-3.5 h-3.5" />
                        </button>
                    )}

                    <div className={`px-3 py-1.5 rounded-2xl md3-body-small break-words ${
                        isMe
                            ? 'bg-primary text-on-primary rounded-tr-sm'
                            : 'bg-surface-container-high text-on-surface rounded-tl-sm'
                    }`}>
                        {msg.text}
                    </div>

                    {!isMe && (
                        <button
                            onClick={() => onReply(msg)}
                            className={`w-6 h-6 rounded-full hover:bg-on-surface/8 flex items-center justify-center text-on-surface-variant transition-all ${showActions ? 'opacity-100' : 'opacity-0'}`}
                            aria-label="Responder"
                        >
                            <Reply className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

// ── Main Room ─────────────────────────────────────────────────────────────────
export default function WatchPartyRoom({ code }: Props) {
    const router = useRouter();
    const supabase = watchPartyClient;

    const [party,     setParty]     = useState<Party | null>(null);
    const [playback,  setPlayback]  = useState<PlaybackState>(IDLE_PLAYBACK);
    const [presence,  setPresence]  = useState<PresenceMeta[]>([]);
    const [messages,  setMessages]  = useState<ChatMessage[]>([]);
    const [me,        setMe]        = useState<string | null>(null);
    const [myProfile, setMyProfile] = useState<{ username: string; avatar_url: string | null } | null>(null);
    const [loading,   setLoading]   = useState(true);
    const [error,     setError]     = useState('');
    const [needsPassword, setNeedsPassword] = useState(false);
    const [passInput, setPassInput] = useState('');
    const [ended,     setEnded]     = useState(false);
    const [msgText,   setMsgText]   = useState('');
    const [sending,   setSending]   = useState(false);
    const [sendError, setSendError] = useState('');
    const [copied,    setCopied]    = useState(false);
    const [replyTo,   setReplyTo]   = useState<ChatMessage | null>(null);
    const [showEmoji, setShowEmoji] = useState(false);
    const [reactions, setReactions] = useState<ReactionBubble[]>([]);
    const [hostPos,   setHostPos]   = useState<{ seconds: number; at: number } | null>(null);
    const [hostStale, setHostStale] = useState(false);
    const [claiming,  setClaiming]  = useState(false);
    const [mediaModal, setMediaModal] = useState<'title' | 'episode' | null>(null);
    const [hostBusy,  setHostBusy]  = useState(false);

    const chatRef  = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const emojiRef = useRef<HTMLButtonElement>(null);

    // Refs espejo para usar dentro de callbacks estables.
    const partyRef = useRef(party);          partyRef.current = party;
    const playbackRef = useRef(playback);    playbackRef.current = playback;
    const meRef = useRef(me);                meRef.current = me;
    const roomRef = useRef<RoomChannel | null>(null);
    const hostActionsRef = useRef<LocalHostActions | null>(null);
    const reactionIdRef = useRef(0);
    const lastReactionSentRef = useRef(0);
    const lastPosSentRef = useRef(0);
    const hostMissingSinceRef = useRef<number | null>(null);

    const isHost = !!party && party.host_id === me;

    // ── Carga inicial + join ──────────────────────────────────────────────────
    const join = useCallback(async (password?: string) => {
        setLoading(true);
        setError('');
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { router.push(`/login?next=/watch-party/${code}`); return; }
            setMe(user.id);

            const { data: profile } = await supabase
                .from('profiles')
                .select('username, avatar_url')
                .eq('id', user.id)
                .single();
            setMyProfile({
                username: profile?.username ?? 'Usuario',
                avatar_url: profile?.avatar_url ?? null,
            });

            const res = await fetch(`/api/watch-party/${code}`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password }),
            });
            const data = await res.json();
            if (res.status === 403 && (data.error ?? '').includes('contraseña')) {
                setNeedsPassword(true);
                setLoading(false);
                if (password) setError('Contraseña incorrecta');
                return;
            }
            if (res.status === 410) { setEnded(true); setLoading(false); return; }
            if (!res.ok) { setError(data.error ?? 'No se pudo entrar a la sala'); setLoading(false); return; }

            const p: Party = data.party;
            setNeedsPassword(false);
            setParty(p);
            setPlayback(playbackFromParty(p));
            const msgs = await getPartyMessages(p.id);
            setMessages(msgs);
            setLoading(false);
        } catch {
            setError('Error de conexión');
            setLoading(false);
        }
    }, [code, router, supabase]);

    useEffect(() => { void join(); }, [join]);

    // ── Canal Realtime (broadcast + presence) ─────────────────────────────────
    useEffect(() => {
        if (!party?.id || !me || !myProfile) return;

        const room = joinRoomChannel(party.id, {
            user_id: me,
            username: myProfile.username,
            avatar_url: myProfile.avatar_url,
            online_at: new Date().toISOString(),
        }, {
            onPlayback: (state) => {
                // Solo el host actual manda; descartar eventos viejos por seq.
                if (state.by !== partyRef.current?.host_id) return;
                if (state.seq <= playbackRef.current.seq && state.at <= playbackRef.current.at) return;
                setPlayback(state);
            },
            onMedia: (media) => {
                setParty(prev => prev ? {
                    ...prev,
                    tmdb_id: media.tmdb_id,
                    title: media.title,
                    poster_path: media.poster_path,
                    media_type: media.media_type,
                    season: media.season ?? undefined,
                    episode: media.episode ?? undefined,
                } : prev);
                setPlayback(IDLE_PLAYBACK);
                setHostPos(null);
            },
            onReaction: (r) => {
                const id = ++reactionIdRef.current;
                setReactions(prev => [...prev.slice(-24), { id, emoji: r.emoji, username: r.username, left: 8 + Math.random() * 80 }]);
                setTimeout(() => setReactions(prev => prev.filter(b => b.id !== id)), 3400);
            },
            onHostChange: (newHostId) => {
                setParty(prev => prev ? { ...prev, host_id: newHostId } : prev);
                setHostStale(false);
                hostMissingSinceRef.current = null;
            },
            onHostPosition: (p) => setHostPos({ seconds: p.seconds, at: p.at }),
            onEnded: () => setEnded(true),
            onPresenceSync: (members) => setPresence(members),
        });
        roomRef.current = room;

        return () => {
            room.leave();
            roomRef.current = null;
        };
    }, [party?.id, me, myProfile]);

    // ── Acciones del host (lazy, dependen del canal) ──────────────────────────
    useEffect(() => {
        if (!roomRef.current || !me || !isHost) { hostActionsRef.current = null; return; }
        const base = makeHostActions(code, roomRef.current, me, () => playbackRef.current.seq);
        // Aplicar localmente cada emisión (broadcast self:false no nos la devuelve).
        const wrap = <A extends unknown[]>(fn: (...args: A) => PlaybackState) =>
            (...args: A) => { setPlayback(fn(...args)); };
        hostActionsRef.current = {
            startCountdown: wrap(base.startCountdown),
            confirmPlaying: wrap(base.confirmPlaying),
            pause: wrap(base.pause),
            resume: wrap(base.resume),
            stop: wrap(base.stop),
        };
    }, [isHost, me, code, party?.id]);

    // ── Chat: mensajes en vivo (postgres_changes — verificado funcional) ─────
    useEffect(() => {
        if (!party?.id) return;
        const ch = subscribeToMessages(party.id, (msg) => {
            setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
        });
        return () => { supabase.removeChannel(ch); };
    }, [party?.id, supabase]);

    // ── Heartbeat (vía API — RLS bloquea el update directo) ───────────────────
    useEffect(() => {
        if (!party?.id || !me) return;
        const ping = () => {
            void fetch(`/api/watch-party/${code}/heartbeat`, { method: 'POST' });
        };
        ping();
        const interval = setInterval(ping, HEARTBEAT_MS);
        return () => clearInterval(interval);
    }, [party?.id, me, code]);

    // ── Posición del host: escuchar el embed y emitir (best-effort) ──────────
    useEffect(() => {
        if (!isHost || effectivePhase(playback) !== 'playing') return;
        const cleanup = listenVimeusTime((seconds) => {
            const now = Date.now();
            if (now - lastPosSentRef.current < 8000) return;
            lastPosSentRef.current = now;
            roomRef.current?.sendHostPosition({ seconds, at: now });
        });
        return cleanup;
    }, [isHost, playback]);

    // ── Detección de host ausente (presence) ──────────────────────────────────
    useEffect(() => {
        const interval = setInterval(() => {
            const p = partyRef.current;
            if (!p || p.host_id === meRef.current) { setHostStale(false); return; }
            const hostOnline = presence.some(m => m.user_id === p.host_id);
            if (hostOnline) {
                hostMissingSinceRef.current = null;
                setHostStale(false);
            } else {
                if (hostMissingSinceRef.current === null) hostMissingSinceRef.current = Date.now();
                if (Date.now() - hostMissingSinceRef.current > HOST_MISSING_CLAIM_MS) setHostStale(true);
            }
        }, 5000);
        return () => clearInterval(interval);
    }, [presence]);

    // ── Auto-scroll chat ──────────────────────────────────────────────────────
    useEffect(() => {
        chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' });
    }, [messages]);

    // ── Handlers ──────────────────────────────────────────────────────────────
    const sendMessage = useCallback(async () => {
        if (!msgText.trim() || sending) return;
        setSending(true);
        setSendError('');
        try {
            const body: Record<string, unknown> = { text: msgText.trim() };
            if (replyTo) body.reply_to_id = replyTo.id;
            const res = await fetch(`/api/watch-party/${code}/message`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Error al enviar mensaje');
            }
            setMsgText('');
            setReplyTo(null);
        } catch (err) {
            setSendError(err instanceof Error ? err.message : 'No se pudo enviar. Intenta de nuevo.');
        } finally {
            setSending(false);
            inputRef.current?.focus();
        }
    }, [msgText, sending, replyTo, code]);

    const sendReaction = useCallback((emoji: string) => {
        const now = Date.now();
        if (now - lastReactionSentRef.current < 600) return; // anti-spam
        lastReactionSentRef.current = now;
        const username = myProfile?.username ?? 'Alguien';
        roomRef.current?.sendReaction({ emoji, username });
        // broadcast self:false → añadir la propia burbuja localmente
        const id = ++reactionIdRef.current;
        setReactions(prev => [...prev.slice(-24), { id, emoji, username, left: 8 + Math.random() * 80 }]);
        setTimeout(() => setReactions(prev => prev.filter(b => b.id !== id)), 3400);
    }, [myProfile]);

    const handleReply = useCallback((msg: ChatMessage) => {
        setReplyTo(msg);
        setShowEmoji(false);
        inputRef.current?.focus();
    }, []);

    const insertEmoji = useCallback((emoji: string) => {
        setMsgText(prev => prev + emoji);
        setShowEmoji(false);
        inputRef.current?.focus();
    }, []);

    const onCountdownEnd = useCallback(() => {
        if (partyRef.current?.host_id === meRef.current) {
            hostActionsRef.current?.confirmPlaying();
        } else {
            // Transición local del espectador; el broadcast del host la confirma.
            setPlayback(prev => prev.phase === 'countdown' ? { ...prev, phase: 'playing' } : prev);
        }
    }, []);

    const leaveParty = async () => {
        try {
            const res = await fetch(`/api/watch-party/${code}`, { method: 'DELETE' });
            const data = await res.json().catch(() => ({}));
            if (data?.newHostId) roomRef.current?.sendHostChange(data.newHostId);
        } finally {
            router.push('/watch-party');
        }
    };

    const endParty = async () => {
        if (!window.confirm('¿Finalizar la sala para todos?')) return;
        setHostBusy(true);
        try {
            await fetch(`/api/watch-party/${code}`, {
                method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'finished' }),
            });
            roomRef.current?.sendEnded();
            router.push('/watch-party');
        } finally {
            setHostBusy(false);
        }
    };

    const claimHost = async () => {
        setClaiming(true);
        try {
            const res = await fetch(`/api/watch-party/${code}/claim-host`, { method: 'POST' });
            const data = await res.json();
            if (res.ok && data.newHostId) {
                setParty(prev => prev ? { ...prev, host_id: data.newHostId } : prev);
                roomRef.current?.sendHostChange(data.newHostId);
                setHostStale(false);
            } else if (data.error) {
                setSendError(data.error);
                setTimeout(() => setSendError(''), 4000);
            }
        } finally {
            setClaiming(false);
        }
    };

    const onMediaApplied = useCallback((media: MediaChange) => {
        roomRef.current?.sendMedia(media);
        setParty(prev => prev ? {
            ...prev,
            tmdb_id: media.tmdb_id,
            title: media.title,
            poster_path: media.poster_path,
            media_type: media.media_type,
            season: media.season ?? undefined,
            episode: media.episode ?? undefined,
        } : prev);
        setPlayback(IDLE_PLAYBACK);
        setHostPos(null);
    }, []);

    const copyCode = () => {
        navigator.clipboard.writeText(window.location.origin + '/watch-party/' + code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // ── Estados de página ─────────────────────────────────────────────────────
    if (loading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
    );

    if (ended) return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4 text-center">
            <div className="w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center">
                <Flag className="w-7 h-7 text-on-surface-variant" />
            </div>
            <p className="md3-title-medium text-on-surface">La sala terminó</p>
            <p className="md3-body-small text-on-surface-variant max-w-sm">
                El host finalizó la función. ¡Gracias por acompañar la watch party!
            </p>
            <button onClick={() => router.push('/watch-party')}
                className="h-10 px-6 rounded-full bg-primary text-on-primary md3-label-large">
                Volver al lobby
            </button>
        </div>
    );

    if (needsPassword) return (
        <div className="flex items-center justify-center min-h-[60vh] px-4">
            <div className="w-full max-w-sm bg-surface-container rounded-[var(--radius-xl)] border border-outline-variant p-6 space-y-4">
                <div className="flex items-center gap-2">
                    <Lock className="w-5 h-5 text-primary" />
                    <p className="md3-title-small text-on-surface">Sala privada</p>
                </div>
                <p className="md3-body-small text-on-surface-variant">
                    Esta sala requiere contraseña para entrar.
                </p>
                <input
                    autoFocus type="password" value={passInput}
                    onChange={e => setPassInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && passInput && join(passInput)}
                    placeholder="Contraseña"
                    className="w-full h-10 rounded-full px-4 bg-surface-container-high border border-outline-variant md3-body-medium text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary"
                />
                {error && <p className="md3-body-small text-error">{error}</p>}
                <button
                    onClick={() => join(passInput)} disabled={!passInput}
                    className="w-full h-10 rounded-full bg-primary text-on-primary md3-label-large disabled:opacity-40">
                    Entrar
                </button>
            </div>
        </div>
    );

    if (error && !party) return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
            <p className="md3-title-medium text-on-surface">{error}</p>
            <button onClick={() => router.push('/watch-party')}
                className="h-9 px-5 rounded-full bg-primary text-on-primary md3-label-large">
                Volver al lobby
            </button>
        </div>
    );

    if (!party) return null;

    const phase = effectivePhase(playback);
    const onlineCount = presence.length;
    const hostPosFresh = hostPos && Date.now() - hostPos.at < 30_000;

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="max-w-[1400px] mx-auto p-3 sm:p-4 flex flex-col gap-3 lg:h-[calc(100vh-4rem)]">

            {/* ── Header ── */}
            <div className="flex items-center gap-3 bg-surface-container rounded-[var(--radius-lg)] border border-outline-variant px-4 py-2.5 shrink-0">
                {party.poster_path && (
                    <Image
                        src={`https://image.tmdb.org/t/p/w92${party.poster_path}`}
                        alt={party.title} width={28} height={42}
                        className="rounded object-cover shrink-0"
                    />
                )}
                <div className="flex-1 min-w-0">
                    <p className="md3-label-large text-on-surface truncate">{party.name}</p>
                    <p className="md3-body-small text-on-surface-variant truncate flex items-center gap-1.5">
                        {party.media_type === 'tv' ? <Tv className="w-3 h-3" /> : <Film className="w-3 h-3" />}
                        {party.title}
                        {party.media_type === 'tv' && ` · T${party.season ?? 1}E${party.episode ?? 1}`}
                    </p>
                </div>

                {phase === 'playing' && (
                    <span className="hidden sm:flex items-center gap-1.5 px-2.5 h-7 rounded-full bg-[#10b981]/10 text-[#10b981] md3-label-small">
                        <Radio className="w-3 h-3 animate-pulse" /> En vivo
                    </span>
                )}
                <span className="flex items-center gap-1.5 px-2.5 h-7 rounded-full bg-surface-container-high border border-outline-variant md3-label-small text-on-surface-variant">
                    <Users className="w-3 h-3" /> {onlineCount}
                </span>
                <button onClick={copyCode}
                    className="flex items-center gap-1.5 px-3 h-7 rounded-full bg-surface-container-high border border-outline-variant md3-label-small text-on-surface-variant hover:text-on-surface transition-colors">
                    {copied ? <Check className="w-3 h-3 text-[#10b981]" /> : <Copy className="w-3 h-3" />}
                    {code}
                </button>
                {party.is_private ? <Lock className="w-4 h-4 text-on-surface-variant shrink-0" /> : <Globe className="w-4 h-4 text-on-surface-variant shrink-0" />}
                <button onClick={leaveParty}
                    className="w-8 h-8 rounded-full hover:bg-error/10 flex items-center justify-center text-on-surface-variant hover:text-error transition-colors"
                    aria-label="Salir de la sala">
                    <LogOut className="w-4 h-4" />
                </button>
            </div>

            <div className="flex flex-col lg:flex-row gap-3 flex-1 min-h-0">

                {/* ── Columna del player ── */}
                <div className="flex-1 min-w-0 flex flex-col gap-3">
                    <PartyPlayer
                        tmdbId={party.tmdb_id}
                        mediaType={(party.media_type as 'movie' | 'tv') ?? 'movie'}
                        season={party.season ?? 1}
                        episode={party.episode ?? 1}
                        title={party.title}
                        posterPath={party.poster_path}
                        phase={phase}
                        countdownEndsAt={playback.countdownEndsAt ?? null}
                        isHost={isHost}
                        reactions={reactions}
                        onCountdownEnd={onCountdownEnd}
                    />

                    {/* ── Barra de control ── */}
                    <div className="flex flex-wrap items-center gap-2 bg-surface-container rounded-[var(--radius-lg)] border border-outline-variant px-3 py-2.5 shrink-0">
                        {isHost ? (
                            <>
                                <span className="flex items-center gap-1 px-2 h-7 rounded-full bg-[#f59e0b]/10 text-[#f59e0b] md3-label-small shrink-0">
                                    <Crown className="w-3 h-3" /> Host
                                </span>

                                {phase === 'idle' && (
                                    <button onClick={() => hostActionsRef.current?.startCountdown(5)}
                                        className="flex items-center gap-2 h-9 px-5 rounded-full bg-primary text-on-primary md3-label-large hover:shadow-[var(--shadow-2)] transition-shadow">
                                        <Play className="w-4 h-4 fill-current" /> Iniciar función
                                    </button>
                                )}
                                {phase === 'countdown' && (
                                    <span className="flex items-center gap-2 h-9 px-4 rounded-full bg-surface-container-high text-on-surface-variant md3-label-large">
                                        <Loader2 className="w-4 h-4 animate-spin" /> Iniciando...
                                    </span>
                                )}
                                {phase === 'playing' && (
                                    <>
                                        <button onClick={() => hostActionsRef.current?.pause()}
                                            className="flex items-center gap-2 h-9 px-5 rounded-full bg-primary text-on-primary md3-label-large hover:shadow-[var(--shadow-2)] transition-shadow">
                                            <Pause className="w-4 h-4 fill-current" /> Pausar para todos
                                        </button>
                                        <button onClick={() => hostActionsRef.current?.resume(3)}
                                            title="Vuelve a montar el reproductor en todos a la vez (si alguien se desincronizó)"
                                            className="flex items-center gap-1.5 h-9 px-4 rounded-full border border-outline-variant text-on-surface-variant md3-label-medium hover:bg-on-surface/8 transition-colors">
                                            <RefreshCw className="w-3.5 h-3.5" /> Re-sincronizar
                                        </button>
                                    </>
                                )}
                                {phase === 'paused' && (
                                    <button onClick={() => hostActionsRef.current?.resume(3)}
                                        className="flex items-center gap-2 h-9 px-5 rounded-full bg-primary text-on-primary md3-label-large hover:shadow-[var(--shadow-2)] transition-shadow">
                                        <Play className="w-4 h-4 fill-current" /> Reanudar para todos
                                    </button>
                                )}

                                <div className="flex-1" />

                                {party.media_type === 'tv' && (
                                    <button onClick={() => setMediaModal('episode')}
                                        className="h-8 px-3 rounded-full border border-outline-variant text-on-surface-variant md3-label-small hover:bg-on-surface/8 transition-colors">
                                        Cambiar episodio
                                    </button>
                                )}
                                <button onClick={() => setMediaModal('title')}
                                    className="h-8 px-3 rounded-full border border-outline-variant text-on-surface-variant md3-label-small hover:bg-on-surface/8 transition-colors">
                                    Cambiar título
                                </button>
                                <button onClick={endParty} disabled={hostBusy}
                                    className="h-8 px-3 rounded-full border border-error/30 text-error md3-label-small hover:bg-error/10 transition-colors disabled:opacity-40">
                                    Finalizar sala
                                </button>
                            </>
                        ) : (
                            <>
                                <span className="md3-body-small text-on-surface-variant flex items-center gap-1.5">
                                    {phase === 'idle' && <>El host aún no inicia la función</>}
                                    {phase === 'countdown' && <>Preparándose para iniciar...</>}
                                    {phase === 'playing' && <><Radio className="w-3.5 h-3.5 text-[#10b981]" /> Reproduciendo en sincronía</>}
                                    {phase === 'paused' && <><Pause className="w-3.5 h-3.5" /> Pausada por el host</>}
                                </span>
                                {hostPosFresh && phase === 'playing' && (
                                    <span className="px-2.5 h-7 flex items-center rounded-full bg-surface-container-high border border-outline-variant md3-label-small text-on-surface-variant"
                                        title="Posición aproximada del host — si te desincronizaste, adelanta tu reproductor hasta aquí">
                                        Host en ~{formatTime(hostPos!.seconds)}
                                    </span>
                                )}
                                <div className="flex-1" />
                                {hostStale && (
                                    <button onClick={claimHost} disabled={claiming}
                                        className="flex items-center gap-1.5 h-8 px-3 rounded-full bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/30 md3-label-small hover:bg-[#f59e0b]/20 transition-colors disabled:opacity-40">
                                        {claiming ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldAlert className="w-3 h-3" />}
                                        El host se desconectó — tomar control
                                    </button>
                                )}
                            </>
                        )}
                    </div>

                    {/* ── Reacciones rápidas ── */}
                    <div className="flex items-center gap-1.5 justify-center bg-surface-container rounded-[var(--radius-lg)] border border-outline-variant px-3 py-2 shrink-0">
                        {REACTION_EMOJIS.map(e => (
                            <button
                                key={e}
                                onClick={() => sendReaction(e)}
                                className="text-2xl p-1.5 rounded-full hover:bg-on-surface/8 hover:scale-125 transition-all leading-none"
                                aria-label={`Reaccionar con ${e}`}
                            >
                                {e}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── Columna lateral: miembros + chat ── */}
                <aside className="w-full lg:w-80 flex flex-col gap-3 shrink-0 min-h-0 lg:max-h-full">

                    {/* Conectados (presence en vivo) */}
                    <div className="bg-surface-container rounded-[var(--radius-lg)] border border-outline-variant p-3 shrink-0">
                        <p className="md3-label-medium text-on-surface-variant mb-2 flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5" /> {onlineCount} conectado{onlineCount === 1 ? '' : 's'}
                        </p>
                        <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto scrollbar-hide">
                            {presence.map(m => {
                                const memberIsHost = m.user_id === party.host_id;
                                return (
                                    <div key={m.user_id}
                                        className="flex items-center gap-1.5 pl-1 pr-2.5 h-7 rounded-full bg-surface-container-high border border-outline-variant"
                                        title={m.username}>
                                        <div className="w-5 h-5 rounded-full bg-primary-container flex items-center justify-center overflow-hidden shrink-0">
                                            {m.avatar_url
                                                ? <Image src={m.avatar_url} alt="" width={20} height={20} className="object-cover" />
                                                : <span className="text-[8px] font-bold text-on-primary-container">{m.username[0]?.toUpperCase()}</span>
                                            }
                                        </div>
                                        <span className="md3-label-small text-on-surface max-w-[90px] truncate">
                                            {m.user_id === me ? 'Tú' : m.username}
                                        </span>
                                        {memberIsHost && <Crown className="w-3 h-3 text-[#f59e0b] shrink-0" />}
                                    </div>
                                );
                            })}
                            {presence.length === 0 && (
                                <span className="md3-body-small text-on-surface-variant/60">Conectando...</span>
                            )}
                        </div>
                    </div>

                    {/* Chat */}
                    <div className="flex-1 bg-surface-container rounded-[var(--radius-lg)] border border-outline-variant flex flex-col min-h-0 overflow-hidden h-[420px] lg:h-auto">
                        <div className="px-3 py-2 border-b border-outline-variant flex items-center gap-1.5 shrink-0">
                            <MessageSquare className="w-3.5 h-3.5 text-on-surface-variant" />
                            <span className="md3-label-medium text-on-surface-variant">Chat en vivo</span>
                        </div>

                        <div ref={chatRef} className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-hide min-h-0">
                            {messages.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-10 text-on-surface-variant/40">
                                    <MessageSquare className="w-12 h-12 mb-2 opacity-20" />
                                    <p className="md3-body-medium">No hay mensajes aún</p>
                                    <p className="md3-body-small">¡Sé el primero en saludar!</p>
                                </div>
                            ) : (
                                messages.map(msg => (
                                    <MessageBubble
                                        key={msg.id}
                                        msg={msg}
                                        isMe={msg.user_id === me}
                                        onReply={handleReply}
                                    />
                                ))
                            )}
                        </div>

                        {replyTo && <ReplyBar msg={replyTo} onCancel={() => setReplyTo(null)} />}

                        <div className="p-2 border-t border-outline-variant flex gap-1.5 items-center relative shrink-0">
                            <div className="relative">
                                <button
                                    ref={emojiRef}
                                    onClick={() => setShowEmoji(v => !v)}
                                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${showEmoji ? 'bg-primary/15 text-primary' : 'text-on-surface-variant hover:bg-on-surface/8'}`}
                                    aria-label="Emojis"
                                >
                                    <Smile className="w-4 h-4" />
                                </button>
                                {showEmoji && (
                                    <EmojiPicker
                                        anchorRef={emojiRef}
                                        onSelect={insertEmoji}
                                        onClose={() => setShowEmoji(false)}
                                    />
                                )}
                            </div>

                            <input
                                ref={inputRef}
                                value={msgText}
                                onChange={e => setMsgText(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                                placeholder="Escribe algo..."
                                maxLength={500}
                                className="flex-1 h-8 rounded-full px-3 bg-surface-container-high border border-outline-variant md3-body-small text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
                            />

                            <button
                                onClick={sendMessage}
                                disabled={!msgText.trim() || sending}
                                className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center disabled:opacity-40 transition-opacity shrink-0"
                                aria-label="Enviar"
                            >
                                {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                            </button>
                        </div>
                        {sendError && <p className="px-2 pb-2 text-xs text-error">{sendError}</p>}
                    </div>
                </aside>
            </div>

            {/* ── Modal: cambiar título / episodio ── */}
            {mediaModal && (
                <ChangeMediaModal
                    code={code}
                    mode={mediaModal}
                    current={{
                        tmdb_id: party.tmdb_id,
                        title: party.title,
                        poster_path: party.poster_path,
                        media_type: (party.media_type as 'movie' | 'tv') ?? 'movie',
                        season: party.season ?? 1,
                        episode: party.episode ?? 1,
                    }}
                    onClose={() => setMediaModal(null)}
                    onApplied={onMediaApplied}
                />
            )}
        </div>
    );
}
