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
 *     con el changelog entero: tres o cuatro puntos, en su idioma. Que la CSP
 *     ahora tenga lista explícita es relevante en CHANGELOG.md, no aquí.
 *
 * Cambiar `RELEASE_VERSION` es lo que hace que el modal vuelva a salir: quien ya
 * lo cerró tiene guardada la versión anterior.
 */

/** Debe coincidir con `version` de package.json y con CHANGELOG.md. */
export const RELEASE_VERSION = '2.0.0';

export interface ReleaseHighlight {
    icon: LucideIcon;
    title: string;
    description: string;
}

export interface ReleaseNotes {
    version: string;
    /** Solo para mostrar; formato libre. */
    date: string;
    title: string;
    intro: string;
    highlights: ReleaseHighlight[];
}

export const RELEASE_NOTES: ReleaseNotes = {
    version: RELEASE_VERSION,
    date: 'agosto de 2026',
    title: 'Novedades de FilmiFy',
    intro: 'Esto es lo que ha cambiado desde la última vez que entraste.',
    highlights: [
        {
            icon: Search,
            title: 'Buscador más rápido y en un solo sitio',
            description:
                'Las sugerencias aparecen casi al instante y ahora hay una única barra, la de arriba. En el móvil ocupa la pantalla entera para que se vea bien.',
        },
        {
            icon: LayoutGrid,
            title: 'Inicio y fichas renovados',
            description:
                'La portada tiene acceso directo a todas las secciones. Y si una película todavía no está disponible, ya no te encuentras un error: ves su ficha con sinopsis, reparto y tráiler.',
        },
        {
            icon: SlidersHorizontal,
            title: 'Ajustes rehechos',
            description:
                'Más claros y más compactos. Se fueron los interruptores que no hacían nada y los que quedan funcionan de verdad, incluido el de reducir animaciones.',
        },
        {
            icon: ShieldCheck,
            title: 'Tu perfil, más privado',
            description:
                'Quién puede ver tus favoritos, tu historial y tu perfil se decide ahora en el servidor. Antes esos ajustes no se aplicaban del todo.',
        },
        {
            icon: Info,
            title: 'TV en vivo y Doramas, en pausa',
            description:
                'Sus proveedores dejaron de funcionar de forma fiable, así que las hemos cerrado temporalmente en vez de dejarte enlaces rotos. Volverán.',
        },
    ],
};
