'use client';

import Link from 'next/link';
import { Coffee, Heart, X } from 'lucide-react';
import { useState, useEffect } from 'react';

/**
 * Enlace de donación/apoyo, configurable por env var para no hardcodear la
 * cuenta: pon NEXT_PUBLIC_DONATE_URL con tu enlace de Ko-fi / BuyMeACoffee.
 * Mientras no exista, cae a /contact (inofensivo) en vez de un enlace roto.
 */
export const DONATE_URL = process.env.NEXT_PUBLIC_DONATE_URL;

// Fallback seguro cuando la env var no está definida
const safeDonateUrl = DONATE_URL ?? '/contact';

const isExternal = /^https?:\/\//i.test(safeDonateUrl);

/** Props comunes: el destino se abre en pestaña nueva si es externo. */
function donateLinkProps() {
    return isExternal
        ? { href: safeDonateUrl, target: '_blank' as const, rel: 'noopener noreferrer' }
        : { href: safeDonateUrl };
}

// ── Variante 1: chip/botón compacto (header, menús) ──────────────────────────
export function DonateChip({ className = '' }: { className?: string }) {
    return (
        <Link
            {...donateLinkProps()}
            aria-label="Apoya FilmiFy con una donación"
            className={`group inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-primary/10 border border-primary/20 text-primary md3-label-medium hover:bg-primary/20 transition-colors ${className}`}
        >
            <Coffee className="w-4 h-4" />
            <span className="hidden sm:inline">Apóyanos</span>
        </Link>
    );
}

// ── Variante 2: banner horizontal (entre secciones de contenido) ─────────────
export function DonateBanner({ className = '' }: { className?: string }) {
    return (
        <Link
            {...donateLinkProps()}
            className={`group flex items-center gap-4 rounded-[var(--radius-xl)] border border-primary/20 bg-gradient-to-r from-primary/10 via-surface-container to-accent/5 p-4 sm:p-5 hover:border-primary/40 transition-colors ${className}`}
        >
            <div className="w-11 h-11 rounded-full bg-primary/15 flex items-center justify-center shrink-0 group-hover:bg-primary/25 transition-colors">
                <Coffee className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="md3-title-small text-on-surface font-semibold">
                    ¿Te gusta FilmiFy? Apóyanos ☕
                </p>
                <p className="md3-body-small text-on-surface-variant">
                    Somos un proyecto gratuito. Tu aporte nos ayuda a mantener los servidores y seguir mejorando.
                </p>
            </div>
            <span className="hidden sm:inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-primary text-on-primary md3-label-large shrink-0 group-hover:shadow-[var(--shadow-1)] transition-shadow">
                <Heart className="w-4 h-4" /> Donar
            </span>
        </Link>
    );
}

// ── Variante 3: botón flotante (esquina, persistente) ────────────────────────
// Se oculta si el usuario lo cierra (recordado en localStorage por 7 días).
const DISMISS_KEY = 'donate_fab_dismissed_until';

export function DonateFloating() {
    const [hidden, setHidden] = useState(true);

    useEffect(() => {
        try {
            const until = Number(localStorage.getItem(DISMISS_KEY) || '0');
            setHidden(Date.now() < until);
        } catch {
            setHidden(false);
        }
    }, []);

    const dismiss = () => {
        try {
            localStorage.setItem(DISMISS_KEY, String(Date.now() + 7 * 24 * 60 * 60 * 1000));
        } catch { /* ignore */ }
        setHidden(true);
    };

    if (hidden) return null;

    return (
        <div className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-40">
            <div className="relative">
                <Link
                    {...donateLinkProps()}
                    aria-label="Apoya FilmiFy con una donación"
                    className="flex items-center gap-2 h-11 pl-4 pr-5 rounded-full bg-primary text-on-primary md3-label-large shadow-[var(--shadow-3)] hover:shadow-[var(--shadow-4)] hover:scale-105 transition-all"
                >
                    <Coffee className="w-4 h-4" />
                    Apóyanos
                </Link>
                <button
                    onClick={dismiss}
                    aria-label="Ocultar botón de donación"
                    className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-surface-container border border-outline-variant flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors shadow-sm"
                >
                    <X className="w-3 h-3" />
                </button>
            </div>
        </div>
    );
}
