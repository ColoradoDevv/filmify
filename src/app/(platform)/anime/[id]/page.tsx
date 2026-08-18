import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Star, Calendar, Clapperboard, Layers, ChevronLeft, Play, Info } from 'lucide-react';
import { getAnimeById, toAnimeCard, FORMAT_LABELS } from '@/server/services/anilist';
import { getAnimePlayback, resolveEpisodeCount } from '@/server/services/anime';
import AnimeCard from '@/components/features/anime/AnimeCard';
import AnimePlayer from '@/components/features/anime/AnimePlayer';
import { AdSlot } from '@/components/ads';

interface Props { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { id } = await params;
    if (!/^\d+$/.test(id)) return { robots: { index: false, follow: false } };
    const anime = await getAnimeById(Number(id)).catch(() => null);
    // Soft-404: si AniList no lo tiene, no indexar (Next inyecta noindex en notFound()).
    if (!anime) return { robots: { index: false, follow: false } };
    const card = toAnimeCard(anime);

    const encodedTitle = encodeURIComponent(`${card.title} — Anime | FilmiFy`);
    const encodedImage = card.coverImage ? encodeURIComponent(card.coverImage) : undefined;

    return {
        title: `${card.title} — Anime | FilmiFy`,
        description: card.description?.slice(0, 160)
            ?? `Ficha de ${card.title}: sinopsis, puntuación y dónde verlo online.`,
        alternates: { canonical: `/anime/${card.id}` },

        openGraph: {
            title: card.title,
            description: card.description?.slice(0, 160) ?? undefined,
            images: [
                {
                    url: `${process.env.NEXT_PUBLIC_APP_URL || ''}/opengraph-image?type=page&title=${encodedTitle}${encodedImage ? `&image=${encodedImage}` : ''}`,
                    width: 1200,
                    height: 630,
                },
            ],
        },

    };
}

export const revalidate = 3600;

/**
 * Los ids de AniList son enteros positivos: descartamos lo demás sin gastar
 * una petición a AniList.
 *
 * Ojo con las expectativas: esto NO consigue un 404 con status real. En esta
 * app `notFound()` siempre acaba pintando la página de error con status 200
 * (soft-404), porque los layouts hacen await y la respuesta ya está en
 * streaming cuando corre la página — comprobado también en rutas ajenas a
 * este módulo, como /editorial/categoria/[cat]. La defensa efectiva contra
 * la indexación es el `robots: noindex` que emite `generateMetadata`.
 */
function parseAnilistId(raw: string): number | null {
    if (!/^\d+$/.test(raw)) return null;
    const n = Number(raw);
    return Number.isSafeInteger(n) && n > 0 ? n : null;
}

export default async function AnimeDetailPage({ params }: Props) {
    const { id } = await params;
    const anilistId = parseAnilistId(id);
    if (anilistId === null) notFound();

    const anime = await getAnimeById(anilistId).catch(() => null);
    if (!anime) notFound();

    const card = toAnimeCard(anime);
    const recs = anime.recommendations.map(toAnimeCard).filter((r) => !r.isAdult).slice(0, 12);
    const accent = card.color ?? 'var(--color-primary)';

    // Reproducción propia del módulo: se resuelve con el id de AniList contra
    // el registro de proveedores, sin pasar por la ficha de series. El primer
    // episodio se resuelve en servidor para que el reproductor pinte ya con
    // sus servidores listos (sin spinner inicial).
    const episodeCount = resolveEpisodeCount(anime);
    const initialPlayback = await getAnimePlayback({
        anilistId: card.id,
        episode: 1,
        titles: { english: anime.title.english, romaji: anime.title.romaji },
        year: card.year,
    }).catch(() => ({ sources: [], hasVerifiedSource: false }));

    return (
        <div className="min-h-screen pb-16">
            {/* ── Banner ── */}
            <div className="relative">
                <div className="relative h-[240px] sm:h-[340px] w-full overflow-hidden">
                    {anime.bannerImage ? (
                        <Image src={anime.bannerImage} alt="" fill priority className="object-cover" sizes="100vw" />
                    ) : card.coverImage ? (
                        <Image src={card.coverImage} alt="" fill priority className="object-cover blur-xl scale-110 opacity-40" sizes="100vw" />
                    ) : (
                        <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${accent}, var(--color-surface))` }} />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/20" />
                </div>

                <Link
                    href="/anime"
                    className="absolute top-4 left-4 z-10 flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-black/50 backdrop-blur-sm border border-white/10 text-white md3-label-medium hover:bg-black/70 transition-colors"
                >
                    <ChevronLeft className="w-4 h-4" /> Anime
                </Link>
            </div>

            {/* ── Cabecera: póster + info ── */}
            <div className="max-w-5xl mx-auto px-4 -mt-24 sm:-mt-32 relative z-10">
                <div className="flex flex-col sm:flex-row gap-5">
                    {/* Póster */}
                    <div className="w-32 sm:w-48 shrink-0 mx-auto sm:mx-0">
                        <div className="relative aspect-[2/3] rounded-[var(--radius-lg)] overflow-hidden border border-outline-variant shadow-[var(--shadow-4)] bg-surface-container-high">
                            {card.coverImage && (
                                <Image src={card.coverImage} alt={card.title} fill priority sizes="192px" className="object-cover" />
                            )}
                        </div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0 sm:pt-24">
                        <h1 className="md3-headline-small font-bold text-on-surface">{card.title}</h1>
                        {card.subtitle && (
                            <p className="md3-body-medium text-on-surface-variant mt-0.5">{card.subtitle}</p>
                        )}

                        {/* Meta chips */}
                        <div className="flex flex-wrap items-center gap-2 mt-3">
                            {card.score != null && (
                                <span className="flex items-center gap-1 px-2.5 h-7 rounded-full bg-surface-container-high border border-outline-variant md3-label-medium text-on-surface">
                                    <Star className="w-3.5 h-3.5 fill-[#f59e0b] text-[#f59e0b]" /> {(card.score / 10).toFixed(1)}
                                </span>
                            )}
                            {card.format && (
                                <span className="flex items-center gap-1.5 px-2.5 h-7 rounded-full bg-surface-container-high border border-outline-variant md3-label-medium text-on-surface-variant">
                                    <Clapperboard className="w-3.5 h-3.5" /> {FORMAT_LABELS[card.format] ?? card.format}
                                </span>
                            )}
                            {card.episodes != null && (
                                <span className="flex items-center gap-1.5 px-2.5 h-7 rounded-full bg-surface-container-high border border-outline-variant md3-label-medium text-on-surface-variant">
                                    <Layers className="w-3.5 h-3.5" /> {card.episodes} episodios
                                </span>
                            )}
                            {card.year != null && (
                                <span className="flex items-center gap-1.5 px-2.5 h-7 rounded-full bg-surface-container-high border border-outline-variant md3-label-medium text-on-surface-variant">
                                    <Calendar className="w-3.5 h-3.5" /> {card.year}
                                </span>
                            )}
                        </div>

                        {/* Géneros */}
                        {card.genres.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-3">
                                {card.genres.slice(0, 6).map((g) => (
                                    <span key={g} className="px-2.5 h-6 flex items-center rounded-full bg-primary/8 text-primary md3-label-small">
                                        {g}
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* Estado de disponibilidad — el CTA real es el
                            reproductor que va justo debajo. */}
                        <div className="mt-4">
                            {initialPlayback.sources.length > 0 ? (
                                <span className="inline-flex items-center gap-2 h-9 px-4 rounded-full bg-primary/10 border border-primary/30 md3-label-medium text-primary">
                                    <Play className="w-3.5 h-3.5 fill-current" />
                                    {initialPlayback.sources.length}{' '}
                                    {initialPlayback.sources.length === 1 ? 'servidor disponible' : 'servidores disponibles'}
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-2 h-9 px-4 rounded-full bg-surface-container-high border border-outline-variant md3-body-small text-on-surface-variant">
                                    <Info className="w-3.5 h-3.5" />
                                    Aún no disponible para reproducir
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Reproductor ── */}
                <section className="mt-6">
                    <AnimePlayer
                        anilistId={card.id}
                        title={card.title}
                        bannerUrl={anime.bannerImage ?? card.coverImage}
                        episodeCount={episodeCount}
                        titles={{ english: anime.title.english, romaji: anime.title.romaji }}
                        year={card.year}
                        initialPlayback={initialPlayback}
                    />
                </section>

                {/* Sinopsis */}
                {card.description && (
                    <div className="mt-6 bg-surface-container rounded-[var(--radius-lg)] border border-outline-variant p-4 sm:p-5">
                        <h2 className="md3-title-small text-on-surface mb-2">Sinopsis</h2>
                        <p className="md3-body-medium text-on-surface-variant whitespace-pre-line leading-relaxed">
                            {card.description}
                        </p>
                    </div>
                )}

                <div className="mt-6">
                    <AdSlot className="my-0" />
                </div>

                {/* Recomendaciones */}
                {recs.length > 0 && (
                    <section className="mt-8 space-y-3">
                        <h2 className="md3-title-medium text-on-surface">Si te gusta, mira también</h2>
                        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                            {recs.map((r) => (
                                <AnimeCard key={r.id} anime={r} />
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
}
