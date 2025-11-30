'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Hash } from 'lucide-react';
import { JoinByCodeModal } from './JoinByCodeModal';
import { MovieSelectorModal } from './MovieSelectorModal';
import { CreatePartyModal } from './CreatePartyModal';
import { createClient } from '@/lib/supabase/client';
import { Movie } from '@/types/tmdb';

interface RoomsActionsProps {
    currentUser: any;
}

export const RoomsActions = ({ currentUser }: RoomsActionsProps) => {
    const router = useRouter();
    const supabase = createClient();
    const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
    const [isSelectorOpen, setIsSelectorOpen] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);

    const handleSelectMovie = (movie: Movie) => {
        setSelectedMovie(movie);
        setIsSelectorOpen(false);
        setIsCreateModalOpen(true);
    };

    const handleCreateParty = async (partyData: { name: string; isPrivate: boolean; password?: string }) => {
        if (!currentUser || !selectedMovie) return;

        const { data, error } = await supabase
            .from('parties')
            .insert({
                tmdb_id: selectedMovie.id,
                title: selectedMovie.title,
                poster_path: selectedMovie.poster_path,
                host_id: currentUser.id,
                status: 'waiting',
                name: partyData.name,
                is_private: partyData.isPrivate,
                password: partyData.password,
                room_code: Math.random().toString(36).substring(2, 8).toUpperCase()
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating party:', JSON.stringify(error, null, 2));
            console.error('Party Data:', {
                tmdb_id: selectedMovie.id,
                host_id: currentUser.id,
                room_code: Math.random().toString(36).substring(2, 8).toUpperCase() // Just checking generation
            });
            return;
        }

        router.push(`/party/${data.id}`);
    };

    const handleCreateClick = () => {
        if (!currentUser) {
            router.push('/login');
            return;
        }
        setIsSelectorOpen(true);
    };

    return (
        <>
            <div className="flex items-center gap-4">
                <button
                    onClick={() => setIsJoinModalOpen(true)}
                    className="px-4 py-2 rounded-lg bg-white/10 text-white font-medium hover:bg-white/20 transition-colors flex items-center gap-2 border border-white/10"
                >
                    <Hash size={18} />
                    Unirse con Código
                </button>
                <button
                    onClick={handleCreateClick}
                    className="px-4 py-2 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 transition-colors flex items-center gap-2 shadow-lg shadow-primary/20"
                >
                    <Plus size={18} />
                    Crear Sala
                </button>
            </div>

            <JoinByCodeModal
                isOpen={isJoinModalOpen}
                onClose={() => setIsJoinModalOpen(false)}
            />

            <MovieSelectorModal
                isOpen={isSelectorOpen}
                onClose={() => setIsSelectorOpen(false)}
                onSelect={handleSelectMovie}
            />

            {selectedMovie && (
                <CreatePartyModal
                    isOpen={isCreateModalOpen}
                    onClose={() => setIsCreateModalOpen(false)}
                    onCreate={handleCreateParty}
                    movieTitle={selectedMovie.title}
                    currentUser={currentUser}
                />
            )}
        </>
    );
};
