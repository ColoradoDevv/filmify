'use client';

import { useState } from 'react';
import Image from 'next/image';
import { CalendarClock, Play, Info } from 'lucide-react';

interface UnavailableTitleNoticeProps {
    title: string;
    backdropUrl?: string | null;
    trailerKey?: string | null;
    /** ISO date de TMDB. Decide si el texto habla en futuro o en presente. */
    releaseDate?: string | null;
    mediaType?: 'movie' | 'tv';
}

/**
 * Ocupa el lugar del reproductor cuando el título existe en TMDB pero ningún
 * proveedor lo tiene.
 *
 * Antes esos títulos hacían `notFound()`: quien llegaba desde una notificación
 * de «Próximamente» —que por definición apunta a algo aún sin estrenar— se
 * comía un 404. Ahora ve la ficha entera (sinopsis, reparto, tráiler, reseñas y
 * recomendaciones) y solo falta el botón de reproducir, que es la verdad.
 *
 * El tráiler no se monta hasta que se pide: un iframe de YouTube por cada ficha
 * cargaría scripts de terceros en visitas que quizá ni lo tocan.
 */
export default function UnavailableTitleNotice({
    title,
    backdropUrl,
    trailerKey,
    releaseDate,
    mediaType = 'movie',
}: UnavailableTitleNoticeProps) {
    const [playingTrailer, setPlayingTrailer] = useState(false);

    const released = releaseDate ? new Date(releaseDate) <= new Date() : true;
    const fecha = releaseDate
        ? new Date(releaseDate).toLocaleDateString('es-ES', {
              day: 'numeric', month: 'long', year: 'numeric',
          })
        : null;

    const encabezado = released ? 'Todavía no disponible' : 'Próximamente';
    const explicacion = released
        ? `Aún no tenemos ${mediaType === 'tv' ? 'esta serie' : 'esta película'} para ver online. Mientras tanto, aquí tienes su ficha completa.`
        : fecha
            ? `Se estrena el ${fecha}. Cuando llegue al catálogo podrás verla aquí mismo.`
            : 'Se estrena próximamente. Cuando llegue al catálogo podrás verla aquí mismo.';

    return (
        <div className="relative w-full overflow-hidden rounded-2xl border border-outline-variant bg-surface-container">
            <div className="relative aspect-video w-full">
                {playingTrailer && trailerKey ? (
                    <iframe
                        src={`https://www.youtube-nocookie.com/embed/${trailerKey}?autoplay=1&rel=0`}
                        title={`Tráiler de ${title}`}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="absolute inset-0 h-full w-full"
                    />
                ) : (
                    <>
                        {backdropUrl && (
                            <Image
                                src={backdropUrl}
                                alt=""
                                fill
                                sizes="(max-width: 1024px) 100vw, 60vw"
                                className="object-cover opacity-40"
                                aria-hidden
                            />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/30" />

                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
                            <span className="inline-flex items-center gap-2 rounded-full border border-outline-variant bg-surface-container-high px-3 py-1">
                                <CalendarClock className="h-3.5 w-3.5 text-primary" aria-hidden />
                                <span className="text-xs font-semibold uppercase tracking-wider text-on-surface">
                                    {encabezado}
                                </span>
                            </span>

                            <p className="max-w-md text-sm leading-relaxed text-on-surface-variant">
                                {explicacion}
                            </p>

                            {trailerKey && (
                                <button
                                    type="button"
                                    onClick={() => setPlayingTrailer(true)}
                                    className="mt-1 inline-flex h-10 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                                >
                                    <Play className="h-4 w-4 fill-current" aria-hidden />
                                    Ver tráiler
                                </button>
                            )}
                        </div>
                    </>
                )}
            </div>

            <p className="flex items-start gap-2 border-t border-outline-variant px-4 py-3 text-xs text-on-surface-variant">
                <Info className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
                Añádela a tus favoritos y la tendrás a mano cuando esté disponible.
            </p>
        </div>
    );
}
