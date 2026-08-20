'use client';

import { useEffect, useRef, useState } from 'react';
import { getConsent, onConsentChange } from '@/lib/cookie-consent';
import { getAdsConfig } from '@/lib/env';
import { trackAdView } from '@/lib/analytics';
import { cn } from '@/lib/utils';

/**
 * Banner de Adsterra, aislado en un iframe de origen opaco.
 *
 * CUMPLIMIENTO: solo se carga con consentimiento de marketing. Fuera del EEE
 * ese consentimiento viene concedido por defecto (ver `@/lib/cookie-consent`).
 *
 * AISLAMIENTO: el creativo se sirve desde `/ads/frame`, montado con
 * `sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"` y
 * **sin `allow-same-origin`**. Eso deja el documento del anuncio en un origen
 * opaco: no puede leer ni escribir el DOM de la página, no puede navegar la
 * pestaña y no puede registrar listeners sobre nuestro documento. `allow-popups`
 * está a propósito — es lo que permite que un clic legítimo abra la página del
 * anunciante en una pestaña nueva; sin él los clics no llevaban a ninguna parte
 * y se perdían los ingresos que generan.
 *
 * El montaje anterior escribía el anuncio con `document.write` en un iframe
 * `allow-scripts allow-same-origin`. Bloqueaba la navegación y los pop-ups,
 * pero al compartir origen el creativo sí llegaba al documento de la página
 * (verificado con un creativo hostil de prueba), y desde ahí se escapa del
 * sandbox inyectando un <script> en el padre. Es la misma clase de fallo que
 * dejó el sitio inservible en móvil en junio de 2026, cuando el Native Banner
 * corría suelto en la página.
 *
 * Cada formato lleva su PROPIA zona: una clave creada como 728x90 no rellena un
 * hueco de 320x50, devuelve vacío. El tamaño se sirve siempre nativo — nada de
 * escalar con transform, que servía un creativo a un tamaño que el anunciante
 * no compró.
 */
export type AdFormat = 'leaderboard' | 'rectangle' | 'mobile' | 'native';

/** Dimensiones nativas de cada zona de tipo banner. */
const IFRAME_SIZES: Record<Exclude<AdFormat, 'native'>, { w: number; h: number }> = {
    leaderboard: { w: 728, h: 90 },
    rectangle:   { w: 300, h: 250 },
    mobile:      { w: 320, h: 50 },
};

/** Altura reservada para el Native Banner: su alto real depende de cuántos
 *  creativos devuelva la red, así que se reserva un mínimo razonable. */
const NATIVE_MIN_HEIGHT = 200;

interface AdBannerProps {
    format: AdFormat;
    /** Clases extra del contenedor (márgenes, normalmente). */
    className?: string;
}

/** Devuelve la clave/URL configurada para el formato, o '' si no la hay. */
function keyFor(format: AdFormat): string {
    const ads = getAdsConfig();
    switch (format) {
        case 'leaderboard': return ads.leaderboardKey;
        case 'rectangle':   return ads.rectangleKey;
        case 'mobile':      return ads.mobileKey;
        case 'native':      return ads.nativeSrc;
    }
}

export default function AdBanner({ format, className }: AdBannerProps) {
    const wrapperRef = useRef<HTMLDivElement>(null);
    const nativeRef = useRef<HTMLDivElement>(null);
    const [marketingOk, setMarketingOk] = useState(false);

    const adKey = keyFor(format);

    // Consentimiento de marketing (estado inicial + cambios en vivo).
    useEffect(() => {
        setMarketingOk(getConsent().marketing);
        return onConsentChange((c) => setMarketingOk(c.marketing));
    }, []);

    // Native Banner: script async + <div> contenedor que la red rellena.
    // Va en el documento principal (no en un iframe) porque su script busca el
    // contenedor por id en el mismo documento donde se ejecuta — y por eso
    // mismo está desactivado por defecto (ver getAdsConfig en @/lib/env).
    useEffect(() => {
        if (!marketingOk || format !== 'native' || !adKey) return;

        const host = nativeRef.current;
        if (!host) return;

        const script = document.createElement('script');
        script.async = true;
        script.setAttribute('data-cfasync', 'false');
        script.src = adKey;
        host.appendChild(script);

        return () => { script.remove(); };
    }, [marketingOk, adKey, format]);

    // Medición: una impresión visible por montaje. Sin esto no hay forma de
    // saber qué rutas generan ingresos — el panel agrega por dominio.
    useEffect(() => {
        if (!marketingOk || !adKey) return;

        const el = wrapperRef.current;
        if (!el || typeof IntersectionObserver === 'undefined') return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (!entries.some((e) => e.isIntersecting)) return;
                trackAdView({ format, path: window.location.pathname });
                observer.disconnect();
            },
            { threshold: 0.5 },
        );
        observer.observe(el);

        return () => observer.disconnect();
    }, [marketingOk, adKey, format]);

    // Sin consentimiento o sin zona configurada no se ocupa espacio: el
    // margen viaja en `className`, así que no quedan huecos vacíos.
    if (!marketingOk || !adKey) return null;

    if (format === 'native') {
        const { nativeContainerId } = getAdsConfig();
        return (
            <div
                ref={wrapperRef}
                className={cn('w-full overflow-hidden', className)}
                style={{ minHeight: NATIVE_MIN_HEIGHT }}
            >
                <div ref={nativeRef} />
                {nativeContainerId && <div id={nativeContainerId} />}
            </div>
        );
    }

    const { w, h } = IFRAME_SIZES[format];
    const { frameOrigin } = getAdsConfig();

    // Con el frame en un origen PROPIO distinto al de la página,
    // `allow-same-origin` le devuelve sus cookies reales sin darle acceso a
    // nosotros: sigue siendo cross-origin. Sirviéndolo desde el mismo origen
    // no se puede permitir, porque entonces "same-origin" sería el nuestro.
    const sandbox = frameOrigin
        ? 'allow-scripts allow-popups allow-popups-to-escape-sandbox allow-same-origin'
        : 'allow-scripts allow-popups allow-popups-to-escape-sandbox';

    return (
        <div
            ref={wrapperRef}
            // overflow-hidden como red de seguridad: si el hueco midiera mal,
            // el anuncio se recorta antes que sacar scroll horizontal a la página.
            className={cn('w-full flex justify-center overflow-hidden', className)}
            // Altura fija desde el primer render: sin esto el anuncio empuja el
            // contenido al llegar y penaliza CLS.
            style={{ height: h }}
        >
            <iframe
                title="Publicidad"
                src={`${frameOrigin}/ads/frame?zone=${format}`}
                width={w}
                height={h}
                scrolling="no"
                loading="lazy"
                // El creativo nunca comparte origen con la página: o va en un
                // origen opaco, o en el suyo propio. allow-popups permite el
                // clic legítimo al anunciante.
                sandbox={sandbox}
                className="border-0"
                style={{ width: w, height: h, display: 'block', flex: 'none' }}
            />
        </div>
    );
}
