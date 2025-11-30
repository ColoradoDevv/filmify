import { createClient } from '@/lib/supabase/server';
import RoomsList from '@/components/watch-party/RoomsList';
import { Film } from 'lucide-react';
import { RoomsActions } from '@/components/watch-party/RoomsActions';

export const dynamic = 'force-dynamic';

export default async function RoomsPage() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    const { data: parties, error } = await supabase
        .from('parties')
        .select('id, tmdb_id, title, poster_path, host_id, status, created_at, name, is_private, room_code, party_members(count)')
        .neq('status', 'finished')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching parties:', error);
    }

    return (
        <div className="container mx-auto px-4 py-8 space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-2">
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <Film className="text-primary" />
                        Salas de Cine
                    </h1>
                    <p className="text-gray-400">
                        Únete a una sala y disfruta de películas con amigos en tiempo real.
                    </p>
                </div>
                <RoomsActions currentUser={user} />
            </div>

            {/* List */}
            <RoomsList initialParties={parties || []} />
        </div>
    );
}
