'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Heart, Play, Star, Film, Loader2 } from 'lucide-react';
import { useStore } from '@/lib/store/useStore';
import { saveFavoritesToSupabase } from '@/lib/supabase/favorites';
import { createClient } from '@/lib/supabase/client';
import { getPosterUrl } from '@/lib/tmdb/helpers';
import type { Movie, TVShow } from '@/types/tmdb';
import { useRouter } from 'next/navigation';
import { useTVDetection } from '@/hooks/useTVDetection';
import { qualityBadge } from '@/components/features/qualityBadge';
import { toast } from 'sonner';

interface MovieCardProps {
    movie: Movie | TVShow;
    /** 'anime' pinta la etiqueta correcta; el destino lo fija `href`. */
    mediaType?: 'movie' | 'tv' | 'anime';
    priority?: boolean;
    quality?: string;
    /**
     * Destino explícito. Lo necesita el anime: su ficha vive en
     * /anime/[anilistId] y la tarjeta solo conoce el id de TMDB, así que quien
     * la renderiza (que sí tiene el id de AniList) pasa la URL ya construida.
     */
    href?: string;
}


export default function MovieCard({ movie, mediaType = 'movie', priority = false, quality, href }: MovieCardProps) {
    const router = useRouter();
    const { isTV } = useTVDetection();
    const cardRef = useRef<HTMLDivElement>(null);

    const isFavorite = useStore((state) =>
        state.user.favorites.some((fav) => fav.id === movie.id)
    );
    const addFavorite = useStore((state) => state.addFavorite);
    const removeFavorite = useStore((state) => state.removeFavorite);

    const [isFocused, setIsFocused] = useState(false);
    const [favLoading, setFavLoading] = useState(false);

    const posterUrl = getPosterUrl(movie.poster_path);
    const badge = qualityBadge(quality);
    const linkHref = href
        ?? (mediaType === 'movie' ? `/movie/${movie.id}` : `/tv/${movie.id}`);
    const typeLabel = mediaType === 'movie' ? 'Película' : mediaType === 'anime' ? 'Anime' : 'Serie';
    const title = 'title' in movie ? movie.title : movie.name;
    const date = 'release_date' in movie ? movie.release_date : movie.first_air_date;
    const year = date ? new Date(date).getFullYear() : '—';

    // Scroll suave al recibir foco (solo en TV, y solo si no está completamente visible)
    const scrollIntoViewIfNeeded = useCallback(() => {
        if (!isTV || !cardRef.current) return;
        const rect = cardRef.current.getBoundingClientRect();
        const isFullyVisible =
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= window.innerHeight &&
            rect.right <= window.innerWidth;
        if (!isFullyVisible) {
            cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
        }
    }, [isTV]);

    useEffect(() => {
        if (isFocused) scrollIntoViewIfNeeded();
    }, [isFocused, scrollIntoViewIfNeeded]);

    const toggleFavorite = useCallback(
        async (e: React.MouseEvent | React.KeyboardEvent) => {
            e.preventDefault();
            e.stopPropagation();
            if (favLoading) return;

            // Favoritos es una función solo para usuarios registrados.
            const { data: { user } } = await createClient().auth.getUser();
            if (!user) {
                toast.info('Inicia sesión para guardar favoritos');
                router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
                return;
            }

            setFavLoading(true);
            const nextFavorites = isFavorite
                ? useStore.getState().user.favorites.filter((fav) => fav.id !== movie.id)
                : [...useStore.getState().user.favorites, movie as Movie];

            // Actualización optimista
            if (isFavorite) {
                removeFavorite(movie.id);
            } else {
                addFavorite(movie as Movie);
            }

            try {
                await saveFavoritesToSupabase(nextFavorites);
            } catch {
                // Revertir en caso de error
                if (isFavorite) {
                    addFavorite(movie as Movie);
                } else {
                    removeFavorite(movie.id);
                }
            } finally {
                setFavLoading(false);
            }
        },
        [isFavorite, movie, addFavorite, removeFavorite, favLoading, router]
    );

    return (
        <div
            ref={cardRef}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className={[
                // Sin `overflow-hidden` en la raíz: recortaba su propia sombra de
                // hover y el indicador de foco de TV. El redondeo lo aplica el
                // contenedor del póster, que es quien tiene que recortar la imagen.
                'group relative rounded-[var(--radius-lg)]',
                'bg-surface-container transition-all duration-200',
                // `z-10` al elevarse: si no, la sombra queda por debajo de las
                // tarjetas vecinas de la grilla y se ve cortada en seco.
                'hover:shadow-[var(--shadow-3)] hover:-translate-y-0.5 hover:z-10 focus-within:z-10',
                isTV && isFocused && 'ring-2 ring-primary ring-offset-2 ring-offset-background scale-[1.02]',
                'tv-focusable tv-card-focus',
            ].join(' ')}
        >
            {/* Poster — 2:3 aspect ratio */}
            <div className="relative aspect-[2/3] overflow-hidden rounded-[var(--radius-lg)]">
                {posterUrl ? (
                    <Image
                        src={posterUrl}
                        alt={title}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        sizes="(max-width: 480px) 45vw, (max-width: 768px) 33vw, (max-width: 1200px) 25vw, 16vw"
                        priority={priority}
                        loading={priority ? undefined : 'lazy'}
                    />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 bg-surface-container-high text-on-surface-variant">
                        <Film className="w-8 h-8 opacity-20" strokeWidth={1} aria-hidden />
                        <span className="md3-label-small opacity-30 uppercase tracking-widest text-[10px]">
                            Sin imagen
                        </span>
                    </div>
                )}

                {/* Scrim para legibilidad */}
                <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/80 via-black/10 to-transparent opacity-70 group-hover:opacity-90 transition-opacity duration-300" />

                {/* Rating chip — solo si hay puntuación real */}
                {!!movie.vote_average && (
                    <div className="absolute top-2 left-2 z-20 pointer-events-none flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-black/50 backdrop-blur-sm border border-white/10">
                        <Star className="w-2.5 h-2.5 text-primary fill-primary" aria-hidden />
                        <span className="md3-label-small text-white">
                            {movie.vote_average.toFixed(1)}
                        </span>
                    </div>
                )}

                {/* Quality badge — si hay rating sube debajo de él, si no va arriba del todo */}
                {badge && (
                    <div className={[
                        'absolute left-2 z-20 pointer-events-none px-1.5 py-0.5 rounded',
                        movie.vote_average ? 'top-8' : 'top-2',
                        'text-[10px] font-bold tracking-wider leading-none',
                        badge.className,
                    ].join(' ')}>
                        {badge.label}
                    </div>
                )}

                {/* Play overlay */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
                    <div className="w-10 h-10 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center">
                        <Play className="w-4 h-4 text-white fill-white ml-0.5" aria-hidden />
                    </div>
                </div>

                {/* Título y metadata */}
                <div className="absolute bottom-0 left-0 right-0 p-2.5 z-20 pointer-events-none">
                    <p className="md3-label-large text-white line-clamp-2 leading-tight font-bold">
                        {title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-300">
                        <span className="md3-label-small text-white/70">{year}</span>
                        <span className="w-0.5 h-0.5 rounded-full bg-white/30" />
                        <span className="md3-label-small text-white/70">
                            {typeLabel}
                        </span>
                    </div>
                </div>
            </div>

            {/*
             * Enlace real que cubre toda la tarjeta.
             *
             * Antes la navegación era `onClick` + `router.push()` sobre un div con
             * `role="link"`: no funcionaba hasta que hidrataba el JS (en la home,
             * con tanto contenido, eso tarda) — de ahí que "algunas películas no
             * fueran clicables" —, ni con clic central / Ctrl+clic, ni para los
             * rastreadores. Va como capa superpuesta y no envolviendo la tarjeta
             * porque el botón de favorito es contenido interactivo y no puede
             * anidarse dentro de un <a>.
             *
             * z-20 lo deja por encima de los adornos (scrim, play, título — todos
             * ya `pointer-events-none`) y por debajo del favorito (z-30).
             */}
            <Link
                href={linkHref}
                tabIndex={0}
                data-focusable="true"
                aria-label={`${title} (${year}) — ${typeLabel}`}
                className="absolute inset-0 z-20 rounded-[var(--radius-lg)] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            />

            {/* Botón de favorito — por encima del enlace para poder pulsarlo */}
            <button
                onClick={toggleFavorite}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleFavorite(e);
                    }
                }}
                disabled={favLoading}
                className={[
                    'absolute top-2 right-2 z-30 w-8 h-8 rounded-full flex items-center justify-center',
                    isFavorite
                        ? 'bg-primary/90 text-on-primary'
                        : 'bg-black/50 backdrop-blur-sm text-white hover:bg-primary/80',
                    'opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100',
                    'transition-all duration-200',
                    'focus:outline-none focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-white',
                    favLoading && 'pointer-events-none',
                ].join(' ')}
                aria-label={isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                aria-pressed={isFavorite}
            >
                {favLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                    <Heart className={`w-3.5 h-3.5 ${isFavorite ? 'fill-current scale-110' : ''} transition-transform`} />
                )}
            </button>

            {/* Indicador de foco TV */}
            {isTV && isFocused && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary px-2 py-0.5 rounded-full text-[10px] font-bold text-on-primary z-30 pointer-events-none animate-fade-in">
                    SELECCIONADO
                </div>
            )}
        </div>
    );
}
