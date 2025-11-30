'use client';

import { useWatchParty } from '@/hooks/useWatchParty';
import { PartyChat } from './PartyChat';
import { PartyLobby } from './PartyLobby';
import { PartyPlayer } from './PartyPlayer';
import { Loader2 } from 'lucide-react';

interface PartyRoomProps {
    partyId: string;
    currentUser: {
        id: string;
        name: string;
        avatar_url: string | null;
    };
}

export const PartyRoom = ({ partyId, currentUser }: PartyRoomProps) => {
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
    } = useWatchParty({ partyId, currentUser });

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
            <div className="flex-1 relative z-10 flex flex-col min-w-0">
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
                    />
                )}
            </div>

            {/* Chat Sidebar */}
            <div className="relative z-20 h-full border-l border-white/10 shadow-2xl">
                <PartyChat
                    messages={messages}
                    currentUser={currentUser}
                    onSendMessage={sendMessage}
                />
            </div>
        </div>
    );
};
