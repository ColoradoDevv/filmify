'use client';

import { useEffect } from 'react';
import { useTVDetection } from '@/hooks/useTVDetection';

/**
 * Aplica la clase `tv-mode` en `<body>` según la detección de TV.
 *
 * Antes esto lo resolvía `isTVDevice()` en el layout raíz, leyendo
 * `headers()`/`cookies()` en el servidor — pero esa sola llamada basta para
 * que Next marque CUALQUIER página como dinámica (nada de ISR), que es justo
 * lo que le impedía a Cloudflare cachear cualquier ruta (ver CLAUDE.md, fix
 * de rendimiento sep-2026). El coste es un parpadeo breve hasta que este
 * efecto corre en cliente — el mismo compromiso que ya acepta
 * `TVLayoutWrapper` en /browse.
 */
export default function TVModeBoot() {
    const { isTV } = useTVDetection();

    useEffect(() => {
        document.body.classList.toggle('tv-mode', isTV);
    }, [isTV]);

    return null;
}
