/**
 * Géneros con landing page propia (/genero/[slug]).
 * Los ids son los oficiales de TMDB para películas.
 * Cada entrada lleva título y descripción únicos — contenido real para SEO,
 * no plantillas vacías.
 */

export interface GenrePage {
    slug: string;
    tmdbId: number;
    name: string;
    /** <title> de la página */
    title: string;
    /** meta description + intro visible */
    description: string;
}

export const GENRE_PAGES: GenrePage[] = [
    {
        slug: 'accion',
        tmdbId: 28,
        name: 'Acción',
        title: 'Películas de Acción online gratis | FilmiFy',
        description: 'Mira las mejores películas de acción online: persecuciones, artes marciales, superhéroes y pura adrenalina. Catálogo actualizado a diario, gratis y sin registro.',
    },
    {
        slug: 'comedia',
        tmdbId: 35,
        name: 'Comedia',
        title: 'Películas de Comedia online gratis | FilmiFy',
        description: 'Las comedias más divertidas para ver online: humor para toda la familia, comedia romántica y sátira. Ríete gratis y sin crear cuenta.',
    },
    {
        slug: 'terror',
        tmdbId: 27,
        name: 'Terror',
        title: 'Películas de Terror online gratis | FilmiFy',
        description: 'Películas de terror y horror para ver online: sustos, slashers, casas embrujadas y horror psicológico. Gratis, sin registro y actualizado cada semana.',
    },
    {
        slug: 'drama',
        tmdbId: 18,
        name: 'Drama',
        title: 'Películas de Drama online gratis | FilmiFy',
        description: 'Los dramas más aclamados del cine para ver online: historias humanas, biografías y películas premiadas. Catálogo gratuito en constante actualización.',
    },
    {
        slug: 'ciencia-ficcion',
        tmdbId: 878,
        name: 'Ciencia ficción',
        title: 'Películas de Ciencia Ficción online gratis | FilmiFy',
        description: 'Ciencia ficción online: viajes espaciales, futuros distópicos, inteligencia artificial y mundos imposibles. Mira gratis sin necesidad de cuenta.',
    },
    {
        slug: 'romance',
        tmdbId: 10749,
        name: 'Romance',
        title: 'Películas Románticas online gratis | FilmiFy',
        description: 'Películas románticas para ver online: amores imposibles, comedias románticas y clásicos del género. Gratis y sin registrarte.',
    },
    {
        slug: 'animacion',
        tmdbId: 16,
        name: 'Animación',
        title: 'Películas de Animación online gratis | FilmiFy',
        description: 'Animación para todas las edades: estrenos animados, clásicos y cine familiar para ver online gratis, sin crear cuenta.',
    },
    {
        slug: 'suspenso',
        tmdbId: 53,
        name: 'Suspenso',
        title: 'Películas de Suspenso online gratis | FilmiFy',
        description: 'Thrillers y películas de suspenso para ver online: misterio, crimen y tensión hasta el último minuto. Catálogo gratuito actualizado a diario.',
    },
    {
        slug: 'aventura',
        tmdbId: 12,
        name: 'Aventura',
        title: 'Películas de Aventura online gratis | FilmiFy',
        description: 'Películas de aventura para ver online: expediciones, tesoros perdidos y viajes épicos. Gratis y sin registro.',
    },
    {
        slug: 'fantasia',
        tmdbId: 14,
        name: 'Fantasía',
        title: 'Películas de Fantasía online gratis | FilmiFy',
        description: 'Cine de fantasía online: magia, criaturas legendarias y mundos imaginarios. Mira gratis sin necesidad de cuenta.',
    },
    {
        slug: 'crimen',
        tmdbId: 80,
        name: 'Crimen',
        title: 'Películas de Crimen online gratis | FilmiFy',
        description: 'Películas de crimen y mafia para ver online: atracos, detectives y bajos fondos. Catálogo gratuito en actualización constante.',
    },
    {
        slug: 'familia',
        tmdbId: 10751,
        name: 'Familia',
        title: 'Películas Familiares online gratis | FilmiFy',
        description: 'Cine familiar para ver online: películas para disfrutar con niños y grandes. Gratis, seguro y sin registro.',
    },
];

export function getGenreBySlug(slug: string): GenrePage | undefined {
    return GENRE_PAGES.find((g) => g.slug === slug);
}
