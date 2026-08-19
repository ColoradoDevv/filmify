'use client';

import { useEffect, useRef, useState } from 'react';
import { getConsent, onConsentChange } from '@/lib/cookie-consent';
import { getAdsConfig } from '@/lib/env';
import { trackAdView } from '@/lib/analytics';
import { cn } from '@/lib/utils';

/**
 * Banner de Adsterra en sus cuatro formatos.
 *
 * CUMPLIMIENTO: solo se carga con consentimiento de marketing. Fuera del EEE
 * ese consentimiento viene concedido por defecto (ver `@/lib/cookie-consent`).
 *
 * IMPORTANT: el código "iFrame Sync" de esta red usa `document.write()`, que
 * los navegadores ignoran en silencio si el script se inyecta de forma
 * asíncrona en <head>. El patrón fiable es ejecutarlo dentro de un iframe
 * same-origin propio, donde `document.write` funciona con normalidad y el
 * anuncio no puede tocar nuestro DOM/CSS.
 *
 * Cada formato lleva su PROPIA clave de zona: una clave creada como 728x90 no
 * rellena un hueco de 320x50, devuelve vacío. Antes se escalaba el 728x90 con
 * `transform: scale()` para que cupiera en pantallas pequeñas; eso servía un
 * creativo a un tamaño que el anunciante no compró y encima provocaba salto de
 * layout, porque la altura reservada dependía de un `scale` que se calculaba
 * tras el primer render. Ahora cada tamaño se sirve a su tamaño nativo y solo
 * en los anchos donde cabe entero.
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

/** Devuelve la clave configurada para el formato, o '' si no la hay. */
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
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const nativeRef = useRef<HTMLDivElement>(null);
    const [marketingOk, setMarketingOk] = useState(false);

    const adKey = keyFor(format);

    // Consentimiento de marketing (estado inicial + cambios en vivo).
    useEffect(() => {
        setMarketingOk(getConsent().marketing);
        return onConsentChange((c) => setMarketingOk(c.marketing));
    }, []);

    // Banners iframe: se escribe el tag dentro del iframe con document.write.
    useEffect(() => {
        if (!marketingOk || !adKey || format === 'native') return;

        const iframe = iframeRef.current;
        if (!iframe?.contentDocument) return;

        const { w, h } = IFRAME_SIZES[format];

        try {
            const doc = iframe.contentDocument;
            doc.open();
            doc.write(`<!DOCTYPE html>
<html>
<head><style>html,body{margin:0;padding:0;overflow:hidden;background:transparent}</style></head>
<body>
<script type="text/javascript">
  window.atOptions = {
    'key': '${adKey}',
    'format': 'iframe',
    'height': ${h},
    'width': ${w},
    'params': {}
  };
</script>
<script type="text/javascript" src="https://www.highperformanceformat.com/${adKey}/invoke.js"></script>
</body>
</html>`);
            doc.close();
        } catch (err) {
            console.error('Error al cargar anuncio:', err);
        }
    }, [marketingOk, adKey, format]);

    // Native Banner: script async + <div> contenedor que la red rellena.
    // Va en el documento principal (no en un iframe) porque su script busca el
    // contenedor por id en el mismo documento donde se ejecuta.
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
                className={cn('w-full', className)}
                style={{ minHeight: NATIVE_MIN_HEIGHT }}
            >
                <div ref={nativeRef} />
                {nativeContainerId && <div id={nativeContainerId} />}
            </div>
        );
    }

    const { w, h } = IFRAME_SIZES[format];

    return (
        <div
            ref={wrapperRef}
            className={cn('w-full flex justify-center', className)}
            // Altura fija desde el primer render: sin esto el anuncio empuja el
            // contenido al llegar y penaliza CLS.
            style={{ height: h }}
        >
            <iframe
                ref={iframeRef}
                title="Publicidad"
                width={w}
                height={h}
                scrolling="no"
                sandbox="allow-scripts allow-same-origin"
                className="border-0"
                style={{ width: w, height: h, display: 'block', flex: 'none' }}
            />
        </div>
    );
}
