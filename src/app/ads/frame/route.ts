import { headers } from 'next/headers';
import { getAdsConfig } from '@/lib/env';

/**
 * Documento aislado para un anuncio.
 *
 * Existe para que el creativo NUNCA se ejecute en el mismo origen que la
 * página. `AdBanner` monta esta ruta en un iframe con
 * `sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"` —
 * sin `allow-same-origin`, así que el documento queda en un origen opaco: no
 * alcanza el DOM del padre, no puede navegar la página y no puede registrar
 * listeners sobre ella.
 *
 * El montaje anterior (iframe escrito con document.write y sandbox
 * `allow-scripts allow-same-origin`) bloqueaba la navegación y los pop-ups,
 * pero al ser mismo origen el creativo sí podía escribir en el documento de la
 * página — verificado con un creativo hostil de prueba. Desde ahí, inyectando
 * un <script> en el padre, se escapa del sandbox por completo. Es la misma
 * clase de fallo que dejó el sitio inservible en móvil en junio de 2026.
 *
 * Servirlo desde una ruta propia resuelve además el problema del CSP: aquí sí
 * podemos firmar el `atOptions` inline con el nonce de la petición, en vez de
 * pelearnos con una política que rechaza todo inline sin él.
 *
 * La zona se pide por NOMBRE, nunca por clave ni por URL: así ningún parámetro
 * externo puede acabar cargando un script de terceros arbitrario.
 */

export const dynamic = 'force-dynamic';

const ZONES = {
    leaderboard: { width: 728, height: 90 },
    rectangle: { width: 300, height: 250 },
    mobile: { width: 320, height: 50 },
} as const;

type ZoneName = keyof typeof ZONES;

function keyFor(zone: ZoneName): string {
    const ads = getAdsConfig();
    if (zone === 'leaderboard') return ads.leaderboardKey;
    if (zone === 'rectangle') return ads.rectangleKey;
    return ads.mobileKey;
}

/** Las claves de zona son hashes hexadecimales. Cualquier otra cosa no entra
 *  en el HTML: es lo único que evita que una variable mal puesta se convierta
 *  en inyección. */
const KEY_PATTERN = /^[a-f0-9]{16,64}$/i;

const empty = () =>
    new Response('', {
        status: 204,
        headers: { 'Cache-Control': 'no-store' },
    });

export async function GET(request: Request) {
    const zone = new URL(request.url).searchParams.get('zone');
    if (!zone || !(zone in ZONES)) return empty();

    const { width, height } = ZONES[zone as ZoneName];
    const key = keyFor(zone as ZoneName);
    if (!KEY_PATTERN.test(key)) return empty();

    const nonce = (await headers()).get('x-nonce') ?? '';

    // El invoke.js de la red usa document.write, así que tiene que ejecutarse
    // durante el parseo del documento: aquí eso es lo natural, no un rodeo.
    const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="robots" content="noindex,nofollow">
<style>html,body{margin:0;padding:0;overflow:hidden;background:transparent}</style>
</head>
<body>
<script${nonce ? ` nonce="${nonce}"` : ''}>window.atOptions={'key':'${key}','format':'iframe','height':${height},'width':${width},'params':{}};</script>
<script src="https://www.highperformanceformat.com/${key}/invoke.js"></script>
</body>
</html>`;

    return new Response(html, {
        headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'no-store',
            'X-Robots-Tag': 'noindex, nofollow',
        },
    });
}
