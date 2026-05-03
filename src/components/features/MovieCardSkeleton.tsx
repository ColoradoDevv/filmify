/**
 * Placeholder shown while movie cards are loading.
 * Matches the exact dimensions of MovieCard so the layout doesn't shift.
 */
export function MovieCardSkeleton() {
    return (
        <div className="rounded-2xl overflow-hidden bg-surface border border-white/5 animate-pulse">
            {/* Poster area — same aspect ratio as MovieCard */}
            <div className="aspect-[2/3] bg-surface-light" />
        </div>
    );
}
