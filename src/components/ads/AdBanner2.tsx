'use client';

import { useEffect, useRef, useState } from 'react';
import { getConsent, onConsentChange } from '@/lib/cookie-consent';

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
 * Responsive: the unit is a fixed 728×90, so on narrower screens (mobile /
 * tablet) we down-scale the whole iframe with a CSS transform and reserve the
 * scaled height — it fits any viewport without overflow or horizontal scroll.
 */
const AD_KEY = '7deb51e34387a0c43737578eb16dfe23';
const AD_WIDTH = 728;
const AD_HEIGHT = 90;

export default function AdBanner2() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [scale, setScale] = useState(1);
  const [marketingOk, setMarketingOk] = useState(false);

  // Sincroniza con el consentimiento de marketing (inicial + cambios en vivo).
  useEffect(() => {
    setMarketingOk(getConsent().marketing);
    return onConsentChange((c) => setMarketingOk(c.marketing));
  }, []);

  // Inject the ad once (solo con consentimiento de marketing).
  useEffect(() => {
    if (!marketingOk) return;
    const iframe = iframeRef.current;
    if (!iframe) return;

    const doc = iframe.contentDocument;
    if (!doc) return;

    doc.open();
    doc.write(`<!DOCTYPE html>
<html>
<head><style>html,body{margin:0;padding:0;overflow:hidden;background:transparent}</style></head>
<body>
<script type="text/javascript">
  atOptions = {
    'key': '${AD_KEY}',
    'format': 'iframe',
    'height': ${AD_HEIGHT},
    'width': ${AD_WIDTH},
    'params': {}
  };
<\/script>
<script type="text/javascript" src="https://www.highperformanceformat.com/${AD_KEY}/invoke.js"><\/script>
</body>
</html>`);
    doc.close();
  }, [marketingOk]);

  // Down-scale to fit the available width (never upscale beyond 1).
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const update = () => {
      const available = wrapper.clientWidth;
      setScale(Math.min(1, available / AD_WIDTH));
    };
    update();

    const ro = new ResizeObserver(update);
    ro.observe(wrapper);
    window.addEventListener('resize', update);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
    };
  }, []);

  // Sin consentimiento de marketing no renderizamos el anuncio.
  if (!marketingOk) return null;

  return (
    // Reserve the *scaled* height so there's no layout shift and no overflow.
    <div
      ref={wrapperRef}
      className="w-full max-w-full overflow-hidden flex justify-center"
      style={{ height: AD_HEIGHT * scale }}
    >
      <iframe
        ref={iframeRef}
        title="Publicidad"
        width={AD_WIDTH}
        height={AD_HEIGHT}
        scrolling="no"
        className="border-0 block"
        style={{
          width: AD_WIDTH,
          height: AD_HEIGHT,
          transform: `scale(${scale})`,
          transformOrigin: 'top center',
          flex: 'none',
        }}
      />
    </div>
  );
}
