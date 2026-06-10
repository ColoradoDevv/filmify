'use client';

import { useEffect, useRef } from 'react';

/**
 * Native banner (effectivecpmnetwork / Adsterra).
 * The network's invoke.js looks for the container div by id and fills it.
 * We always (re)inject a fresh script next to the container so the unit
 * re-renders correctly after client-side navigations.
 */
const CONTAINER_ID = 'container-88c8fb19b1910255dd80c81c6c09fcfc';
const SCRIPT_SRC = 'https://pl29700108.effectivecpmnetwork.com/88c8fb19b1910255dd80c81c6c09fcfc/invoke.js';

export default function AdBanner1() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    // Remove any stale copy (e.g. left from a previous route) so the
    // network script runs again and fills THIS container.
    document.querySelectorAll(`script[src="${SCRIPT_SRC}"]`).forEach((s) => s.remove());

    const script = document.createElement('script');
    script.src = SCRIPT_SRC;
    script.async = true;
    script.setAttribute('data-cfasync', 'false');

    // Recommended placement: right next to the container, not in <head>.
    host.appendChild(script);

    return () => {
      script.remove();
    };
  }, []);

  return (
    <div ref={hostRef} className="flex flex-col items-center justify-center w-full">
      <div id={CONTAINER_ID} className="w-full" />
    </div>
  );
}
