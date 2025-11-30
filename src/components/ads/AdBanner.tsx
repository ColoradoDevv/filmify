'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

declare global {
    interface Window {
        adsbygoogle: any[];
    }
}

interface AdBannerProps {
    /**
     * Position of the ad banner
     * - 'hero': Between hero and content grid
     * - 'sidebar': In sidebar or chat areas
     * - 'inline': Inline with content
     */
    position?: 'hero' | 'sidebar' | 'inline';

    /**
     * Whether the ad can be dismissed by the user
     */
    dismissible?: boolean;

    /**
     * Custom class name for styling
     */
    className?: string;
}

export default function AdBanner({
    position = 'hero',
    dismissible = false,
    className = ''
}: AdBannerProps) {
    const [isDismissed, setIsDismissed] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        // Load AdSense ads
        const timer = setTimeout(() => {
            setIsLoaded(true);

            // Push ad to AdSense queue if configured
            if (process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID && typeof window !== 'undefined') {
                try {
                    (window.adsbygoogle = window.adsbygoogle || []).push({});
                } catch (err) {
                    console.error('AdSense error:', err);
                }
            }
        }, 100);

        return () => clearTimeout(timer);
    }, []);

    if (isDismissed) return null;

    const getAdConfig = () => {
        switch (position) {
            case 'hero':
                return {
                    width: 'w-full max-w-5xl',
                    height: 'h-24 sm:h-32',
                    text: 'Anuncio - 728x90',
                    slot: process.env.NEXT_PUBLIC_ADSENSE_SLOT_HERO
                };
            case 'sidebar':
                return {
                    width: 'w-full',
                    height: 'h-64',
                    text: 'Anuncio - 300x250',
                    slot: process.env.NEXT_PUBLIC_ADSENSE_SLOT_SIDEBAR
                };
            case 'inline':
                return {
                    width: 'w-full',
                    height: 'h-20',
                    text: 'Anuncio - 468x60',
                    slot: process.env.NEXT_PUBLIC_ADSENSE_SLOT_INLINE
                };
            default:
                return {
                    width: 'w-full',
                    height: 'h-24',
                    text: 'Anuncio',
                    slot: undefined
                };
        }
    };

    const adConfig = getAdConfig();
    const hasAdSense = !!process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;

    return (
        <div className={`relative ${className}`}>
            {/* Ad Container */}
            <div
                className={`
          ${adConfig.width} 
          ${adConfig.height} 
          mx-auto
          bg-gradient-to-br from-surface-light/30 to-surface/50
          border border-surface-light/50
          rounded-xl
          overflow-hidden
          backdrop-blur-sm
          transition-all duration-300
          ${isLoaded ? 'opacity-100' : 'opacity-0'}
        `}
            >
                {/* Ad Label */}
                <div className="absolute top-2 left-2 px-2 py-0.5 bg-surface-light/80 rounded text-[10px] text-text-muted uppercase tracking-wider z-10">
                    Publicidad
                </div>

                {/* Dismiss Button */}
                {dismissible && (
                    <button
                        onClick={() => setIsDismissed(true)}
                        className="absolute top-2 right-2 p-1 bg-surface-light/80 hover:bg-surface-light rounded-full transition-colors group z-10"
                        aria-label="Cerrar anuncio"
                    >
                        <X className="w-3 h-3 text-text-muted group-hover:text-white" />
                    </button>
                )}

                {/* Ad Content */}
                <div className="w-full h-full flex items-center justify-center">
                    {hasAdSense && adConfig.slot ? (
                        // Real Google AdSense Ad
                        <ins
                            className="adsbygoogle"
                            style={{ display: 'block', width: '100%', height: '100%' }}
                            data-ad-client={process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID}
                            data-ad-slot={adConfig.slot}
                            data-ad-format="auto"
                            data-full-width-responsive="true"
                            data-adtest={process.env.NODE_ENV === 'development' ? 'on' : 'off'}
                        />
                    ) : (
                        // Placeholder when AdSense is not configured
                        <div className="text-center space-y-2 p-4">
                            <div className="text-text-muted text-sm font-medium">
                                {adConfig.text}
                            </div>
                            <div className="text-text-muted/60 text-xs">
                                Espacio publicitario
                            </div>

                            {/* Upgrade CTA for free users */}
                            <div className="mt-4">
                                <a
                                    href="/pricing"
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary/20 hover:bg-primary/30 text-primary rounded-lg text-xs font-semibold transition-colors"
                                >
                                    Eliminar anuncios con Premium
                                </a>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Premium Upgrade Hint (optional) */}
            {position === 'hero' && (
                <div className="text-center mt-2">
                    <p className="text-xs text-text-muted">
                        ¿Cansado de los anuncios?{' '}
                        <a href="/pricing" className="text-primary hover:text-accent transition-colors font-semibold">
                            Prueba Premium gratis
                        </a>
                    </p>
                </div>
            )}
        </div>
    );
}
