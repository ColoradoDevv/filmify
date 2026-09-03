import { NextRequest, NextResponse } from 'next/server';
import { isConsentRequiredForCountry } from '@/lib/consent-region';

/**
 * ¿Este visitante necesita consentimiento previo (geo, vía `cf-ipcountry`)?
 *
 * Antes lo resolvía el middleware y lo publicaba en `data-consent-required`
 * de `<html>`, leído en el layout raíz con `headers()` — pero ESE
 * `headers()` bastaba para forzar renderizado dinámico en TODA la web (nada
 * de ISR), que es justo lo que le impedía a Cloudflare cachear cualquier
 * página (ver CLAUDE.md, fix de rendimiento sep-2026). Esta ruta es la única
 * pieza que necesita ser dinámica; el resto de la web vuelve a ser estática.
 */
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    const required = isConsentRequiredForCountry(request.headers.get('cf-ipcountry'));
    return NextResponse.json(
        { required },
        { headers: { 'Cache-Control': 'private, no-store' } },
    );
}
