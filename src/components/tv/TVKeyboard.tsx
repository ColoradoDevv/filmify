'use client';

import { useRef, useEffect } from 'react';
import { Delete, CornerDownLeft, Space } from 'lucide-react';

interface TVKeyboardProps {
    value: string;
    onChange: (value: string) => void;
    onSubmit?: () => void;
    onClose?: () => void;
}

const ROWS = [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', '⌫'],
    ['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '↵'],
];

export default function TVKeyboard({ value, onChange, onSubmit, onClose }: TVKeyboardProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    // Focus first key on mount
    useEffect(() => {
        const firstBtn = containerRef.current?.querySelector<HTMLButtonElement>('button[data-key]');
        firstBtn?.focus();
    }, []);

    const handleKey = (key: string) => {
        if (key === '⌫') {
            onChange(value.slice(0, -1));
        } else if (key === '↵') {
            onSubmit?.();
        } else if (key === ' ') {
            onChange(value + ' ');
        } else {
            onChange(value + key);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        // Allow Escape to close keyboard
        if (e.key === 'Escape') {
            e.preventDefault();
            onClose?.();
        }
    };

    return (
        <div
            ref={containerRef}
            className="bg-surface-container/95 backdrop-blur-xl border border-outline-variant rounded-2xl p-4 shadow-[var(--shadow-5)]"
            onKeyDown={handleKeyDown}
            role="group"
            aria-label="Teclado virtual"
        >
            {/* Display */}
            <div className="mb-4 px-4 py-3 bg-surface-container-high rounded-xl border border-outline-variant flex items-center gap-2 min-h-[3.5rem]">
                <span className="text-white text-xl flex-1 font-medium tracking-wide">
                    {value || <span className="text-white/30">Escribe para buscar...</span>}
                </span>
                {value && (
                    <button
                        onClick={() => onChange('')}
                        className="text-white/40 hover:text-white transition-colors tv-focusable focus:outline-none focus:text-primary p-1 rounded"
                        aria-label="Borrar todo"
                        data-focusable="true"
                        tabIndex={0}
                    >
                        <Delete className="w-5 h-5" />
                    </button>
                )}
            </div>

            {/* Keys */}
            <div className="space-y-2">
                {ROWS.map((row, rowIndex) => (
                    <div key={rowIndex} className="flex gap-2 justify-center">
                        {row.map((key) => {
                            const isSpecial = key === '⌫' || key === '↵';
                            return (
                                <button
                                    key={key}
                                    data-key={key}
                                    data-focusable="true"
                                    tabIndex={0}
                                    onClick={() => handleKey(key)}
                                    className={[
                                        'flex items-center justify-center rounded-lg font-medium transition-all duration-150',
                                        'tv-focusable focus:outline-none focus:ring-2 focus:ring-primary focus:scale-110',
                                        'active:scale-95',
                                        isSpecial
                                            ? 'w-14 h-12 bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 text-lg'
                                            : 'w-11 h-11 bg-surface-container-high text-white border border-outline-variant hover:bg-surface-container-highest hover:border-primary/40 text-base',
                                    ].join(' ')}
                                    aria-label={
                                        key === '⌫' ? 'Borrar' :
                                        key === '↵' ? 'Buscar' :
                                        key
                                    }
                                >
                                    {key === '⌫' ? (
                                        <Delete className="w-4 h-4" />
                                    ) : key === '↵' ? (
                                        <CornerDownLeft className="w-4 h-4" />
                                    ) : (
                                        key.toUpperCase()
                                    )}
                                </button>
                            );
                        })}
                    </div>
                ))}

                {/* Space bar row */}
                <div className="flex gap-2 justify-center mt-1">
                    <button
                        data-key="space"
                        data-focusable="true"
                        tabIndex={0}
                        onClick={() => handleKey(' ')}
                        className="flex-1 max-w-xs h-11 bg-surface-container-high text-white/60 border border-outline-variant rounded-lg font-medium text-sm hover:bg-surface-container-highest hover:border-primary/40 transition-all tv-focusable focus:outline-none focus:ring-2 focus:ring-primary focus:scale-105 active:scale-95"
                        aria-label="Espacio"
                    >
                        ESPACIO
                    </button>
                </div>
            </div>

            {/* Hints */}
            <div className="mt-3 flex items-center justify-center gap-6 text-white/30 text-xs">
                <span className="flex items-center gap-1.5">
                    <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-[10px]">↑↓←→</kbd>
                    Navegar
                </span>
                <span className="flex items-center gap-1.5">
                    <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-[10px]">OK</kbd>
                    Seleccionar
                </span>
                <span className="flex items-center gap-1.5">
                    <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-[10px]">ESC</kbd>
                    Cerrar
                </span>
            </div>
        </div>
    );
}
