import LiveTVClient from './LiveTVClient';
import { AdSlot } from '@/components/ads';

import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'TV en Vivo gratis - Canales de todo el mundo | FilmiFy',
    description: 'Mira canales de TV en vivo gratis de todo el mundo: noticias, deportes, entretenimiento y más, organizados por categoría.',
    alternates: { canonical: '/live-tv' },
    openGraph: {
        title: 'TV en Vivo gratis - Canales de todo el mundo | FilmiFy',
        description: 'Mira canales de TV en vivo gratis de todo el mundo: noticias, deportes, entretenimiento y más.',
        url: '/live-tv',
        type: 'website',
    },
};

// ISR: rebuild at most once per day. The channel list is cached in Supabase
// so the actual M3U download only happens on the first request after the cache
// expires — subsequent requests within the window are instant.
export const revalidate = 86400;

export default async function LiveTVPage() {
    return (
        <div className="min-h-screen bg-background">
            {/* 📢 Banner publicitario */}
            <div className="px-3 sm:px-6 lg:px-8">
                <AdSlot />
            </div>
            <LiveTVClient />
        </div>
    );
}
