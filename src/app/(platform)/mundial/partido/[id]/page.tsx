import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getWorldCupMatchById, getMatchInfo } from '@/services/worldcup';
import MatchView from './MatchView';
import MatchInfoView from './MatchInfoView';

export const revalidate = 60;

export async function generateMetadata(
    { params }: { params: Promise<{ id: string }> },
): Promise<Metadata> {
    const { id } = await params;
    const match = await getWorldCupMatchById(id);
    // noindex explícito si el partido no existe → evita soft-404.
    if (!match) {
        return {
            title: 'Partido no encontrado — Mundial 2026 | FilmiFy',
            robots: { index: false, follow: false },
        };
    }
    const vs = `${match.homeTeam} vs ${match.awayTeam}`;
    // Título/descripción adaptados al estado del partido.
    const titleTag =
        match.status === 'LIVE' ? 'EN VIVO'
        : match.status === 'FINISHED' ? 'Resultado y estadísticas'
        : 'Previa y alineaciones';
    const desc =
        match.status === 'LIVE'
            ? `Mira ${vs} en vivo y gratis (${match.group}, Mundial 2026). Marcador en tiempo real y transmisión en directo en FilmiFy.`
            : match.status === 'FINISHED'
            ? `Resultado, estadísticas y resumen de ${vs} (${match.group}, Mundial 2026) en FilmiFy.`
            : `Previa de ${vs} (${match.group}, Mundial 2026): alineaciones, forma reciente y datos para tu predicción en FilmiFy.`;
    return {
        title: `${vs} — ${titleTag} | Mundial 2026 | FilmiFy`,
        description: desc,
        alternates: { canonical: `/mundial/partido/${id}` },
        openGraph: {
            title: `${vs} — ${titleTag} · Mundial 2026`,
            description: desc,
            url: `/mundial/partido/${id}`,
            type: 'website',
        },
    };
}

export default async function PartidoPage(
    { params }: { params: Promise<{ id: string }> },
) {
    const { id } = await params;
    const match = await getWorldCupMatchById(id);

    if (!match) {
        return (
            <div className="max-w-5xl mx-auto py-16 text-center space-y-4">
                <p className="text-lg font-semibold text-white">Partido no encontrado</p>
                <p className="text-sm text-text-secondary">
                    Puede que ya haya terminado o que el calendario se haya actualizado.
                </p>
                <Link
                    href="/mundial"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-white text-sm font-medium"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Volver al Mundial 2026
                </Link>
            </div>
        );
    }

    // LIVE → reproductor (con servidores). SCHEDULED/FINISHED → vista informativa
    // (sin reproductor): preview para predecir o resultado con estadísticas.
    if (match.status === 'LIVE') {
        return <MatchView match={match} />;
    }

    const info = await getMatchInfo(match);
    return <MatchInfoView match={match} info={info} />;
}
