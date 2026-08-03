'use client';

import { Analytics } from '@vercel/analytics/react';

/**
 * Wrapper de Vercel Analytics con `beforeSend`.
 *
 * Normaliza las URLs antes de enviarlas para que el dashboard de páginas no se
 * fragmente en miles de variantes con query strings:
 *   - /search?q=batman  → /search   (el término ya se captura como evento
 *     `search`, ver src/lib/analytics.ts)
 *   - se eliminan parámetros de campañas/UTM y demás query params, que solo
 *     ensucian el informe de páginas.
 *
 * Los eventos personalizados (`play`, `search`, etc.) NO se tocan.
 */
export default function AnalyticsClient() {
    return (
        <Analytics
            beforeSend={(event) => {
                if (event.type !== 'pageview') return event;
                try {
                    const url = new URL(event.url);
                    url.search = ''; // descarta query params del pageview
                    return { ...event, url: url.toString() };
                } catch {
                    return event;
                }
            }}
        />
    );
}
