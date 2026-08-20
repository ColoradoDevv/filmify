'use client';

import { useEffect, useRef, useState } from 'react';
import AdBanner, { type AdFormat } from './AdBanner';
import { getAdsConfig } from '@/lib/env';
import { cn } from '@/lib/utils';

/**
 * Hueco publicitario reutilizable.
 *
 * Elige el formato según el ancho REAL del contenedor y centraliza el
 * espaciado para no repetir boilerplate en cada página.
 *
 * Mide el contenedor, no la ventana, porque no son lo mismo: el sidebar se
 * come 224px a partir de 1024px y cada página añade su propio `max-w` y sus
 * paddings. En la ficha de película, a 1024px de ventana solo quedan ~672px
 * libres — un 728x90 elegido por media query se salía del contenedor.
 *
 * Antes este slot servía siempre un 728x90 y se ocultaba por debajo de 480px,
 * es decir, dejaba sin monetizar justo al grueso del tráfico (móvil). Ahora el
 * móvil recibe su propio formato.
 *
 * Solo se monta UNA zona por hueco: renderizar la de móvil y la de escritorio
 * a la vez y esconder una con CSS contaría impresiones de anuncios que nadie
 * llega a ver, que es exactamente lo que las redes penalizan como tráfico
 * inválido.
 */

/** Ancho que necesita cada formato para caber entero. */
const WIDTHS = { leaderboard: 728, mobile: 320, rectangle: 300 } as const;

/** Por debajo de esto el hueco se considera estrecho (móvil o columna angosta)
 *  y se sirve el banner pequeño en vez del rectángulo, que ocuparía 250px de
 *  alto sobre el contenido. */
const NARROW_WIDTH = 640;

type SlotVariant =
    /** Ancho completo: el formato más grande que quepa. */
    | 'auto'
    /** Dentro del contenido: rectángulo cuando hay sitio. */
    | 'inline'
    /** Bajo el reproductor. Hoy se comporta como `inline`; serviría el Native
     *  Banner si estuviera activo (ver getAdsConfig en @/lib/env). */
    | 'player'
    /** Formato fijo, sin adaptación. */
    | AdFormat;

interface AdSlotProps {
    variant?: SlotVariant;
    /** Clases extra para el espaciado/posicionamiento del slot. */
    className?: string;
}

const RESPONSIVE_VARIANTS = new Set<SlotVariant>(['auto', 'inline', 'player']);

/** Resuelve el formato final para el ancho disponible, o null si no cabe nada. */
function resolveFormat(variant: SlotVariant, available: number): AdFormat | null {
    const ads = getAdsConfig();

    if (!RESPONSIVE_VARIANTS.has(variant)) return variant as AdFormat;

    const has = (f: AdFormat) =>
        f === 'leaderboard' ? !!ads.leaderboardKey
            : f === 'rectangle' ? !!ads.rectangleKey
                : f === 'mobile' ? !!ads.mobileKey
                    : !!ads.nativeSrc;

    const fits = (f: Exclude<AdFormat, 'native'>) => available >= WIDTHS[f] && has(f);

    // Bajo el reproductor Adsterra recomienda su widget nativo 4:1, pero ese
    // formato está desactivado por seguridad (secuestraba el primer toque en
    // móvil; ver getAdsConfig en @/lib/env). Mientras `nativeSrc` esté vacío
    // este hueco se comporta como `inline`.
    if (variant === 'player' && has('native')) return 'native';

    if (available < NARROW_WIDTH) {
        // Aquí no cabe el 728x90 y el rectángulo se comería la pantalla.
        if (fits('mobile')) return 'mobile';
        return fits('rectangle') ? 'rectangle' : null;
    }

    if (variant !== 'auto') return fits('rectangle') ? 'rectangle' : null;

    if (fits('leaderboard')) return 'leaderboard';
    return fits('rectangle') ? 'rectangle' : null;
}

export default function AdSlot({ variant = 'auto', className }: AdSlotProps) {
    const hostRef = useRef<HTMLDivElement>(null);
    // `null` hasta medir: el ancho no existe en el servidor y adivinarlo
    // provocaría un desajuste de hidratación.
    const [available, setAvailable] = useState<number | null>(null);

    useEffect(() => {
        const host = hostRef.current;
        if (!host) return;

        const sync = () => setAvailable(host.clientWidth);
        sync();

        if (typeof ResizeObserver === 'undefined') return;
        const observer = new ResizeObserver(sync);
        observer.observe(host);
        return () => observer.disconnect();
    }, []);

    const format = available === null ? null : resolveFormat(variant, available);

    // El host va sin estilos y siempre presente: es la regla de medir. Los
    // márgenes viajan en el propio banner para que un hueco sin anuncio no
    // deje un espacio vacío.
    return (
        <div ref={hostRef}>
            {format && (
                <AdBanner
                    format={format}
                    className={cn('my-6 opacity-90 hover:opacity-100 transition-opacity', className)}
                />
            )}
        </div>
    );
}
