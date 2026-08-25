import Link from 'next/link';
import Image from 'next/image';
import { Play } from 'lucide-react';
import type { VimeusMovie } from '@/server/services/vimeus';
import { qualityBadge } from '@/components/features/qualityBadge';

const TMDB_IMG = 'https://image.tmdb.org/t/p';

// Altura fija del carril. El ancho de cada pieza lo deriva su aspect-ratio, así
// que el destacado (16:9) y los pósters (2:3) quedan alineados arriba y abajo
// sin recortes ni huecos.
const RAIL_H = 'h-[184px] sm:h-[216px]';

interface Props {
    /** En orden de llegada: el primero es el título más reciente. */
    items: VimeusMovie[];
}

/**
 * Carril de novedades.
 *
 * El listado llega ordenado por fecha de alta, así que la posición ya significa
 * algo: el primero es el último en entrar al catálogo. El diseño lo aprovecha
 * dándole formato apaisado y el doble de ancho — es la única jerarquía real que
 * hay en estos datos, y de paso es lo único que usa el `backdrop`.
 *
 * Antes cada tarjeta llevaba un sello "Nuevo". Con las doce marcadas igual el
 * sello no distinguía nada; ese hueco lo ocupa ahora la calidad, que sí varía
 * entre títulos. Que la fila es de novedades ya lo dice el encabezado.
 *
 * Componente de servidor: solo enlaces e imágenes, cero JS en el cliente.
 */
export default function RecentlyAddedRail({ items }: Props) {
    if (items.length === 0) return null;

    const [newest, ...rest] = items;

    return (
        <section aria-label="Películas recién añadidas">
            <div className="mb-4 flex items-baseline justify-between gap-4">
                <h2 className="text-xl font-bold text-white sm:text-2xl">
                    Recién añadidas
                </h2>
                <Link
                    href="/browse"
                    className="shrink-0 rounded text-sm font-medium text-primary transition-colors hover:text-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                    Ver catálogo →
                </Link>
            </div>

            {/* px/-mx: deja aire lateral para que la sombra del hover no se
                recorte contra los bordes del contenedor con scroll. */}
            <ul className={`flex gap-3 overflow-x-auto overscroll-x-contain scrollbar-hide px-3 -mx-3 pt-2 pb-5 ${RAIL_H} box-content`}>
                {/* ── El último en llegar, en apaisado ─────────────────────── */}
                <li className="h-full shrink-0">
                    <Link
                        href={`/movie/${newest.tmdb_id}`}
                        className="group relative block h-full aspect-video overflow-hidden rounded-2xl bg-surface-container ring-1 ring-white/10 transition duration-200 hover:ring-primary/60 motion-safe:hover:-translate-y-0.5 hover:shadow-[var(--shadow-3)] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                        <Media
                            src={newest.backdrop ? `${TMDB_IMG}/w780${newest.backdrop}` : posterSrc(newest)}
                            alt={newest.title}
                            sizes="(max-width: 640px) 327px, 384px"
                            title={newest.title}
                            priority
                        />

                        <div className="absolute inset-x-0 bottom-0 p-4">
                            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
                                Lo último
                            </p>
                            <div className="flex items-end justify-between gap-3">
                                <h3 className="line-clamp-2 text-base font-bold leading-tight text-white sm:text-lg">
                                    {newest.title}
                                </h3>
                                <QualityChip quality={newest.quality} />
                            </div>
                        </div>

                        <PlayAffordance size="lg" />
                    </Link>
                </li>

                {/* ── El resto, en póster ──────────────────────────────────── */}
                {rest.map((m) => (
                    <li key={m.tmdb_id} className="h-full shrink-0">
                        <Link
                            href={`/movie/${m.tmdb_id}`}
                            className="group relative block h-full aspect-[2/3] overflow-hidden rounded-xl bg-surface-container ring-1 ring-white/10 transition duration-200 hover:ring-primary/60 motion-safe:hover:-translate-y-0.5 hover:shadow-[var(--shadow-3)] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                            <Media
                                src={posterSrc(m)}
                                alt={m.title}
                                sizes="(max-width: 640px) 123px, 144px"
                                title={m.title}
                            />

                            <div className="absolute inset-x-0 bottom-0 p-2.5">
                                <h3 className="line-clamp-2 text-[13px] font-semibold leading-tight text-white">
                                    {m.title}
                                </h3>
                            </div>

                            <div className="absolute left-2 top-2">
                                <QualityChip quality={m.quality} />
                            </div>

                            <PlayAffordance size="sm" />
                        </Link>
                    </li>
                ))}
            </ul>
        </section>
    );
}

function posterSrc(m: VimeusMovie): string | null {
    return m.poster ? `${TMDB_IMG}/w342${m.poster}` : null;
}

/** Imagen con degradado de legibilidad, o rótulo con el título si no hay arte. */
function Media({
    src, alt, sizes, title, priority = false,
}: { src: string | null; alt: string; sizes: string; title: string; priority?: boolean }) {
    return (
        <>
            {src ? (
                <Image
                    src={src}
                    alt={alt}
                    fill
                    sizes={sizes}
                    priority={priority}
                    className="object-cover transition-transform duration-500 motion-safe:group-hover:scale-105"
                />
            ) : (
                <div className="flex h-full w-full items-center justify-center px-3 text-center text-xs font-medium text-text-muted">
                    {title}
                </div>
            )}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent" />
        </>
    );
}

function QualityChip({ quality }: { quality?: string }) {
    const badge = qualityBadge(quality);
    if (!badge) return null;
    return (
        <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold leading-none tracking-wider ${badge.className}`}>
            {badge.label}
        </span>
    );
}

function PlayAffordance({ size }: { size: 'sm' | 'lg' }) {
    const box = size === 'lg' ? 'h-12 w-12' : 'h-9 w-9';
    const icon = size === 'lg' ? 'h-5 w-5' : 'h-4 w-4';
    return (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100">
            <span className={`flex ${box} items-center justify-center rounded-full border border-white/25 bg-white/15 backdrop-blur-sm`}>
                <Play className={`${icon} fill-white text-white`} aria-hidden />
            </span>
        </div>
    );
}
