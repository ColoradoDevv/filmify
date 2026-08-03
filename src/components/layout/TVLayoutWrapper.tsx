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

    const tvActive = isTV || forceTVMode;

    useEffect(() => {
        setMounted(true);

        if (tvActive) {
            document.body.classList.add('tv-mode');
            // Hide the normal platform layout elements (sidebar, header)
            // so the TV overlay can take full screen without conflicts
            document.body.style.overflow = 'hidden';
        } else {
            document.body.classList.remove('tv-mode');
            document.body.style.overflow = '';
        }

        return () => {
            document.body.classList.remove('tv-mode');
            document.body.style.overflow = '';
        };
    }, [tvActive]);

    // Prevent hydration mismatch — render children until mounted
    if (!mounted) {
        return <>{children}</>;
    }

    if (!tvActive) {
        return <>{children}</>;
    }

    // Render TV layout as a fixed full-screen overlay so it escapes
    // the normal PlatformLayout (sidebar + header) completely
    return (
        <div className="fixed inset-0 z-[100] bg-background text-white overflow-y-auto overflow-x-hidden">
            {tvLayout}
        </div>
    );
}
