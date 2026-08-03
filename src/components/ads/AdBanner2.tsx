'use client';

import { useEffect, useRef, useState } from 'react';
import { getConsent, onConsentChange } from '@/lib/cookie-consent';
import { cn } from '@/lib/utils';

/**
 * 728×90 leaderboard (highperformanceformat / Adsterra).
 *
 * CUMPLIMIENTO: solo se carga si el usuario aceptó cookies de marketing.
 *
 * IMPORTANT: this network's invoke.js uses document.write(), which browsers
 * silently block when the script is injected asynchronously into <head>.
 * The reliable pattern is to run it inside a dedicated same-origin iframe,
 * where document.write works normally and the ad can't touch our DOM/CSS.
 *
 * Responsive:
 * - Desktop (768px+): 728×90 a tamaño completo
 * - Tablet (480px-767px): 728×90 escalado proporcionalmente
 * - Móvil muy pequeño (<480px): Oculto (evita bloquear contenido)
 */
const AD_KEY = '7deb51e34387a0c43737578eb16dfe23';
const AD_WIDTH = 728;
const AD_HEIGHT = 90;
const TABLET_BREAKPOINT = 768;
const MOBILE_SMALL_BREAKPOINT = 480;

interface AdBanner2Props {
  /** Clases extra para el contenedor (p. ej. márgenes). Solo aplican cuando el ad se muestra. */
  className?: string;
}

export default function AdBanner2({ className }: AdBanner2Props = {}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [marketingOk, setMarketingOk] = useState(false);
  const [scale, setScale] = useState(1);
  const [isSmallMobile, setIsSmallMobile] = useState(false);

  // Sincroniza consentimiento de marketing (inicial + cambios en vivo)
  useEffect(() => {
    setMarketingOk(getConsent().marketing);
    return onConsentChange((c) => setMarketingOk(c.marketing));
  }, []);

  // Detectar móvil muy pequeño (<480px) para ocultarlo
  useEffect(() => {
    const checkSmallMobile = () => setIsSmallMobile(window.innerWidth < MOBILE_SMALL_BREAKPOINT);
    checkSmallMobile();

    window.addEventListener('resize', checkSmallMobile);
    return () => window.removeEventListener('resize', checkSmallMobile);
  }, []);

  // Inyectar anuncio en iframe (solo con consentimiento de marketing)
  useEffect(() => {
    if (!marketingOk) return;

    const iframe = iframeRef.current;
    if (!iframe?.contentDocument) return;

    try {
      const doc = iframe.contentDocument;
      doc.open();
      doc.write(`<!DOCTYPE html>
<html>
<head><style>html,body{margin:0;padding:0;overflow:hidden;background:transparent}</style></head>
<body>
<script type="text/javascript">
  window.atOptions = {
    'key': '${AD_KEY}',
    'format': 'iframe',
    'height': ${AD_HEIGHT},
    'width': ${AD_WIDTH},
    'params': {}
  };
</script>
<script type="text/javascript" src="https://www.highperformanceformat.com/${AD_KEY}/invoke.js"></script>
</body>
</html>`);
      doc.close();
    } catch (err) {
      console.error('Error al cargar anuncio:', err);
    }
  }, [marketingOk]);

  // Ajustar escala responsiva (nunca upscale, solo downscale)
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const updateScale = () => {
      const availableWidth = wrapper.clientWidth;
      // Máximo scale = 1 (nunca agrandar), mínimo = contenedor disponible / ancho del anuncio
      const newScale = Math.min(1, availableWidth / AD_WIDTH);
      setScale(newScale);
    };

    updateScale();

    // Solo usar ResizeObserver (más eficiente que window resize + ResizeObserver)
    const observer = new ResizeObserver(updateScale);
    observer.observe(wrapper);

    return () => observer.disconnect();
  }, []);

  // Ocultar en móviles muy pequeños para no bloquear contenido
  if (!marketingOk || isSmallMobile) return null;

  return (
    <div
      ref={wrapperRef}
      className={cn('w-full flex justify-center py-4 overflow-hidden', className)}
      style={{
        // Reservar altura sin overflow ni scroll
        minHeight: AD_HEIGHT * scale,
        maxWidth: '100%',
      }}
    >
      <iframe
        ref={iframeRef}
        title="Publicidad"
        width={AD_WIDTH}
        height={AD_HEIGHT}
        scrolling="no"
        sandbox="allow-scripts allow-same-origin"
        className="border-0"
        style={{
          width: AD_WIDTH,
          height: AD_HEIGHT,
          display: 'block',
          transform: `scale(${scale})`,
          transformOrigin: 'top center',
          flex: 'none',
        }}
      />
    </div>
  );
}
