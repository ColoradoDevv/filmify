'use client';

import { useEffect, useState } from 'react';

import { detectTV } from '@/lib/detectTV';

/**
 * Hook to detect if the application is running on a TV device
 * Checks user agent and screen characteristics
 */
export function useTVDetection() {
    const [isTV, setIsTV] = useState(false);
    const [isTVBrowser, setIsTVBrowser] = useState(false);

    useEffect(() => {
        const checkTV = () => {
            const tvDetected = detectTV();
            setIsTV(tvDetected);
            setIsTVBrowser(tvDetected);

            // Store in localStorage for persistence
            if (tvDetected) {
                localStorage.setItem('filmify_tv_mode', 'true');
            }
        };

        checkTV();

        // Re-detect on resize (in case of windowed mode on TV or devtools)
        window.addEventListener('resize', checkTV);
        return () => window.removeEventListener('resize', checkTV);
    }, []);

    return { isTV, isTVBrowser };
}

/**
 * Hook to manually enable/disable TV mode
 */
export function useTVMode() {
    const [tvMode, setTVMode] = useState(false);

    useEffect(() => {
        const stored = localStorage.getItem('filmify_tv_mode');
        setTVMode(stored === 'true');
    }, []);

    const enableTVMode = () => {
        localStorage.setItem('filmify_tv_mode', 'true');
        setTVMode(true);
    };

    const disableTVMode = () => {
        localStorage.removeItem('filmify_tv_mode');
        setTVMode(false);
    };

    const toggleTVMode = () => {
        if (tvMode) {
            disableTVMode();
        } else {
            enableTVMode();
        }
    };

    return { tvMode, enableTVMode, disableTVMode, toggleTVMode };
}
