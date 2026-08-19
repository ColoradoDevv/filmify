'use client';

import { useEffect, useState } from 'react';
import AdBanner, { type AdFormat } from './AdBanner';
import { getAdsConfig } from '@/lib/env';
import { cn } from '@/lib/utils';

/**
 * Hueco publicitario reutilizable.
 *
 * Elige el formato según el ancho real de la pantalla y centraliza el
 * espaciado para no repetir boilerplate en cada página.
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
/** Debajo de esto solo entra el banner móvil. */
const TABLET_BREAKPOINT = 768;

/** El 728x90 necesita 728px LIBRES: con los márgenes de página se desborda
 *  por debajo de ~1024px, así que ahí manda el rectángulo. */
const DESKTOP_BREAKPOINT = 1024;

type Bucket = 'mobile' | 'tablet' | 'desktop';

type SlotVariant =
    /** Ancho completo: leaderboard en escritorio, banner móvil en móvil. */
    | 'auto'
    /** Dentro del contenido: rectángulo en escritorio, banner móvil en móvil. */
    | 'inline'
    /** Bajo el reproductor: Native Banner en escritorio, banner móvil en móvil. */
    | 'player'
    /** Formato fijo, sin adaptación. */
    | AdFormat;

interface AdSlotProps {
    variant?: SlotVariant;
    /** Clases extra para el espaciado/posicionamiento del slot. */
    className?: string;
}

const RESPONSIVE_VARIANTS = new Set<SlotVariant>(['auto', 'inline', 'player']);

/** Resuelve el formato final, con reserva si la zona no está configurada. */
function resolveFormat(variant: SlotVariant, bucket: Bucket): AdFormat | null {
    const ads = getAdsConfig();

    if (!RESPONSIVE_VARIANTS.has(variant)) return variant as AdFormat;

    if (bucket === 'mobile') {
        // Aquí no cabe ni el 728x90 ni el 300x250 sin comerse la pantalla. Y
        // el Native Banner tampoco vale de reserva: está configurado como
        // widget 4:1, que en un ancho de móvil sale apretado — la propia guía
        // de Adsterra avisa de que el widget hay que ajustarlo por
        // dispositivo, y el layout es único por zona.
        return ads.mobileKey ? 'mobile' : null;
    }

    // Bajo el reproductor Adsterra recomienda su widget nativo 4:1: ocupa el
    // ancho del player y se lee como contenido del sitio, no como banner.
    if (variant === 'player' && ads.nativeSrc) return 'native';

    // El rectángulo es el formato natural dentro del contenido, y en tablet es
    // además el único que cabe.
    if ((variant === 'inline' || bucket === 'tablet') && ads.rectangleKey) return 'rectangle';

    return bucket === 'desktop' ? 'leaderboard' : null;
}

export default function AdSlot({ variant = 'auto', className }: AdSlotProps) {
    // `null` hasta montar: el ancho de pantalla no existe en el servidor y
    // adivinarlo provocaría un desajuste de hidratación.
    const [bucket, setBucket] = useState<Bucket | null>(null);

    useEffect(() => {
        const tablet = window.matchMedia(`(min-width: ${TABLET_BREAKPOINT}px)`);
        const desktop = window.matchMedia(`(min-width: ${DESKTOP_BREAKPOINT}px)`);
        const sync = () => setBucket(desktop.matches ? 'desktop' : tablet.matches ? 'tablet' : 'mobile');
        sync();
        tablet.addEventListener('change', sync);
        desktop.addEventListener('change', sync);
        return () => {
            tablet.removeEventListener('change', sync);
            desktop.removeEventListener('change', sync);
        };
    }, []);

    if (bucket === null) return null;

    const format = resolveFormat(variant, bucket);
    if (!format) return null;

    return (
        <AdBanner
            format={format}
            className={cn('my-6 opacity-90 hover:opacity-100 transition-opacity', className)}
        />
    );
}
