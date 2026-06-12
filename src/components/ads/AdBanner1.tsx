'use client';

import { useEffect, useRef } from 'react';

/**
 * Native banner (effectivecpmnetwork / Adsterra).
 *
 * The network's invoke.js fills a container div by id with its own markup.
 * If that container is declared as a JSX child, React "owns" it and tries to
 * reconcile / remove the nodes the ad script injected — which throws
 * "Cannot read properties of null (reading 'removeChild')" on unmount or in
 * StrictMode's double-mount.
 *
 * Fix: React only owns the empty host <div>. The container and script are
 * created imperatively as its children, so React never reconciles their
 * interior, and cleanup just clears innerHTML (no targeted removeChild).
 */
const CONTAINER_ID = 'container-88c8fb19b1910255dd80c81c6c09fcfc';
const SCRIPT_SRC = 'https://pl29700108.effectivecpmnetwork.com/88c8fb19b1910255dd80c81c6c09fcfc/invoke.js';

export default function AdBanner1() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    // Start clean (handles StrictMode's mount→unmount→mount in dev).
    host.innerHTML = '';

    const container = document.createElement('div');
    container.id = CONTAINER_ID;
    container.className = 'w-full max-w-full';
    host.appendChild(container);

    const script = document.createElement('script');
    script.src = SCRIPT_SRC;
    script.async = true;
    script.setAttribute('data-cfasync', 'false');
    host.appendChild(script);

    return () => {
      // Safe cleanup: wipe the whole host instead of a targeted removeChild,
      // so a node the ad script already detached can't crash React.
      try {
        host.innerHTML = '';
      } catch {
        /* host already gone — nothing to clean */
      }
    };
  }, []);

  return (
    // overflow-x-hidden + max-w-full: never causes horizontal scroll on any
    // viewport (mobile / tablet / pc).
    <div
      ref={hostRef}
      suppressHydrationWarning
      className="flex flex-col items-center justify-center w-full max-w-full overflow-x-hidden"
    />
  );
}
