'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Info, AlertTriangle, CheckCircle, X } from 'lucide-react';

interface AnnouncementBannerProps {
    id: string;
    message: string;
    type?: 'info' | 'warning' | 'success';
}

const STORAGE_KEY_PREFIX = 'filmify_banner_dismissed_';

const ICONS = {
    info: Info,
    warning: AlertTriangle,
    success: CheckCircle,
} as const;

const STYLES = {
    info: 'bg-blue-600 text-white',
    warning: 'bg-amber-500 text-black',
    success: 'bg-emerald-600 text-white',
} as const;

export default function AnnouncementBanner({
    id,
    message,
    type = 'info',
}: AnnouncementBannerProps) {
    const [mounted, setMounted] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const [isExiting, setIsExiting] = useState(false);
    const bannerRef = useRef<HTMLDivElement>(null);
    const Icon = ICONS[type];

    // Marcar como montado solo en el cliente
    useEffect(() => {
        setMounted(true);
    }, []);

    // Una vez montado, determinar visibilidad desde localStorage
    useEffect(() => {
        if (!mounted) return;
        const dismissed = localStorage.getItem(STORAGE_KEY_PREFIX + id);
        if (dismissed !== '1') {
            setIsVisible(true);
        }
    }, [id, mounted]);

    // Reiniciar visibilidad si cambia el ID del anuncio (y está montado)
    useEffect(() => {
        if (!mounted) return;
        const dismissed = localStorage.getItem(STORAGE_KEY_PREFIX + id);
        if (dismissed !== '1') {
            setIsVisible(true);
            setIsExiting(false);
        }
    }, [id, mounted]);

    // Sincronizar altura del banner como variable CSS
    useEffect(() => {
        if (!isVisible && !isExiting) {
            document.documentElement.style.removeProperty('--announcement-height');
            return;
        }

        const updateHeight = () => {
            if (bannerRef.current) {
                const h = bannerRef.current.offsetHeight;
                document.documentElement.style.setProperty('--announcement-height', `${h}px`);
            }
        };

        updateHeight();
        window.addEventListener('resize', updateHeight);

        return () => {
            window.removeEventListener('resize', updateHeight);
            if (!isExiting) {
                document.documentElement.style.removeProperty('--announcement-height');
            }
        };
    }, [isVisible, isExiting]);

    const handleDismiss = useCallback(() => {
        setIsExiting(true);
    }, []);

    const onAnimationEnd = useCallback(() => {
        if (!isExiting) return;
        setIsVisible(false);
        setIsExiting(false);
        localStorage.setItem(STORAGE_KEY_PREFIX + id, '1');
        document.documentElement.style.removeProperty('--announcement-height');
    }, [isExiting, id]);

    // Mientras no esté montado (SSR), no renderizar nada → evita diferencias con el cliente
    if (!mounted) return null;

    if (!isVisible) return null;

    return (
        <div
            ref={bannerRef}
            role="alert"
            aria-live="polite"
            className={`
                ${STYLES[type]}
                px-4 py-2 text-center fixed top-0 left-0 right-0 z-[100]
                font-medium shadow-md flex items-center justify-center gap-2
                pr-12 sm:pr-4
                transition-all duration-300
                ${isExiting
                    ? 'animate-out slide-out-to-top opacity-0 -translate-y-full'
                    : 'animate-in slide-in-from-top opacity-100 translate-y-0'
                }
            `}
            onAnimationEnd={onAnimationEnd}
        >
            <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span className="truncate">{message}</span>
            <button
                onClick={handleDismiss}
                className="absolute right-2 sm:right-4 p-1 hover:bg-black/10 rounded-full transition-colors"
                aria-label={`Cerrar anuncio: ${message}`}
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );
}