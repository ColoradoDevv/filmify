import type { Metadata } from 'next';
import { getWorldCupMatches } from '@/services/worldcup';
import WorldCupClient from './WorldCupClient';

export const metadata: Metadata = {
    title: 'Ver Mundial 2026 en Vivo Gratis — Todos los Partidos | FilmiFy',
    description:
        'Mira todos los partidos del Mundial FIFA 2026 gratis y en vivo: marcadores en tiempo real, horarios, grupos y transmisiones en directo de EE.UU., México y Canadá.',
    alternates: { canonical: '/mundial' },
    openGraph: {
        title: 'Ver Mundial 2026 en Vivo Gratis — FilmiFy',
        description:
            'Todos los partidos del Mundial FIFA 2026 en vivo: marcadores, horarios y transmisiones gratis.',
        url: '/mundial',
        type: 'website',
    },
    robots: { index: true, follow: true },
};

// El servicio cachea el calendario (6h) y el estado/marcador (60s) en el Data
// Cache de Next; el cliente refresca en vivo vía /api/worldcup. Mantenemos un
// revalidate corto para que el SSR inicial no quede congelado.
export const revalidate = 60;

export default async function MundialPage() {
    const matches = await getWorldCupMatches();
    return <WorldCupClient initialMatches={matches} />;
}
