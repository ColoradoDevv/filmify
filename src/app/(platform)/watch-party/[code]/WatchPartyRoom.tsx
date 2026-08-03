'use client';

/**
 * Sala de Watch Party — orquestador.
 *
 * Sincronización: Supabase Broadcast + Presence (canal wp:{partyId}).
 * El host emite transiciones de reproducción (countdown/playing/paused) que
 * todos los clientes reflejan; el estado también se persiste vía API para
 * quienes entran tarde. El chat usa postgres_changes (verificado funcional).
 *
 * UX del chat: envío optimista (el mensaje aparece al instante y se
 * reconcilia con el id real), indicador de "escribiendo...", y auto-scroll
 * inteligente (no interrumpe si el usuario está leyendo mensajes antiguos).
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
    Users, Send, LogOut, Crown, Loader2, MessageSquare,
    Play, Pause, Copy, Check, Lock, Globe, X, Reply, Smile,
    RefreshCw, Film, Tv, Flag, ShieldAlert, Radio, ChevronDown,
    WifiOff, ArrowDown, Clock,
} from 'lucide-react';
import {
    getPartyMessages, watchPartyClient, subscribeToMessages,
} from '@/lib/watch-party';
import {
    joinRoomChannel, makeHostActions, playbackFromParty, effectivePhase,
    listenVimeusTime, formatTime, IDLE_PLAYBACK,
    type PlaybackState, type PresenceMeta, type MediaChange,
    type RoomChannel, type ChannelStatus,
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
/** Distancia (px) al fondo del chat bajo la cual seguimos auto-scrolleando. */
const CHAT_STICK_PX = 96;
const TYPING_TTL_MS = 3_500;
const TYPING_THROTTLE_MS = 2_000;

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
                left: Math.max(8, Math.min(rect.left - 8, window.innerWidth - 296)),
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
                <span className="md3-label-small text-on-surface-variant/60 italic px-2.5 py-0.5 rounded-full bg-on-surface/4">{msg.text}</span>
            </div>
        );
    }

    return (
        <div
            className={`flex gap-2 group ${isMe ? 'flex-row-reverse' : ''} ${msg.pending ? 'opacity-60' : ''}`}
            style={{ animation: 'wp-msg-in 0.18s ease-out' }}
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

                    <div
                        title={msg.pending ? 'Enviando...' : new Date(msg.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                        className={`px-3 py-1.5 rounded-2xl md3-body-small break-words ${
                            isMe
                                ? 'bg-primary text-on-primary rounded-tr-sm'
                                : 'bg-surface-container-high text-on-surface rounded-tl-sm'
                        }`}
                    >
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

// ── Typing indicator ──────────────────────────────────────────────────────────
function TypingIndicator({ names }: { names: string[] }) {
    if (names.length === 0) return null;
    const label = names.length === 1
        ? `${names[0]} está escribiendo`
        : names.length === 2
        ? `${names[0]} y ${names[1]} están escribiendo`
        : 'Varias personas están escribiendo';
    return (
        <div className="flex items-center gap-1.5 px-3 pb-1 text-on-surface-variant/70">
            <span className="flex gap-0.5">
                {[0, 1, 2].map(i => (
                    <span key={i} className="w-1 h-1 rounded-full bg-current"
                        style={{ animation: `wp-typing 1.2s ${i * 0.15}s ease-in-out infinite` }} />
                ))}
            </span>
            <span className="md3-label-small truncate">{label}...</span>
        </div>
    );
}

// ── Confirm dialog (finalizar sala) ───────────────────────────────────────────
function ConfirmEndDialog({ busy, onConfirm, onCancel }: {
    busy: boolean; onConfirm: () => void; onCancel: () => void;
}) {
    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-xs bg-surface rounded-[var(--radius-xl)] shadow-[var(--shadow-5)] p-5 flex flex-col gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-error/10 flex items-center justify-center shrink-0">
                        <Flag className="w-5 h-5 text-error" />
                    </div>
                    <div>
                        <p className="md3-title-small text-on-surface">¿Finalizar la sala?</p>
                        <p className="md3-body-small text-on-surface-variant">La función terminará para todos.</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={onCancel}
                        className="flex-1 h-9 rounded-full border border-outline-variant text-on-surface md3-label-medium hover:bg-on-surface/8 transition-colors">
                        Cancelar
                    </button>
                    <button onClick={onConfirm} disabled={busy}
                        className="flex-1 h-9 rounded-full bg-error text-on-error md3-label-medium hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center justify-center gap-1.5">
                        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Finalizar'}
                    </button>
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
    const [confirmEnd, setConfirmEnd] = useState(false);
    const [showMembers, setShowMembers] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [typingUsers, setTypingUsers] = useState<Record<string, { username: string; until: number }>>({});
    const [connStatus, setConnStatus] = useState<ChannelStatus | null>(null);

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
    const lastTypingSentRef = useRef(0);
    const hostMissingSinceRef = useRef<number | null>(null);
    const tempIdRef = useRef(0);
    const chatAtBottomRef = useRef(true);

    const isHost = !!party && party.host_id === me;

    // ── Chat: helpers de scroll + optimista ───────────────────────────────────
    const scrollChatToBottom = useCallback((smooth = true) => {
        chatRef.current?.scrollTo({
            top: chatRef.current.scrollHeight,
            behavior: smooth ? 'smooth' : 'auto',
        });
        chatAtBottomRef.current = true;
        setUnreadCount(0);
    }, []);

    const onChatScroll = useCallback(() => {
        const el = chatRef.current;
        if (!el) return;
        const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < CHAT_STICK_PX;
        chatAtBottomRef.current = atBottom;
        if (atBottom) setUnreadCount(0);
    }, []);

    /**
     * Inserta un mensaje confirmado por el servidor, reconciliándolo con su
     * versión optimista si existe (por tempId explícito o por autor+texto).
     */
    const upsertRealMessage = useCallback((msg: ChatMessage, tempId?: string) => {
        setMessages(prev => {
            if (prev.some(m => m.id === msg.id)) {
                return tempId ? prev.filter(m => m.id !== tempId) : prev;
            }
            const idx = tempId
                ? prev.findIndex(m => m.id === tempId)
                : prev.findIndex(m => m.pending && m.user_id === msg.user_id && m.text === msg.text);
            if (idx !== -1) {
                const next = [...prev];
                next[idx] = { ...msg, pending: false };
                return next;
            }
            return [...prev, msg];
        });
    }, []);

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
            onTyping: (t) => {
                if (t.user_id === meRef.current) return;
                setTypingUsers(prev => ({
                    ...prev,
                    [t.user_id]: { username: t.username, until: Date.now() + TYPING_TTL_MS },
                }));
            },
            onEnded: () => setEnded(true),
            onPresenceSync: (members) => setPresence(members),
            onStatus: (status) => setConnStatus(status),
        });
        roomRef.current = room;

        return () => {
            room.leave();
            roomRef.current = null;
        };
    }, [party?.id, me, myProfile]);

    // ── Expirar indicadores de "escribiendo..." ───────────────────────────────
    useEffect(() => {
        const interval = setInterval(() => {
            setTypingUsers(prev => {
                const now = Date.now();
                const alive = Object.entries(prev).filter(([, v]) => v.until > now);
                if (alive.length === Object.keys(prev).length) return prev;
                return Object.fromEntries(alive);
            });
        }, 1000);
        return () => clearInterval(interval);
    }, []);

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
            upsertRealMessage(msg);
            // Quien envió un mensaje ya no está "escribiendo".
            setTypingUsers(prev => {
                if (!prev[msg.user_id]) return prev;
                const { [msg.user_id]: _omit, ...rest } = prev;
                return rest;
            });
        });
        return () => { supabase.removeChannel(ch); };
    }, [party?.id, supabase, upsertRealMessage]);

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

    // ── Auto-scroll inteligente: solo si el usuario está al fondo ─────────────
    useEffect(() => {
        if (messages.length === 0) return;
        if (chatAtBottomRef.current) {
            scrollChatToBottom();
        } else {
            const last = messages[messages.length - 1];
            // Los propios mensajes siempre bajan el scroll (los envié yo).
            if (last?.user_id === meRef.current && last?.type !== 'system') {
                scrollChatToBottom();
            } else {
                setUnreadCount(c => c + 1);
            }
        }
    }, [messages, scrollChatToBottom]);

    // ── Handlers ──────────────────────────────────────────────────────────────
    const sendMessage = useCallback(async () => {
        const text = msgText.trim();
        if (!text || sending || !meRef.current || !myProfile) return;
        setSending(true);
        setSendError('');

        // Mensaje optimista: visible al instante, se reconcilia con el id real.
        const tempId = `tmp-${++tempIdRef.current}-${Date.now()}`;
        const reply = replyTo;
        const optimistic: ChatMessage = {
            id: tempId,
            user_id: meRef.current,
            username: myProfile.username,
            avatar_url: myProfile.avatar_url,
            text,
            timestamp: new Date().toISOString(),
            type: 'user',
            reply_to_id: reply?.id ?? null,
            reply_preview: reply ? reply.text.slice(0, 80) : null,
            reply_username: reply?.username ?? null,
            pending: true,
        };
        setMessages(prev => [...prev, optimistic]);
        setMsgText('');
        setReplyTo(null);

        try {
            const body: Record<string, unknown> = { text };
            if (reply) body.reply_to_id = reply.id;
            const res = await fetch(`/api/watch-party/${code}/message`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || 'Error al enviar mensaje');

            if (data.message?.id) {
                upsertRealMessage({
                    id: data.message.id,
                    user_id: meRef.current,
                    username: myProfile.username,
                    avatar_url: myProfile.avatar_url,
                    text: data.message.text ?? text,
                    timestamp: data.message.created_at ?? optimistic.timestamp,
                    type: 'user',
                    reply_to_id: data.message.reply_to_id ?? null,
                    reply_preview: data.message.reply_preview ?? null,
                    reply_username: data.message.reply_username ?? null,
                }, tempId);
            } else {
                // Respuesta sin fila (legado): confiar en el evento Realtime.
                setMessages(prev => prev.map(m => m.id === tempId ? { ...m, pending: false } : m));
            }
        } catch (err) {
            // Revertir el optimista y devolver el texto al input para reintentar.
            setMessages(prev => prev.filter(m => m.id !== tempId));
            setMsgText(text);
            if (reply) setReplyTo(reply);
            setSendError(err instanceof Error ? err.message : 'No se pudo enviar. Intenta de nuevo.');
        } finally {
            setSending(false);
            inputRef.current?.focus();
        }
    }, [msgText, sending, replyTo, code, myProfile, upsertRealMessage]);

    const onMsgTextChange = useCallback((value: string) => {
        setMsgText(value);
        // Emitir "escribiendo..." con throttle (efímero, vía broadcast).
        const now = Date.now();
        if (value.trim() && now - lastTypingSentRef.current > TYPING_THROTTLE_MS && meRef.current && myProfile) {
            lastTypingSentRef.current = now;
            roomRef.current?.sendTyping({ user_id: meRef.current, username: myProfile.username });
        }
    }, [myProfile]);

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

    const onHostStart = useCallback(() => {
        hostActionsRef.current?.startCountdown(5);
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
            setConfirmEnd(false);
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
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="md3-body-small text-on-surface-variant">Entrando a la sala...</p>
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
    const typingNames = Object.values(typingUsers).map(t => t.username);
    const reconnecting = connStatus !== null && connStatus !== 'SUBSCRIBED';

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="max-w-[1400px] mx-auto p-2 sm:p-4 flex flex-col gap-2 sm:gap-3 lg:h-[calc(100dvh-4rem)]">
            {/* keyframes propios de la sala */}
            <style>{`
                @keyframes wp-msg-in {
                    0%   { transform: translateY(6px); opacity: 0; }
                    100% { transform: translateY(0);   opacity: 1; }
                }
                @keyframes wp-typing {
                    0%, 60%, 100% { transform: translateY(0);    opacity: 0.4; }
                    30%           { transform: translateY(-3px); opacity: 1; }
                }
            `}</style>

            {/* ── Header ── */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 bg-surface-container rounded-[var(--radius-lg)] border border-outline-variant px-3 sm:px-4 py-2.5 shrink-0">
                {party.poster_path && (
                    <Image
                        src={`https://image.tmdb.org/t/p/w92${party.poster_path}`}
                        alt={party.title} width={28} height={42}
                        className="rounded object-cover shrink-0 hidden sm:block"
                    />
                )}
                <div className="flex-1 min-w-0 basis-40">
                    <p className="md3-label-large text-on-surface truncate flex items-center gap-1.5">
                        <span className="truncate">{party.name}</span>
                        {party.is_private
                            ? <Lock className="w-3 h-3 text-on-surface-variant shrink-0" />
                            : <Globe className="w-3 h-3 text-on-surface-variant shrink-0" />}
                    </p>
                    <p className="md3-body-small text-on-surface-variant truncate flex items-center gap-1.5">
                        {party.media_type === 'tv' ? <Tv className="w-3 h-3 shrink-0" /> : <Film className="w-3 h-3 shrink-0" />}
                        <span className="truncate">{party.title}</span>
                        {party.media_type === 'tv' && <span className="shrink-0">· T{party.season ?? 1}E{party.episode ?? 1}</span>}
                    </p>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2 ml-auto">
                    {reconnecting && (
                        <span className="flex items-center gap-1.5 px-2.5 h-7 rounded-full bg-[#f59e0b]/10 text-[#f59e0b] md3-label-small"
                            title="Se perdió la conexión en tiempo real; reintentando">
                            <WifiOff className="w-3 h-3" />
                            <span className="hidden sm:inline">Reconectando...</span>
                        </span>
                    )}
                    {phase === 'playing' && !reconnecting && (
                        <span className="hidden sm:flex items-center gap-1.5 px-2.5 h-7 rounded-full bg-[#10b981]/10 text-[#10b981] md3-label-small">
                            <Radio className="w-3 h-3 animate-pulse" /> En vivo
                        </span>
                    )}
                    <span className="flex items-center gap-1.5 px-2.5 h-7 rounded-full bg-surface-container-high border border-outline-variant md3-label-small text-on-surface-variant">
                        <Users className="w-3 h-3" /> {onlineCount}
                    </span>
                    <button onClick={copyCode}
                        title="Copiar link de invitación"
                        className="flex items-center gap-1.5 px-3 h-7 rounded-full bg-surface-container-high border border-outline-variant md3-label-small text-on-surface-variant hover:text-on-surface hover:border-primary/40 transition-colors">
                        {copied ? <Check className="w-3 h-3 text-[#10b981]" /> : <Copy className="w-3 h-3" />}
                        <span className="font-mono tracking-wider">{code}</span>
                    </button>
                    <button onClick={leaveParty}
                        className="w-8 h-8 rounded-full hover:bg-error/10 flex items-center justify-center text-on-surface-variant hover:text-error transition-colors"
                        aria-label="Salir de la sala">
                        <LogOut className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-2 sm:gap-3 flex-1 min-h-0">

                {/* ── Columna del player ── */}
                <div className="flex-1 min-w-0 flex flex-col gap-2 sm:gap-3">
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
                        onHostStart={isHost ? onHostStart : undefined}
                    />

                    {/* ── Barra de control ── */}
                    <div className="flex flex-wrap items-center gap-2 bg-surface-container rounded-[var(--radius-lg)] border border-outline-variant px-3 py-2.5 shrink-0">
                        {isHost ? (
                            <>
                                <span className="flex items-center gap-1 px-2 h-7 rounded-full bg-[#f59e0b]/10 text-[#f59e0b] md3-label-small shrink-0">
                                    <Crown className="w-3 h-3" /> Host
                                </span>

                                {phase === 'idle' && (
                                    <button onClick={onHostStart}
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
                                            className="flex items-center gap-2 h-9 px-4 sm:px-5 rounded-full bg-primary text-on-primary md3-label-large hover:shadow-[var(--shadow-2)] transition-shadow">
                                            <Pause className="w-4 h-4 fill-current" />
                                            <span className="hidden sm:inline">Pausar para todos</span>
                                            <span className="sm:hidden">Pausar</span>
                                        </button>
                                        <button onClick={() => hostActionsRef.current?.resume(3)}
                                            title="Vuelve a montar el reproductor en todos a la vez (si alguien se desincronizó)"
                                            className="flex items-center gap-1.5 h-9 px-3 sm:px-4 rounded-full border border-outline-variant text-on-surface-variant md3-label-medium hover:bg-on-surface/8 transition-colors">
                                            <RefreshCw className="w-3.5 h-3.5" />
                                            <span className="hidden sm:inline">Re-sincronizar</span>
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
                                        className="flex items-center gap-1.5 h-8 px-3 rounded-full border border-outline-variant text-on-surface-variant md3-label-small hover:bg-on-surface/8 transition-colors">
                                        <Tv className="w-3 h-3" />
                                        <span className="hidden sm:inline">Cambiar episodio</span>
                                        <span className="sm:hidden">Episodio</span>
                                    </button>
                                )}
                                <button onClick={() => setMediaModal('title')}
                                    className="flex items-center gap-1.5 h-8 px-3 rounded-full border border-outline-variant text-on-surface-variant md3-label-small hover:bg-on-surface/8 transition-colors">
                                    <Film className="w-3 h-3" />
                                    <span className="hidden sm:inline">Cambiar título</span>
                                    <span className="sm:hidden">Título</span>
                                </button>
                                <button onClick={() => setConfirmEnd(true)} disabled={hostBusy}
                                    className="h-8 px-3 rounded-full border border-error/30 text-error md3-label-small hover:bg-error/10 transition-colors disabled:opacity-40">
                                    Finalizar
                                </button>
                            </>
                        ) : (
                            <>
                                <span className="md3-body-small text-on-surface-variant flex items-center gap-1.5">
                                    {phase === 'idle' && <><Clock className="w-3.5 h-3.5" /> El host aún no inicia la función</>}
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
                </div>

                {/* ── Columna lateral: chat con presencia integrada ── */}
                <aside className="w-full lg:w-80 xl:w-96 flex flex-col shrink-0 min-h-0 lg:max-h-full">
                    <div className="flex-1 bg-surface-container rounded-[var(--radius-lg)] border border-outline-variant flex flex-col min-h-0 overflow-hidden h-[55dvh] min-h-[340px] lg:h-auto lg:min-h-0">

                        {/* Header del chat: título + stack de conectados */}
                        <button
                            onClick={() => setShowMembers(v => !v)}
                            className="px-3 py-2 border-b border-outline-variant flex items-center gap-2 shrink-0 hover:bg-on-surface/4 transition-colors text-left"
                            aria-expanded={showMembers}
                            aria-label="Ver personas conectadas"
                        >
                            <MessageSquare className="w-3.5 h-3.5 text-on-surface-variant shrink-0" />
                            <span className="md3-label-medium text-on-surface-variant">Chat en vivo</span>
                            <div className="flex-1" />
                            <div className="flex -space-x-1.5">
                                {presence.slice(0, 4).map(m => (
                                    <div key={m.user_id}
                                        className="w-6 h-6 rounded-full bg-primary-container ring-2 ring-surface-container flex items-center justify-center overflow-hidden"
                                        title={m.username}>
                                        {m.avatar_url
                                            ? <Image src={m.avatar_url} alt="" width={24} height={24} className="object-cover" />
                                            : <span className="text-[9px] font-bold text-on-primary-container">{m.username[0]?.toUpperCase()}</span>
                                        }
                                    </div>
                                ))}
                                {presence.length > 4 && (
                                    <div className="w-6 h-6 rounded-full bg-surface-container-highest ring-2 ring-surface-container flex items-center justify-center">
                                        <span className="text-[8px] font-bold text-on-surface-variant">+{presence.length - 4}</span>
                                    </div>
                                )}
                            </div>
                            <span className="md3-label-small text-on-surface-variant">{onlineCount}</span>
                            <ChevronDown className={`w-3.5 h-3.5 text-on-surface-variant transition-transform ${showMembers ? 'rotate-180' : ''}`} />
                        </button>

                        {/* Lista de conectados (expandible) */}
                        {showMembers && (
                            <div className="border-b border-outline-variant px-3 py-2 max-h-36 overflow-y-auto scrollbar-hide shrink-0 bg-surface-container-low">
                                {presence.length === 0 ? (
                                    <span className="md3-body-small text-on-surface-variant/60">Conectando...</span>
                                ) : (
                                    <div className="flex flex-wrap gap-1.5">
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
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Mensajes */}
                        <div className="relative flex-1 min-h-0">
                            <div
                                ref={chatRef}
                                onScroll={onChatScroll}
                                className="absolute inset-0 overflow-y-auto p-3 space-y-2 scrollbar-hide"
                            >
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

                            {/* Pill de mensajes nuevos (cuando el usuario scrolleó arriba) */}
                            {unreadCount > 0 && (
                                <button
                                    onClick={() => scrollChatToBottom()}
                                    className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 h-7 px-3 rounded-full bg-primary text-on-primary md3-label-small shadow-[var(--shadow-3)] hover:shadow-[var(--shadow-4)] transition-shadow"
                                >
                                    <ArrowDown className="w-3 h-3" />
                                    {unreadCount} {unreadCount === 1 ? 'mensaje nuevo' : 'mensajes nuevos'}
                                </button>
                            )}
                        </div>

                        <TypingIndicator names={typingNames} />

                        {replyTo && <ReplyBar msg={replyTo} onCancel={() => setReplyTo(null)} />}

                        {/* Reacciones rápidas (flotan sobre el player) */}
                        <div className="flex items-center justify-center gap-0.5 px-2 pt-1.5 border-t border-outline-variant shrink-0">
                            {REACTION_EMOJIS.map(e => (
                                <button
                                    key={e}
                                    onClick={() => sendReaction(e)}
                                    className="text-xl p-1.5 rounded-full hover:bg-on-surface/8 hover:scale-125 active:scale-95 transition-all leading-none"
                                    aria-label={`Reaccionar con ${e}`}
                                    title="Reacción visible para todos sobre el video"
                                >
                                    {e}
                                </button>
                            ))}
                        </div>

                        <div className="p-2 flex gap-1.5 items-center relative shrink-0">
                            <div className="relative">
                                <button
                                    ref={emojiRef}
                                    onClick={() => setShowEmoji(v => !v)}
                                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${showEmoji ? 'bg-primary/15 text-primary' : 'text-on-surface-variant hover:bg-on-surface/8'}`}
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
                                onChange={e => onMsgTextChange(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                                placeholder="Escribe algo..."
                                maxLength={500}
                                className="flex-1 h-9 rounded-full px-3.5 bg-surface-container-high border border-outline-variant md3-body-small text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 min-w-0"
                            />

                            <button
                                onClick={sendMessage}
                                disabled={!msgText.trim() || sending}
                                className="w-9 h-9 rounded-full bg-primary text-on-primary flex items-center justify-center disabled:opacity-40 hover:shadow-[var(--shadow-1)] transition-all shrink-0"
                                aria-label="Enviar"
                            >
                                {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                            </button>
                        </div>
                        {sendError && <p className="px-3 pb-2 text-xs text-error">{sendError}</p>}
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

            {/* ── Confirmación: finalizar sala ── */}
            {confirmEnd && (
                <ConfirmEndDialog
                    busy={hostBusy}
                    onConfirm={endParty}
                    onCancel={() => setConfirmEnd(false)}
                />
            )}
        </div>
    );
}

