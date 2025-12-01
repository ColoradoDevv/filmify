import { createClient } from '@/lib/supabase/server';
import RoomsList from '@/components/watch-party/RoomsList';
import { Film } from 'lucide-react';
import { RoomsActions } from '@/components/watch-party/RoomsActionsComponent';

import { fetchSettings } from '@/app/admin/settings/actions';
import { AlertTriangle } from 'lucide-react';

export const dynamic = 'force-dynamic';

import { isTVDevice } from '@/lib/device-detection';
import RoomsPageTV from './page-tv';
import TVLayoutWrapper from '@/components/layout/TVLayoutWrapper';
import TVSidebar from '@/components/layout/TVSidebar';

export default async function RoomsPage({
    searchParams,
}: {
    searchParams: Promise<{ tv?: string }>;
}) {
    const { tv } = await searchParams;
    const settings = await fetchSettings();

    if (!settings.enableWatchParty) {
        return (
            <div className="container mx-auto px-4 py-16 flex flex-col items-center justify-center text-center space-y-4">
                <div className="bg-yellow-500/10 p-4 rounded-full">
                    <AlertTriangle className="w-12 h-12 text-yellow-500" />
                </div>
                <h1 className="text-2xl font-bold text-white">Función Deshabilitada</h1>
                <p className="text-gray-400 max-w-md">
                    Las Watch Parties están temporalmente deshabilitadas por el administrador.
                    Por favor, intenta más tarde.
                </p>
            </div>
        );
    }

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

    const isGlobalTV = await isTVDevice();
    const isManualTV = tv === 'true';

    if (isGlobalTV) {
        return <RoomsPageTV parties={parties || []} currentUser={user} />;
    }

    if (isManualTV) {
        return (
            <TVLayoutWrapper
                forceTVMode={true}
                tvLayout={
                    <div className="flex min-h-screen bg-background text-white">
                        <TVSidebar />
                        <main className="flex-1 ml-0 lg:ml-24 p-8 overflow-x-hidden">
                            <RoomsPageTV parties={parties || []} currentUser={user} />
                        </main>
                    </div>
                }>
                <div />
            </TVLayoutWrapper>
        );
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
