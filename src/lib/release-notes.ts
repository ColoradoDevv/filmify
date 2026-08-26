import type { LucideIcon } from 'lucide-react';
import {
    Search, SlidersHorizontal, ShieldCheck, LayoutGrid, Info,
} from 'lucide-react';

/**
 * Novedades que se enseñan en el modal de «qué hay de nuevo».
 *
 * Van en código, no en la base de datos, porque las notas de una versión viajan
 * CON esa versión: atadas aquí no pueden anunciar algo que todavía no está
 * desplegado, ni quedarse sin publicar porque nadie entró al panel después del
 * despliegue. El anuncio de `/admin/settings` sigue siendo para lo suyo —
 * mensajes operativos puntuales— y este archivo no lo toca.
 *
 * ── Al preparar una versión nueva ───────────────────────────────────────────
 *  1. Subir `RELEASE_VERSION` para que coincida con `package.json`.
 *  2. Reescribir `RELEASE_NOTES` con lo que le importa a QUIEN USA el sitio, no
 *     con el changelog entero.
 *
 * Cada punto es UNA línea que dice qué se hizo, sin explicarlo: esto es un
 * aviso, no un manual. Quien quiera el detalle lo encuentra usando el sitio, y
 * un modal largo se cierra sin leer. Máximo cinco líneas; si no cabe en una,
 * sobra.
 *
 * Cambiar `RELEASE_VERSION` es lo que hace que el modal vuelva a salir: quien ya
 * lo cerró tiene guardada la versión anterior.
 */

/** Debe coincidir con `version` de package.json y con CHANGELOG.md. */
export const RELEASE_VERSION = '2.0.0';

export interface ReleaseHighlight {
    icon: LucideIcon;
    text: string;
}

export interface ReleaseNotes {
    version: string;
    /** Solo para mostrar; formato libre. */
    date: string;
    title: string;
    /** Una sola línea de contexto para todo el modal, no por punto. */
    subtitle: string;
    highlights: ReleaseHighlight[];
}

export const RELEASE_NOTES: ReleaseNotes = {
    version: RELEASE_VERSION,
    date: 'agosto de 2026',
    title: 'Novedades de FilmiFy',
    subtitle: 'Esto es lo que ha cambiado desde tu última visita.',
    highlights: [
        { icon: Search, text: 'Buscador más rápido y en un solo sitio' },
        { icon: LayoutGrid, text: 'Inicio y fichas renovados' },
        { icon: SlidersHorizontal, text: 'Ajustes rehechos' },
        { icon: ShieldCheck, text: 'Más control sobre tu privacidad' },
        { icon: Info, text: 'TV en vivo y Doramas, en pausa' },
    ],
};
