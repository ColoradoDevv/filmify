import Image from 'next/image';
import { getPosterUrl } from '@/lib/tmdb/helpers';

interface HeroPosterCollageProps {
  /** Rutas de póster de TMDB (poster_path). Las nulas se descartan. */
  posters: (string | null | undefined)[];
  /** Contenido que se mostrará sobre el collage (ej. en página 404) */
  children?: React.ReactNode;
  /** Clases adicionales para el contenedor cuando se usa con children */
  className?: string;
  /** Si es true, rellena la cuadrícula repitiendo la lista hasta alcanzar tileCount */
  repeat?: boolean;
  /** Número total de pósters en el mosaico cuando repeat es true (por defecto 36) */
  tileCount?: number;
}

/**
 * Fondo de hero estilo Netflix: un mosaico denso de pósters del catálogo,
 * oscurecido con overlays para que el texto del hero quede siempre legible.
 *
 * - Decorativo (aria-hidden) cuando no hay children.
 * - Cuando se pasan children, se comporta como un contenedor relativo con el
 *   mosaico de pósters como fondo absoluto.
 * - Por defecto no repite pósters: muestra solo los disponibles sin duplicar.
 */
export default function HeroPosterCollage({
  posters,
  children,
  className = '',
  repeat = true,
  tileCount = 36,
}: HeroPosterCollageProps) {
  const valid = posters.filter((p): p is string => Boolean(p));

  // ── Construir la lista de pósters ──────────────────────────
  let tiles: string[];

  if (valid.length === 0) {
    tiles = [];
  } else if (repeat) {
    // Repetición: rellena hasta tileCount
    tiles = Array.from({ length: tileCount }, (_, i) => valid[i % valid.length]);
  } else {
    // Sin repetición: usa todos los pósters únicos disponibles
    tiles = valid;
  }

  // ── Fallback si no hay pósters ──────────────────────────────
  const fallbackBackground = (
    <div className="absolute inset-0" aria-hidden>
      <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-surface to-accent/10" />
      <div className="absolute inset-0 backdrop-blur-3xl" />
    </div>
  );

  // ── Mosaico con overlays ────────────────────────────────────
  const posterBackground = (
    <div className="absolute inset-0" aria-hidden>
      <div className="absolute inset-x-0 top-0 grid grid-cols-4 sm:grid-cols-7 lg:grid-cols-12 gap-0.5">
        {tiles.map((path, i) => (
          <div key={i} className="relative aspect-[2/3]">
            <Image
              src={getPosterUrl(path, 'w185') || ''}
              alt=""
              fill
              className="object-cover"
              sizes="(max-width: 640px) 25vw, (max-width: 1024px) 14vw, 8vw"
              loading={i < 12 ? 'eager' : 'lazy'}
            />
          </div>
        ))}
      </div>
      {/* Overlays de contraste */}
      <div className="absolute inset-0 bg-background/40" />
      <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/30" />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/50" />
    </div>
  );

  // ── Comportamiento original: solo fondo decorativo absoluto ──
  if (!children) {
    if (tiles.length === 0) return fallbackBackground;
    return posterBackground;
  }

  // ── Modo contenedor (con children): fondo absoluto + contenido encima ──
  const shouldRepeat = repeat && valid.length > 0;
  const tilesFinal = shouldRepeat ? tiles : valid;

  // ── Render ───────────────────────────────────────────────
  return (
    <div className={`relative overflow-hidden ${className}`}>
      {tilesFinal.length === 0 ? fallbackBackground : posterBackground}
      <div className="relative z-10">{children}</div>
    </div>
  );
}