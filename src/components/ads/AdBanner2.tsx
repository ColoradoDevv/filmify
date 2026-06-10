'use client';

import { useEffect, useRef } from 'react';

/**
 * 728×90 leaderboard (highperformanceformat).
 *
 * IMPORTANT: this network's invoke.js uses document.write(), which browsers
 * silently block when the script is injected asynchronously into <head>.
 * The reliable pattern is to run it inside a dedicated same-origin iframe,
 * where document.write works normally and the ad can't touch our DOM/CSS.
 */
const AD_KEY = '7deb51e34387a0c43737578eb16dfe23';
const AD_WIDTH = 728;
const AD_HEIGHT = 90;

export default function AdBanner2() {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
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
  }, []);

  return (
    <iframe
      ref={iframeRef}
      title="Publicidad"
      width={AD_WIDTH}
      height={AD_HEIGHT}
      scrolling="no"
      className="border-0 mx-auto block"
      style={{ width: AD_WIDTH, height: AD_HEIGHT }}
    />
  );
}
