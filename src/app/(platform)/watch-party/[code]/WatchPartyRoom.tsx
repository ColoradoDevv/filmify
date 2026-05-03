'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    Users, Send, LogOut, Crown, Loader2, MessageSquare,
    Play, Clock, Copy, Check, Lock, Globe, X, Reply, Smile,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
    getPartyByCode, getPartyMessages, getPartyMembers,
    subscribeToParty, subscribeToMembers, subscribeToMessages,
} from '@/lib/watch-party';
import type { Party, PartyMember, ChatMessage } from '@/types/watch-party';
import VideoPlayer from '@/components/features/VideoPlayer';

interface Props { code: string; }

// ── Emoji picker (no external lib — curated set) ──────────────────────────────
const EMOJI_GROUPS = [
    { label: 'Reacciones', emojis: ['😂','😭','😍','🔥','👏','💀','😮','🤣','❤️','😎','🥹','😤','🤯','😱','🥲','😅','🤩','😏','🙄','😒'] },
    { label: 'Cine',       emojis: ['🎬','🍿','🎥','📽️','🎞️','🎭','🌟','⭐','💫','🏆','👑','🎉','🎊','🎶','🎵','🎸','🎤','🎧','📺','🖥️'] },
    { label: 'Gestos',     emojis: ['👍','👎','👋','🤝','🙌','🤜','🤛','✌️','🤞','👌','🤌','💪','🫶','🫂','🙏','🤷','🤦','💁','🫡','🫠'] },
    { label: 'Objetos',    emojis: ['💬','💭','❓','❗','✅','❌','⚡','💥','✨','🌈','🎯','🚀','💡','🔑','🎁','🍕','🍔','🍦','☕','🧃'] },
];

function EmojiPicker({ onSelect, onClose }: { onSelect: (e: string) => void; onClose: () => void }) {
    const [tab, setTab] = useState(0);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) onClose();
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [onClose]);

    return (
        <div
            ref={ref}
            className="absolute bottom-full right-0 mb-2 w-72 bg-surface-container rounded-[var(--radius-lg)] border border-outline-variant shadow-[var(--shadow-4)] z-50 overflow-hidden"
        >
            {/* Tabs */}
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
            {/* Grid */}
            <div className="grid grid-cols-8 gap-0.5 p-2 max-h-40 overflow-y-auto scrollbar-hide">
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
            {/* Avatar */}
            <div className="w-6 h-6 rounded-full bg-primary-container flex items-center justify-center shrink-0 overflow-hidden mt-auto mb-0.5">
                {msg.avatar_url
                    ? <img src={msg.avatar_url} alt="" className="w-full h-full object-cover" />
                    : <span className="text-[9px] font-bold text-on-primary-container">{msg.username[0]?.toUpperCase()}</span>
                }
            </div>

            {/* Bubble + actions */}
            <div className={`flex flex-col max-w-[78%] ${isMe ? 'items-end' : 'items-start'}`}>
                {!isMe && (
                    <span className="md3-label-small text-on-surface-variant mb-0.5 ml-1">{msg.username}</span>
                )}

                {/* Reply preview */}
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
                    {/* Reply button — left side for own messages */}
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

                    {/* Reply button — right side for others' messages */}
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
    const router   = useRouter();
    const supabase = createClient();

    const [party,      setParty]      = useState<Party | null>(null);
    const [members,    setMembers]    = useState<PartyMember[]>([]);
    const [messages,   setMessages]   = useState<ChatMessage[]>([]);
    const [me,         setMe]         = useState<string | null>(null);
    const [loading,    setLoading]    = useState(true);
    const [error,      setError]      = useState('');
    const [msgText,    setMsgText]    = useState('');
    const [sending,    setSending]    = useState(false);
    const [copied,     setCopied]     = useState(false);
    const [showPlayer, setShowPlayer] = useState(false);
    const [replyTo,    setReplyTo]    = useState<ChatMessage | null>(null);
    const [showEmoji,  setShowEmoji]  = useState(false);

    const chatRef  = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // ── Load ──────────────────────────────────────────────────────────────────
    useEffect(() => {
        let cancelled = false;
        (async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { router.push('/login'); return; }
            setMe(user.id);

            const p = await getPartyByCode(code);
            if (!p) { setError('Sala no encontrada'); setLoading(false); return; }

            await fetch(`/api/watch-party/${code}`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
            });

            const [msgs, mems] = await Promise.all([
                getPartyMessages(p.id),
                getPartyMembers(p.id),
            ]);

            if (cancelled) return;
            setParty(p);
            setMessages(msgs);
            setMembers(mems.map(m => ({ ...m, is_host: m.user_id === p.host_id })));
            setLoading(false);
        })();
        return () => { cancelled = true; };
    }, [code]);

    // ── Realtime ──────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!party) return;

        const ch1 = subscribeToParty(party.id, (updated) => {
            setParty(prev => prev ? { ...prev, ...updated } : prev);
            if (updated.status === 'playing') setShowPlayer(true);
        });

        const ch2 = subscribeToMembers(
            party.id,
            async (row) => {
                const { data: profile } = await supabase
                    .from('profiles').select('username, avatar_url').eq('id', row.user_id).single();
                setMembers(prev => {
                    if (prev.some(m => m.user_id === row.user_id)) return prev;
                    return [...prev, {
                        user_id:    row.user_id,
                        username:   profile?.username ?? 'Usuario',
                        avatar_url: profile?.avatar_url ?? null,
                        is_host:    row.user_id === party.host_id,
                        is_ready:   false,
                        online_at:  row.joined_at,
                    }];
                });
            },
            (row) => setMembers(prev => prev.filter(m => m.user_id !== row.user_id)),
        );

        const ch3 = subscribeToMessages(party.id, (msg) => {
            setMessages(prev => [...prev, msg]);
        });

        return () => {
            supabase.removeChannel(ch1);
            supabase.removeChannel(ch2);
            supabase.removeChannel(ch3);
        };
    }, [party?.id]);

    // ── Auto-scroll ───────────────────────────────────────────────────────────
    useEffect(() => {
        chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' });
    }, [messages]);

    // ── Send message ──────────────────────────────────────────────────────────
    const sendMessage = useCallback(async () => {
        if (!msgText.trim() || sending) return;
        setSending(true);
        const body: Record<string, unknown> = { text: msgText.trim() };
        if (replyTo) {
            body.reply_to_id   = replyTo.id;
            body.reply_preview = replyTo.text.slice(0, 80);
            body.reply_username = replyTo.username;
        }
        await fetch(`/api/watch-party/${code}/message`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        setMsgText('');
        setReplyTo(null);
        setSending(false);
        inputRef.current?.focus();
    }, [msgText, sending, replyTo, code]);

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

    const startParty = async () => {
        await fetch(`/api/watch-party/${code}`, {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'playing' }),
        });
        setShowPlayer(true);
    };

    const leaveParty = async () => {
        await fetch(`/api/watch-party/${code}`, { method: 'DELETE' });
        router.push('/watch-party');
    };

    const copyCode = () => {
        navigator.clipboard.writeText(window.location.origin + '/watch-party/' + code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const isHost = party?.host_id === me;

    // ── States ────────────────────────────────────────────────────────────────
    if (loading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
    );

    if (error) return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
            <p className="md3-title-medium text-on-surface">{error}</p>
            <button onClick={() => router.push('/watch-party')}
                className="h-9 px-5 rounded-full bg-primary text-on-primary md3-label-large">
                Volver al lobby
            </button>
        </div>
    );

    if (!party) return null;

    return (
        <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-3.5rem)] p-4 max-w-7xl mx-auto">

            {/* ── Left: Player ── */}
            <div className="flex-1 flex flex-col gap-3 min-w-0">
                {/* Header bar */}
                <div className="flex items-center gap-3 bg-surface-container rounded-[var(--radius-lg)] border border-outline-variant px-4 py-3">
                    {party.poster_path && (
                        <img src={`https://image.tmdb.org/t/p/w92${party.poster_path}`} alt={party.title}
                            className="w-8 h-12 rounded object-cover shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                        <p className="md3-label-large text-on-surface truncate">{party.name}</p>
                        <p className="md3-body-small text-on-surface-variant truncate">{party.title}</p>
                    </div>
                    <button onClick={copyCode}
                        className="flex items-center gap-1.5 px-3 h-7 rounded-full bg-surface-container-high border border-outline-variant md3-label-small text-on-surface-variant hover:text-on-surface transition-colors">
                        {copied ? <Check className="w-3 h-3 text-[#10b981]" /> : <Copy className="w-3 h-3" />}
                        {code}
                    </button>
                    {party.is_private ? <Lock className="w-4 h-4 text-on-surface-variant shrink-0" /> : <Globe className="w-4 h-4 text-on-surface-variant shrink-0" />}
                    <button onClick={leaveParty}
                        className="w-8 h-8 rounded-full hover:bg-error/10 flex items-center justify-center text-on-surface-variant hover:text-error transition-colors"
                        aria-label="Salir">
                        <LogOut className="w-4 h-4" />
                    </button>
                </div>

                {/* Player / waiting */}
                <div className="flex-1 bg-black rounded-[var(--radius-xl)] overflow-hidden relative min-h-[300px]">
                    {showPlayer && party.status === 'playing' ? (
                        <VideoPlayer
                            mediaId={party.tmdb_id}
                            mediaType={(party.media_type as 'movie' | 'tv') ?? 'movie'}
                            season={party.season ?? 1}
                            episode={party.episode ?? 1}
                            title={party.title}
                            onClose={() => setShowPlayer(false)}
                        />
                    ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-surface-container-lowest">
                            {party.poster_path && (
                                <img src={`https://image.tmdb.org/t/p/w342${party.poster_path}`} alt={party.title}
                                    className="w-32 rounded-[var(--radius-lg)] opacity-40 mb-2" />
                            )}
                            <p className="md3-title-medium text-on-surface">{party.title}</p>
                            <p className="md3-body-small text-on-surface-variant flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5" />
                                {party.status === 'waiting' ? 'Esperando que el host inicie...' : 'Preparando...'}
                            </p>
                            {isHost && party.status === 'waiting' && (
                                <button onClick={startParty}
                                    className="flex items-center gap-2 h-10 px-6 rounded-full bg-primary text-on-primary md3-label-large hover:shadow-[var(--shadow-2)] transition-shadow mt-2">
                                    <Play className="w-4 h-4 fill-current" /> Iniciar para todos
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Right: Members + Chat ── */}
            <div className="w-full lg:w-72 flex flex-col gap-3 shrink-0">

                {/* Members */}
                <div className="bg-surface-container rounded-[var(--radius-lg)] border border-outline-variant p-3">
                    <p className="md3-label-medium text-on-surface-variant mb-2 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" /> {members.length} en la sala
                    </p>
                    <div className="space-y-1.5 max-h-28 overflow-y-auto scrollbar-hide">
                        {members.map(m => (
                            <div key={m.user_id} className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-primary-container flex items-center justify-center shrink-0 overflow-hidden">
                                    {m.avatar_url
                                        ? <img src={m.avatar_url} alt="" className="w-full h-full object-cover" />
                                        : <span className="text-[9px] font-bold text-on-primary-container">{m.username[0]?.toUpperCase()}</span>
                                    }
                                </div>
                                <span className="md3-label-small text-on-surface truncate flex-1">{m.username}</span>
                                {m.is_host && <Crown className="w-3 h-3 text-[#f59e0b] shrink-0" />}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Chat */}
                <div className="flex-1 bg-surface-container rounded-[var(--radius-lg)] border border-outline-variant flex flex-col min-h-0 overflow-hidden">
                    {/* Chat header */}
                    <div className="px-3 py-2 border-b border-outline-variant flex items-center gap-1.5 shrink-0">
                        <MessageSquare className="w-3.5 h-3.5 text-on-surface-variant" />
                        <span className="md3-label-medium text-on-surface-variant">Chat</span>
                    </div>

                    {/* Messages */}
                    <div ref={chatRef} className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-hide min-h-0">
                        {messages.length === 0 && (
                            <p className="md3-body-small text-on-surface-variant/50 text-center py-4">
                                Sé el primero en escribir
                            </p>
                        )}
                        {messages.map(msg => (
                            <MessageBubble
                                key={msg.id}
                                msg={msg}
                                isMe={msg.user_id === me}
                                onReply={handleReply}
                            />
                        ))}
                    </div>

                    {/* Reply bar */}
                    {replyTo && (
                        <ReplyBar msg={replyTo} onCancel={() => setReplyTo(null)} />
                    )}

                    {/* Input area */}
                    <div className="p-2 border-t border-outline-variant flex gap-1.5 items-center relative shrink-0">
                        {/* Emoji button */}
                        <div className="relative">
                            <button
                                onClick={() => setShowEmoji(v => !v)}
                                className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${showEmoji ? 'bg-primary/15 text-primary' : 'text-on-surface-variant hover:bg-on-surface/8'}`}
                                aria-label="Emojis"
                            >
                                <Smile className="w-4 h-4" />
                            </button>
                            {showEmoji && (
                                <EmojiPicker onSelect={insertEmoji} onClose={() => setShowEmoji(false)} />
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
                </div>
            </div>
        </div>
    );
}
