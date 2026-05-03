'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { User, Settings, LogOut } from 'lucide-react';

interface UserMenuProps {
    onLogoutClick: () => void;
    avatarUrl?: string | null;
}

export default function UserMenu({ onLogoutClick, avatarUrl }: UserMenuProps) {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node) &&
                buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Close on Escape key
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && isOpen) {
                setIsOpen(false);
                buttonRef.current?.focus();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen]);

    return (
        <div className="relative">
            <button
                ref={buttonRef}
                onClick={() => setIsOpen(!isOpen)}
                className="relative group cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/50 rounded-xl"
                aria-label="Menú de usuario"
                aria-haspopup="true"
                aria-expanded={isOpen}
            >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-primary border border-primary/20 group-hover:border-primary/40 transition-all overflow-hidden">
                    {avatarUrl ? (
                        <img
                            src={avatarUrl}
                            alt="Avatar"
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <User className="w-5 h-5" />
                    )}
                </div>
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div
                    ref={menuRef}
                    className="absolute top-full right-0 mt-2 w-48 bg-surface border border-surface-light rounded-xl shadow-xl overflow-hidden z-50 animate-scale-in"
                    role="menu"
                    aria-orientation="vertical"
                    aria-labelledby="user-menu-button"
                >
                    <div className="p-2 space-y-1">
                        <Link
                            href="/settings"
                            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-surface-light/50 text-text-secondary hover:text-text-primary transition-colors focus:outline-none focus:bg-surface-light/50"
                            onClick={() => setIsOpen(false)}
                            role="menuitem"
                        >
                            <Settings className="w-4 h-4" />
                            <span className="text-sm font-medium">Configuración</span>
                        </Link>
                        <div className="h-px bg-surface-light/50 my-1" role="separator" />
                        <button
                            onClick={() => {
                                setIsOpen(false);
                                onLogoutClick();
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-red-500/10 text-text-secondary hover:text-red-500 transition-colors focus:outline-none focus:bg-red-500/10"
                            role="menuitem"
                        >
                            <LogOut className="w-4 h-4" />
                            <span className="text-sm font-medium">Cerrar Sesión</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
