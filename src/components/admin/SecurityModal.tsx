'use client';

import { X, AlertTriangle, ShieldAlert, Info, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

interface SecurityModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    description: string;
    variant?: 'danger' | 'warning' | 'info' | 'success';
    confirmText?: string;
    cancelText?: string;
    loading?: boolean;
}

export default function SecurityModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    variant = 'danger',
    confirmText = 'CONFIRM',
    cancelText = 'CANCEL',
    loading = false
}: SecurityModalProps) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setIsVisible(true);
            document.body.style.overflow = 'hidden';
        } else {
            const timer = setTimeout(() => setIsVisible(false), 300);
            document.body.style.overflow = 'unset';
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    if (!isVisible && !isOpen) return null;

    const getVariantStyles = () => {
        switch (variant) {
            case 'danger':
                return {
                    border: 'border-red-500/30',
                    icon: <ShieldAlert className="w-12 h-12 text-red-500 mb-4 animate-pulse" />,
                    button: 'bg-red-500/20 text-red-400 border-red-500/50 hover:bg-red-500/30',
                    title: 'text-red-500'
                };
            case 'warning':
                return {
                    border: 'border-amber-500/30',
                    icon: <AlertTriangle className="w-12 h-12 text-amber-500 mb-4" />,
                    button: 'bg-amber-500/20 text-amber-400 border-amber-500/50 hover:bg-amber-500/30',
                    title: 'text-amber-500'
                };
            case 'success':
                return {
                    border: 'border-emerald-500/30',
                    icon: <ShieldCheck className="w-12 h-12 text-emerald-500 mb-4" />,
                    button: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 hover:bg-emerald-500/30',
                    title: 'text-emerald-500'
                };
            default:
                return {
                    border: 'border-blue-500/30',
                    icon: <Info className="w-12 h-12 text-blue-500 mb-4" />,
                    button: 'bg-blue-500/20 text-blue-400 border-blue-500/50 hover:bg-blue-500/30',
                    title: 'text-blue-500'
                };
        }
    };

    const styles = getVariantStyles();

    return (
        <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-all duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}>
            {/* Backdrop with scanline effect */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                onClick={!loading ? onClose : undefined}
            >
                <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-10 pointer-events-none bg-[length:100%_2px,3px_100%]" />
            </div>

            {/* Modal Content */}
            <div className={`relative bg-black border ${styles.border} rounded-lg w-full max-w-sm shadow-2xl transform transition-all duration-300 ${isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}>
                {/* Decorative Corners */}
                <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-white/20" />
                <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-white/20" />
                <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-white/20" />
                <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-white/20" />

                <div className="p-8 flex flex-col items-center text-center">
                    {styles.icon}
                    <h3 className={`text-xl font-bold font-mono tracking-wider mb-2 ${styles.title}`}>{title}</h3>
                    <p className="text-slate-400 text-sm font-mono mb-8 leading-relaxed">
                        {description}
                    </p>

                    <div className="flex gap-4 w-full">
                        <Button
                            variant="ghost"
                            onClick={onClose}
                            disabled={loading}
                            className="flex-1 border border-white/10 text-slate-400 hover:bg-white/5 hover:text-white font-mono"
                        >
                            {cancelText}
                        </Button>
                        <Button
                            onClick={onConfirm}
                            disabled={loading}
                            className={`flex-1 border font-mono ${styles.button}`}
                        >
                            {loading ? 'PROCESSING...' : confirmText}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
