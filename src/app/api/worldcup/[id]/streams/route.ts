import { NextResponse } from 'next/server';
import { getWorldCupMatchById, getMatchStreams } from '@/services/worldcup';

// Resuelve los servidores de embed de UN partido, bajo demanda (no en la lista),
// para no martillar SportSRC en cada carga de la página principal.
export const dynamic = 'force-dynamic';

export async function GET(
    _req: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const { id } = await params;
    try {
        const match = await getWorldCupMatchById(id);
        if (!match) {
            return NextResponse.json({ sources: [], error: 'Match not found' }, { status: 404 });
        }
        const sources = match.sportsrcId
            ? await getMatchStreams(match.sportsrcId)
            : [];
        return NextResponse.json({ sources });
    } catch (error) {
        console.error(`[/api/worldcup/${id}/streams] Failed:`, error);
        return NextResponse.json(
            { sources: [], error: 'Failed to resolve streams' },
            { status: 500 },
        );
    }
}
