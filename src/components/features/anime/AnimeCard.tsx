'use client';

/**
 * Tarjeta de anime (datos de AniList).
 *
 * Enlaza a la ficha interna `/anime/[id]`, que muestra los metadatos de AniList
 * y resuelve la reproducción vía el embed de Vimeus existente. El color de
 * acento sale del `coverImage.color` que provee AniList (mismo detalle visual
 * que animeflix).
 */
import Image from 'next/image';
import Link from 'next/link';
import { Star, Play, Clapperboard } from 'lucide-react';
import type { AnimeCard as AnimeCardData } from '@/lib/anilist/types';

const FORMAT_LABELS: Record<string, string> = {
    TV: 'TV', TV_SHORT: 'TV', MOVIE: 'Película', SPECIAL: 'Especial',
    OVA: 'OVA', ONA: 'ONA', MUSIC: 'Música',
};

export default function AnimeCard({ anime, priority = false }: { anime: AnimeCardData; priority?: boolean }) {
    const scorePct = anime.score;
    const accent = anime.color ?? 'var(--color-primary)';

    return (
        <Link
            href={`/anime/${anime.id}`}
            className="group relative flex flex-col rounded-[var(--radius-lg)] overflow-hidden bg-surface-container border border-outline-variant hover:border-primary/40 hover:shadow-[var(--shadow-3)] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
            <div className="relative aspect-[2/3] overflow-hidden bg-surface-container-high">
                {anime.coverImage ? (
                    <Image
                        src={anime.coverImage}
                        alt={anime.title}
                        fill
                        priority={priority}
                        sizes="(max-width:640px) 45vw, (max-width:1024px) 22vw, 180px"
                        className="object-cover group-hover:scale-[1.04] transition-transform duration-300"
                    />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Clapperboard className="w-8 h-8 text-on-surface-variant/30" />
                    </div>
                )}

                {/* Degradado inferior para legibilidad */}
                <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/85 to-transparent" />

                {/* Badge de puntuación */}
                {scorePct != null && (
                    <span className="absolute top-2 left-2 flex items-center gap-1 px-1.5 h-6 rounded-full bg-black/70 backdrop-blur-sm text-[11px] font-semibold text-white">
                        <Star className="w-3 h-3 fill-[#f59e0b] text-[#f59e0b]" />
                        {(scorePct / 10).toFixed(1)}
                    </span>
                )}

                {/* Formato */}
                {anime.format && (
                    <span
                        className="absolute top-2 right-2 px-1.5 h-6 flex items-center rounded-full text-[10px] font-bold uppercase tracking-wide text-white"
                        style={{ backgroundColor: `color-mix(in srgb, ${accent} 80%, black)` }}
                    >
                        {FORMAT_LABELS[anime.format] ?? anime.format}
                    </span>
                )}

                {/* Overlay de play al hover */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="w-12 h-12 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-[var(--shadow-3)]">
                        <Play className="w-5 h-5 fill-current ml-0.5" />
                    </span>
                </div>

                {/* Título sobre el degradado */}
                <div className="absolute inset-x-0 bottom-0 p-2.5">
                    <p className="md3-label-large text-white line-clamp-2 leading-snug drop-shadow">{anime.title}</p>
                    <p className="md3-label-small text-white/60 mt-0.5">
                        {[anime.year, anime.episodes ? `${anime.episodes} ep.` : null].filter(Boolean).join(' · ')}
                    </p>
                </div>
            </div>
        </Link>
    );
}
