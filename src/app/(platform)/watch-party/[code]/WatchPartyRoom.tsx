'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    Users, Send, LogOut, Crown, Loader2, MessageSquare,
    Play, Clock, Copy, Check, Lock, Globe
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
    getPartyByCode, getPartyMessages, getPartyMembers,
    subscribeToParty, subscribeToMembers, subscribeToMessages,
} from '@/lib/watch-party';
import type { Party, PartyMember, ChatMessage } from '@/types/watch-party';
import VideoPlayer from '@/components/features/VideoPlayer';

interface Props { code: string; }

export default function WatchPartyRoom({ code }: Props) {
    const router = useRouter();
    const supabase = createClient();

    const [party,    setParty]    = useState<Party | null>(null);
    const [members,  setMembers]  = useState<PartyMember[]>([]);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [me,       setMe]       = useState<string | null>(null);
    const [loading,  setLoading]  = useState(true);
    const [error,    setError]    = useState('');
    const [msgText,  setMsgText]  = useState('');
    const [sending,  setSending]  = useState(false);
    const [copied,   setCopied]   = useState(false);
    const [showPlayer, setShowPlayer] = useState(false);

    const chatRef = useRef<HTMLDivElement>(null);

    // ── Load initial data ───────────────────────────────────────────────────
    useEffect(() => {
        let cancelled = false;
        (async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { router.push('/login'); return; }
            setMe(user.id);

            const p = await getPartyByCode(code);
            if (!p) { setError('Sala no encontrada'); setLoading(false); return; }

            // Auto-join if not already a member
            await fetch(`/api/watch-party/${code}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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

    // ── Realtime subscriptions ──────────────────────────────────────────────
    useEffect(() => {
        if (!party) return;

        const ch1 = subscribeToParty(party.id, (updated) => {
            setParty(prev => prev ? { ...prev, ...updated } : prev);
            if (updated.status === 'playing') setShowPlayer(true);
        });

        const ch2 = subscribeToMembers(
            party.id,
            async (row) => {
                // Fetch profile for new member
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

    // ── Auto-scroll chat ────────────────────────────────────────────────────
    useEffect(() => {
        chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' });
    }, [messages]);

    // ── Actions ─────────────────────────────────────────────────────────────
    const sendMessage = async () => {
        if (!msgText.trim() || sending) return;
        setSending(true);
        await fetch(`/api/watch-party/${code}/message`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: msgText.trim() }),
        });
        setMsgText('');
        setSending(false);
    };

    const startParty = async () => {
        await fetch(`/api/watch-party/${code}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'playing' }),
        });
        setShowPlayer(true);
    };

    const leaveParty = async () => {
        await fetch(`/api/watch-party/${code}`, { method: 'DELETE' });
        router.push('/watch-party');
    };

    const copyCode = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const isHost = party?.host_id === me;

    // ── Render ───────────────────────────────────────────────────────────────
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

            {/* ── Left: Player area ── */}
            <div className="flex-1 flex flex-col gap-3 min-w-0">
                {/* Party header */}
                <div className="flex items-center gap-3 bg-surface-container rounded-[var(--radius-lg)] border border-outline-variant px-4 py-3">
                    {party.poster_path && (
                        <img src={`https://image.tmdb.org/t/p/w92${party.poster_path}`}
                            alt={party.title}
                            className="w-8 h-12 rounded object-cover shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                        <p className="md3-label-large text-on-surface truncate">{party.name}</p>
                        <p className="md3-body-small text-on-surface-variant truncate">{party.title}</p>
                    </div>

                    {/* Room code */}
                    <button onClick={copyCode}
                        className="flex items-center gap-1.5 px-3 h-7 rounded-full bg-surface-container-high border border-outline-variant md3-label-small text-on-surface-variant hover:text-on-surface transition-colors">
                        {copied ? <Check className="w-3 h-3 text-[#10b981]" /> : <Copy className="w-3 h-3" />}
                        {code}
                    </button>

                    {party.is_private
                        ? <Lock className="w-4 h-4 text-on-surface-variant shrink-0" />
                        : <Globe className="w-4 h-4 text-on-surface-variant shrink-0" />
                    }

                    <button onClick={leaveParty}
                        className="w-8 h-8 rounded-full hover:bg-error/10 flex items-center justify-center text-on-surface-variant hover:text-error transition-colors"
                        aria-label="Salir de la sala">
                        <LogOut className="w-4 h-4" />
                    </button>
                </div>

                {/* Player / waiting screen */}
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
                                <img src={`https://image.tmdb.org/t/p/w342${party.poster_path}`}
                                    alt={party.title}
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
                                    <Play className="w-4 h-4 fill-current" />
                                    Iniciar para todos
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
                    <div className="space-y-1.5 max-h-32 overflow-y-auto scrollbar-hide">
                        {members.map(m => (
                            <div key={m.user_id} className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-primary-container flex items-center justify-center shrink-0 overflow-hidden">
                                    {m.avatar_url
                                        ? <img src={m.avatar_url} alt="" className="w-full h-full object-cover" />
                                        : <span className="text-[10px] font-bold text-on-primary-container">
                                            {m.username[0]?.toUpperCase()}
                                          </span>
                                    }
                                </div>
                                <span className="md3-label-small text-on-surface truncate flex-1">{m.username}</span>
                                {m.is_host && <Crown className="w-3 h-3 text-[#f59e0b] shrink-0" />}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Chat */}
                <div className="flex-1 bg-surface-container rounded-[var(--radius-lg)] border border-outline-variant flex flex-col min-h-0">
                    <div className="px-3 py-2 border-b border-outline-variant flex items-center gap-1.5">
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
                            <div key={msg.id} className={msg.type === 'system' ? 'text-center' : ''}>
                                {msg.type === 'system' ? (
                                    <span className="md3-label-small text-on-surface-variant/60 italic">{msg.text}</span>
                                ) : (
                                    <div className={`flex gap-2 ${msg.user_id === me ? 'flex-row-reverse' : ''}`}>
                                        <div className="w-5 h-5 rounded-full bg-primary-container flex items-center justify-center shrink-0 overflow-hidden mt-0.5">
                                            {msg.avatar_url
                                                ? <img src={msg.avatar_url} alt="" className="w-full h-full object-cover" />
                                                : <span className="text-[8px] font-bold text-on-primary-container">
                                                    {msg.username[0]?.toUpperCase()}
                                                  </span>
                                            }
                                        </div>
                                        <div className={`max-w-[80%] ${msg.user_id === me ? 'items-end' : 'items-start'} flex flex-col`}>
                                            {msg.user_id !== me && (
                                                <span className="md3-label-small text-on-surface-variant mb-0.5">{msg.username}</span>
                                            )}
                                            <div className={`px-3 py-1.5 rounded-2xl md3-body-small ${
                                                msg.user_id === me
                                                    ? 'bg-primary text-on-primary rounded-tr-sm'
                                                    : 'bg-surface-container-high text-on-surface rounded-tl-sm'
                                            }`}>
                                                {msg.text}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Input */}
                    <div className="p-2 border-t border-outline-variant flex gap-2">
                        <input
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
