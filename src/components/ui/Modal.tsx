'use client';

import { X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useFocusTrap } from '@/hooks/useSpatialNavigation';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    description?: string;
    /** Icono/logo opcional a la izquierda del título. */
    icon?: React.ReactNode;
    children: React.ReactNode;
}

export default function Modal({ isOpen, onClose, title, description, icon, children }: ModalProps) {
    const [isVisible, setIsVisible] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    // Valor de overflow previo: se restaura al cerrar (no 'unset', que
    // rompía modales anidados o valores puestos por otro componente).
    const prevOverflowRef = useRef<string | null>(null);

    // Trampa de foco + devuelve el foco al cerrar.
    useFocusTrap(containerRef, isOpen);

    useEffect(() => {
        if (isOpen) {
            setIsVisible(true);
            if (prevOverflowRef.current === null) {
                prevOverflowRef.current = document.body.style.overflow;
            }
            document.body.style.overflow = 'hidden';
        } else {
            const timer = setTimeout(() => setIsVisible(false), 300);
            if (prevOverflowRef.current !== null) {
                document.body.style.overflow = prevOverflowRef.current;
                prevOverflowRef.current = null;
            }
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    // Si se desmonta abierto (cambio de ruta), no dejar el scroll bloqueado.
    useEffect(() => () => {
        if (prevOverflowRef.current !== null) {
            document.body.style.overflow = prevOverflowRef.current;
        }
    }, []);

    // Escape cierra.
    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isOpen, onClose]);

    if (!isVisible && !isOpen) return null;

    return (
        <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-all duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}>
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div ref={containerRef} role="dialog" aria-modal="true" aria-label={title} className={`relative bg-surface border border-surface-light rounded-2xl w-full max-w-md shadow-2xl transform transition-all duration-300 ${isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}>
                <div className="flex items-center justify-between p-6 border-b border-surface-light">
                    <div className="flex items-center gap-3 min-w-0">
                        {icon}
                        <div className="min-w-0">
                            <h3 className="text-xl font-bold text-white">{title}</h3>
                            {description && <p className="text-sm text-gray-400 mt-1">{description}</p>}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        aria-label="Cerrar"
                        className="p-2 hover:bg-surface-light rounded-lg transition-colors text-text-secondary hover:text-white"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6">
                    {children}
                </div>
            </div>
        </div>
    );
}
