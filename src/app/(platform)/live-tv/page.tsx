import LiveTVClient from './LiveTVClient';

export const metadata = {
    title: 'TV en Vivo - FilmiFy',
    description: 'Mira canales de TV en vivo gratis de todo el mundo'
};

// ISR: rebuild at most once per day. The channel list is cached in Supabase
// so the actual M3U download only happens on the first request after the cache
// expires — subsequent requests within the window are instant.
export const revalidate = 86400;

export default async function LiveTVPage() {
    return (
        <div className="min-h-screen bg-background">
            <LiveTVClient />
        </div>
    );
}
