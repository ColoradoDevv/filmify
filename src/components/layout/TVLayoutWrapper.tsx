'use client';

'use client';

import { useEffect, useState } from 'react';
import { useTVDetection } from '@/hooks/useTVDetection';

interface TVLayoutWrapperProps {
    children: React.ReactNode;
    tvLayout: React.ReactNode;
    forceTVMode?: boolean;
}

export default function TVLayoutWrapper({ children, tvLayout, forceTVMode = false }: TVLayoutWrapperProps) {
    const { isTV } = useTVDetection();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);

        // Add TV mode class to body
        if (isTV || forceTVMode) {
            document.body.classList.add('tv-mode');
        } else {
            document.body.classList.remove('tv-mode');
        }

        return () => {
            document.body.classList.remove('tv-mode');
        };
    }, [isTV, forceTVMode]);

    // Prevent hydration mismatch
    if (!mounted) {
        return <>{children}</>;
    }

    // Show TV layout if TV is detected or forced
    return (isTV || forceTVMode) ? <>{tvLayout}</> : <>{children}</>;
}
