'use client';

import { useState, useEffect } from 'react';
import { Info, AlertTriangle, CheckCircle, X } from "lucide-react";

interface AnnouncementBannerProps {
    message: string;
    type: 'info' | 'warning' | 'success';
}

export default function AnnouncementBanner({ message, type }: AnnouncementBannerProps) {
    const [isVisible, setIsVisible] = useState(false); // Start false to avoid flash
    const [height, setHeight] = useState(0);

    useEffect(() => {
        // Check if dismissed
        const dismissed = localStorage.getItem('filmify_announcement_dismissed');
        if (dismissed !== message) {
            setIsVisible(true);
        }
    }, [message]);

    useEffect(() => {
        if (isVisible) {
            const updateHeight = () => {
                const el = document.getElementById('system-announcement');
                if (el) {
                    const h = el.offsetHeight;
                    setHeight(h);
                    document.documentElement.style.setProperty('--announcement-height', `${h}px`);
                }
            };

            updateHeight();
            window.addEventListener('resize', updateHeight);
            return () => {
                window.removeEventListener('resize', updateHeight);
                document.documentElement.style.removeProperty('--announcement-height');
            };
        }
    }, [isVisible]);

    const handleDismiss = () => {
        setIsVisible(false);
        localStorage.setItem('filmify_announcement_dismissed', message);
        document.documentElement.style.removeProperty('--announcement-height');
    };

    if (!isVisible) return null;

    const styles = {
        info: "bg-blue-600 text-white",
        warning: "bg-amber-500 text-black",
        success: "bg-emerald-600 text-white"
    };

    const icons = {
        info: <Info className="w-4 h-4" />,
        warning: <AlertTriangle className="w-4 h-4" />,
        success: <CheckCircle className="w-4 h-4" />
    };

    return (
        <div
            id="system-announcement"
            className={`${styles[type]} px-4 py-2 text-center fixed top-0 left-0 right-0 z-[100] font-medium shadow-md flex items-center justify-center gap-2 animate-in slide-in-from-top duration-300`}
        >
            {icons[type]}
            <span>{message}</span>
            <button
                onClick={handleDismiss}
                className="absolute right-4 p-1 hover:bg-black/10 rounded-full transition-colors"
                aria-label="Cerrar anuncio"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );
}
