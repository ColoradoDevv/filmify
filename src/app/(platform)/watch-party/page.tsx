import type { Metadata } from 'next';
import Link from 'next/link';
import { Users, LogIn } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import WatchPartyLobby from './WatchPartyLobby';
import { AdSlot } from '@/components/ads';

export const metadata: Metadata = {
    robots: { index: false, follow: false },
    title: 'Watch Party — FilmiFy',
    description: 'Crea o únete a una sala para ver películas y series con amigos en tiempo real.',
};

export default async function WatchPartyPage() {
    // Watch Party requires an account (rooms, chat and sync live in the DB).
    // Anonymous visitors get a friendly explanation instead of a redirect.
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return (
            <div className="min-h-[70vh] flex items-center justify-center px-4">
                <div className="max-w-md w-full text-center space-y-6">
                    <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                        <Users className="w-9 h-9 text-primary" />
                    </div>

                    <div className="space-y-2">
                        <h1 className="text-2xl sm:text-3xl font-bold text-white">Watch Party</h1>
                        <p className="text-text-secondary leading-relaxed">
                            Mira películas y series en sincronía con tus amigos, con chat en
                            tiempo real. Para crear o unirte a una sala necesitas iniciar
                            sesión — es gratis y toma menos de un minuto.
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                        <Link
                            href="/login?next=/watch-party"
                            className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 rounded-full bg-primary text-white font-semibold hover:bg-primary-hover transition-colors"
                        >
                            <LogIn className="w-4 h-4" />
                            Iniciar sesión
                        </Link>
                        <Link
                            href="/register?next=/watch-party"
                            className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 rounded-full bg-white/5 border border-white/10 text-white font-semibold hover:bg-white/10 transition-colors"
                        >
                            Crear cuenta gratis
                        </Link>
                    </div>

                    <p className="text-xs text-text-muted">
                        Ver películas y series no requiere cuenta — esto solo aplica a Watch Party.
                    </p>

                    {/* 📢 Banner publicitario */}
                    <AdSlot />
                </div>
            </div>
        );
    }

    return (
        <>
            {/* 📢 Banner publicitario */}
            <div className="px-4 sm:px-6 lg:px-8 pt-4">
                <AdSlot className="my-0" />
            </div>
            <WatchPartyLobby />
        </>
    );
}
