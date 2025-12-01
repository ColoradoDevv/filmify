'use client';

import { useState } from 'react';
import { Info, AlertTriangle, CheckCircle, X } from "lucide-react";

interface AnnouncementBannerProps {
    message: string;
    type: 'info' | 'warning' | 'success';
}

export default function AnnouncementBanner({ message, type }: AnnouncementBannerProps) {
    const [isVisible, setIsVisible] = useState(true);

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
        <div className={`${styles[type]} px-4 py-2 text-center relative z-[100] font-medium shadow-md flex items-center justify-center gap-2 animate-in slide-in-from-top duration-300`}>
            {icons[type]}
            <span>{message}</span>
            <button
                onClick={() => setIsVisible(false)}
                className="absolute right-4 p-1 hover:bg-black/10 rounded-full transition-colors"
                aria-label="Cerrar anuncio"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );
}
