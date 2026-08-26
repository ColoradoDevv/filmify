/**
 * Badges de calidad del listing de Vimeus.
 *
 * Vive aparte porque lo pintan tanto `MovieCard` (cliente) como
 * `RecentlyAddedRail` (servidor), y un mapa duplicado se desincroniza en
 * cuanto el proveedor añade un valor nuevo.
 *
 * Solo se muestran las calidades que suman: los valores desconocidos o malos
 * (CAM, TS) no llevan badge — anunciar "CAM" espanta más de lo que informa.
 */
export const QUALITY_BADGES: Record<string, { label: string; className: string }> = {
    '4K':     { label: '4K', className: 'bg-violet-500/90 text-white' },
    'UHD':    { label: '4K', className: 'bg-violet-500/90 text-white' },
    'HD':     { label: 'HD', className: 'bg-primary/90 text-on-primary' },
    'FHD':    { label: 'HD', className: 'bg-primary/90 text-on-primary' },
    '1080P':  { label: 'HD', className: 'bg-primary/90 text-on-primary' },
    '720P':   { label: 'HD', className: 'bg-primary/90 text-on-primary' },
    'BLURAY': { label: 'BD', className: 'bg-blue-500/90 text-white' },
};

/** Devuelve el badge de una calidad cruda, o null si no merece pintarse. */
export function qualityBadge(quality?: string | null) {
    if (!quality) return null;
    return QUALITY_BADGES[quality.toUpperCase()] ?? null;
}
