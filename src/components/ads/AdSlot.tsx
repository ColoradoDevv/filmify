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
const DESKTOP_BREAKPOINT = 768;

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
function resolveFormat(variant: SlotVariant, isDesktop: boolean): AdFormat | null {
    const ads = getAdsConfig();

    if (!RESPONSIVE_VARIANTS.has(variant)) return variant as AdFormat;

    if (!isDesktop) {
        // En móvil el 728x90 no cabe. Y el Native Banner tampoco vale de
        // reserva aquí: está configurado como widget 4:1, que en un ancho de
        // móvil sale apretado — la propia guía de Adsterra avisa de que el
        // widget hay que ajustarlo por dispositivo, y el layout es único por
        // zona. Con el 320x50 cubierto, no hace falta.
        if (ads.mobileKey) return 'mobile';
        return null;
    }

    // Bajo el reproductor Adsterra recomienda su widget nativo 4:1: ocupa el
    // ancho del player y se lee como contenido del sitio, no como banner.
    if (variant === 'player' && ads.nativeSrc) return 'native';
    if (variant === 'inline' && ads.rectangleKey) return 'rectangle';
    return 'leaderboard';
}

export default function AdSlot({ variant = 'auto', className }: AdSlotProps) {
    // `null` hasta montar: el ancho de pantalla no existe en el servidor y
    // adivinarlo provocaría un desajuste de hidratación.
    const [isDesktop, setIsDesktop] = useState<boolean | null>(null);

    useEffect(() => {
        const query = window.matchMedia(`(min-width: ${DESKTOP_BREAKPOINT}px)`);
        const sync = () => setIsDesktop(query.matches);
        sync();
        query.addEventListener('change', sync);
        return () => query.removeEventListener('change', sync);
    }, []);

    if (isDesktop === null) return null;

    const format = resolveFormat(variant, isDesktop);
    if (!format) return null;

    return (
        <AdBanner
            format={format}
            className={cn('my-6 opacity-90 hover:opacity-100 transition-opacity', className)}
        />
    );
}
