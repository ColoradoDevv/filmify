import LiveTVClient from './LiveTVClient';

export const metadata = {
    title: 'TV en Vivo - FilmiFy',
    description: 'Mira canales de TV en vivo gratis de todo el mundo'
};

// Force dynamic rendering to avoid oversized ISR fallback
// The channel data is too large (29.95 MB) for static generation
export const dynamic = 'force-dynamic';

export default async function LiveTVPage() {
    // Data fetching moved to client component to avoid oversized ISR fallback
    return (
        <div className="min-h-screen bg-background">
            <LiveTVClient />
        </div>
    );
}
