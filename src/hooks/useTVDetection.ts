'use client';

import { useEffect, useState } from 'react';
import { detectTV } from '@/lib/detectTV';

const TV_MODE_COOKIE = 'filmify_tv_mode';

function hasTVCookie(): boolean {
    if (typeof document === 'undefined') return false;
    return document.cookie.split('; ').some(c => c === `${TV_MODE_COOKIE}=1`);
}

/**
 * Hook to detect if the application is running on a TV device.
 * Checks (in order): manual cookie override, then User-Agent / screen heuristics.
 */
export function useTVDetection() {
    const [isTV, setIsTV] = useState(false);
    const [isTVBrowser, setIsTVBrowser] = useState(false);

    useEffect(() => {
        const check = () => {
            const tvActive = hasTVCookie() || detectTV();
            setIsTV(tvActive);
            setIsTVBrowser(tvActive);
        };

        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);

    return { isTV, isTVBrowser };
}
