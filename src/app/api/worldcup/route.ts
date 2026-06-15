import { NextResponse } from 'next/server';
import { getWorldCupMatches } from '@/services/worldcup';

// El servicio cachea cada fuente en el Data Cache de Next (status/marcador 60s,
// calendario 6h). Forzamos dynamic para que el cliente pueda repreguntar y ver
// los marcadores en vivo sin recargar la página.
export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const matches = await getWorldCupMatches();
        return NextResponse.json({ matches });
    } catch (error) {
        console.error('[/api/worldcup] Failed to fetch matches:', error);
        return NextResponse.json(
            { matches: [], error: 'Failed to fetch matches' },
            { status: 500 },
        );
    }
}
