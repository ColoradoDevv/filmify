'use client';

import { Film } from 'lucide-react';
import { RoomsActions } from '@/components/watch-party/RoomsActionsComponent';
import RoomsList from '@/components/watch-party/RoomsList';
import { Party } from '@/types/watch-party';

interface RoomsPageTVProps {
    parties: Party[];
    currentUser: any;
}

export default function RoomsPageTV({ parties, currentUser }: RoomsPageTVProps) {
    return (
        <div className="min-h-screen bg-background p-8 space-y-8 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between gap-4 mb-8">
                <div className="space-y-2">
                    <h1 className="text-4xl font-bold text-white flex items-center gap-4">
                        <Film className="w-10 h-10 text-primary" />
                        Salas de Cine
                    </h1>
                    <p className="text-xl text-text-secondary">
                        Únete a una sala y disfruta de películas con amigos.
                    </p>
                </div>
                <RoomsActions currentUser={currentUser} />
            </div>

            {/* List */}
            <RoomsList initialParties={parties} />
        </div>
    );
}
