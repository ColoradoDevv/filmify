'use client';

import { useWatchParty } from '@/hooks/useWatchParty';
import { PartyChat } from './PartyChat';
import { PartyLobby } from './PartyLobby';
import { PartyPlayer } from './PartyPlayer';
import { Loader2, MessageSquare, X, ChevronRight, ChevronLeft } from 'lucide-react';
import { useState, useEffect } from 'react';

interface PartyRoomProps {
    partyId: string;
    currentUser: {
        id: string;
        name: string;
        avatar_url: string | null;
    };
}

export const PartyRoom = ({ partyId, currentUser }: PartyRoomProps) => {
    const [isChatOpen, setIsChatOpen] = useState(true);
    const [lastReadTime, setLastReadTime] = useState(Date.now());
    const {
        party,
        members,
        messages,
        isLoading,
        sendMessage,
        toggleReady,
        startParty,
        setPlaying,
        endParty,
        sendControl,
        sendSync,
        lastControlAction,
        syncData,
        memberJoinedAt,
        updateLanguage,
        updateSource,
    } = useWatchParty({ partyId, currentUser });

    // Update lastReadTime when chat opens
    useEffect(() => {
        if (isChatOpen && messages.length > 0) {
            const lastMsgTime = new Date(messages[messages.length - 1].timestamp).getTime();
            setLastReadTime(prev => Math.max(prev, lastMsgTime));
        }
    }, [isChatOpen, messages]);

    console.log('PartyRoom rendering', { partyId, isLoading, partyStatus: party?.status });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-[#0b0e11] text-white">
                <Loader2 className="w-10 h-10 animate-spin text-purple-600" />
            </div>
        );
    }

    if (!party) {
        return (
            <div className="flex items-center justify-center h-screen bg-[#0b0e11] text-white">
                <h1 className="text-2xl font-bold">Party not found</h1>
            </div>
        );
    }

    const isHost = party.host_id === currentUser.id;

    return (
        <div className="relative flex h-[calc(100vh-9rem)] overflow-hidden rounded-xl border border-white/10 bg-black/90 group/room">
            {/* Immersive Background */}
            <div className="absolute inset-0 z-0">
                {party.poster_path && (
                    <div
                        className="absolute inset-0 bg-cover bg-center blur-xl opacity-30 scale-110 transition-transform duration-1000"
                        style={{
                            backgroundImage: `url(https://image.tmdb.org/t/p/original${party.poster_path})`,
                        }}
                    />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0b0e11] via-[#0b0e11]/80 to-transparent" />
                <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" />
            </div>

            {/* Main Content Area (Lobby or Player) */}
            <div className={`relative z-10 flex flex-col min-w-0 transition-all duration-300 ease-in-out ${isChatOpen ? 'w-[calc(100%-320px)]' : 'w-full'}`}>
                {party.status === 'waiting' ? (
                    <PartyLobby
                        party={party}
                        members={members}
                        currentUser={currentUser}
                        onToggleReady={toggleReady}
                        onStartParty={startParty}
                    />
                ) : (
                    <PartyPlayer
                        party={party}
                        isHost={isHost}
                        onEndParty={endParty}
                        onControl={sendControl}
                        onSync={sendSync}
                        onSetPlaying={setPlaying}
                        lastControlAction={lastControlAction}
                        syncData={syncData}
                        memberJoinedAt={memberJoinedAt}
                        onUpdateLanguage={updateLanguage}
                        onUpdateSource={updateSource}
                    />
                )}

                {/* Chat Toggle Button (Floating) */}
                <button
                    onClick={() => setIsChatOpen(!isChatOpen)}
                    className={`absolute top-4 right-4 z-50 p-3 rounded-full bg-black/50 backdrop-blur-md border border-white/10 text-white hover:bg-white/10 transition-all shadow-xl ${isChatOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                    title="Abrir Chat"
                >
                    <MessageSquare size={20} />
                    {messages.some(m => new Date(m.timestamp).getTime() > lastReadTime && m.user_id !== currentUser.id) && (
                        <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                    )}
                </button>
            </div>

            {/* Chat Sidebar */}
            <div
                className={`relative z-20 h-full border-l border-white/10 shadow-2xl transition-all duration-300 ease-in-out overflow-hidden ${isChatOpen ? 'w-80 translate-x-0' : 'w-0 translate-x-full border-l-0'}`}
            >
                <div className="h-full w-80 flex flex-col relative">
                    {/* Close Button inside Chat */}
                    <button
                        onClick={() => setIsChatOpen(false)}
                        className="absolute top-3 right-3 z-30 p-2 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                        title="Ocultar Chat"
                    >
                        <ChevronRight size={20} />
                    </button>

                    <PartyChat
                        messages={messages}
                        currentUser={currentUser}
                        onSendMessage={sendMessage}
                    />
                </div>
            </div>
        </div>
    );
};
