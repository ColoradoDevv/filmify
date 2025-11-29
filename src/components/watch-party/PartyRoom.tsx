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
        endParty,
        sendControl,
        lastControlAction,
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
        <div className="flex h-[calc(100vh-9rem)] bg-[#0b0e11] overflow-hidden rounded-xl border border-white/10">
            {/* Main Content Area (Lobby or Player) */}
            <div className="flex-1 relative">
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
                        lastControlAction={lastControlAction}
                    />
                )}
            </div>

            {/* Chat Sidebar */}
            <PartyChat
                messages={messages}
                currentUser={currentUser}
                onSendMessage={sendMessage}
            />
        </div>
    );
};
