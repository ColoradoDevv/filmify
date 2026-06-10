/**
 * Skeleton placeholder para las tarjetas de películas/series.
 * Replica las dimensiones y la disposición interna de MovieCard
 * para evitar saltos en el layout y mejorar la percepción de carga.
 */
export function MovieCardSkeleton() {
    return (
        <div
            className="relative rounded-[var(--radius-lg)] overflow-hidden bg-surface-container animate-pulse"
            role="status"
            aria-label="Cargando contenido"
        >
            {/* Póster (2:3) con shimmer animado */}
            <div className="aspect-[2/3] bg-surface-light relative overflow-hidden">
                {/* Efecto shimmer */}
                <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent" />

                {/* Chip de rating (esquina superior izquierda) */}
                <div className="absolute top-2 left-2 z-20 w-12 h-5 rounded-full bg-white/10 backdrop-blur-sm border border-white/5" />

                {/* Botón de favorito (esquina superior derecha) */}
                <div className="absolute top-2 right-2 z-20 w-8 h-8 rounded-full bg-white/10 backdrop-blur-sm border border-white/5" />

                {/* Scrim inferior simulado */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                {/* Título y metadata (parte inferior) */}
                <div className="absolute bottom-0 left-0 right-0 p-2.5 space-y-1.5">
                    {/* Título (1 o 2 líneas) */}
                    <div className="space-y-1">
                        <div className="h-3.5 bg-white/20 rounded-sm w-full" />
                        <div className="h-3.5 bg-white/20 rounded-sm w-3/4" />
                    </div>
                    {/* Año y tipo */}
                    <div className="flex items-center gap-2">
                        <div className="h-2.5 bg-white/15 rounded-sm w-8" />
                        <div className="w-0.5 h-0.5 rounded-full bg-white/10" />
                        <div className="h-2.5 bg-white/15 rounded-sm w-10" />
                    </div>
                </div>
            </div>

            {/* Texto para lectores de pantalla */}
            <span className="sr-only">Cargando...</span>
        </div>
    );
}