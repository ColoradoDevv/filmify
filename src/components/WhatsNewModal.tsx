'use client';

import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { hasDecided, CONSENT_EVENT } from '@/lib/cookie-consent';
import { registerVisit } from '@/lib/visit-tracking';
import { RELEASE_NOTES, RELEASE_VERSION } from '@/lib/release-notes';

/** Última versión cuyas notas cerró esta persona. */
const SEEN_KEY = 'filmify_release_notes_seen';

/** Visitas necesarias para considerar a alguien recurrente. */
const MIN_VISITS = 2;

/**
 * Modal de «qué hay de nuevo».
 *
 * Se muestra UNA sola vez por persona y por versión, y solo a quien ya había
 * entrado antes: a quien llega por primera vez no se le cuenta lo que ha
 * cambiado, porque no conoció lo anterior. Cerrarlo guarda la versión; el modal
 * no vuelve hasta que `RELEASE_VERSION` cambie.
 *
 * No sustituye a `AnnouncementBanner`, que sigue igual para los avisos
 * operativos del panel de administración. Este componente solo añade el modal.
 *
 * Espera a que se haya respondido al banner de cookies: apilar dos capas
 * modales sobre alguien que acaba de entrar es la forma más rápida de que
 * despache las dos sin leer ninguna.
 */
export default function WhatsNewModal() {
    const [open, setOpen] = useState(false);

    useEffect(() => {
        const visits = registerVisit();
        if (visits < MIN_VISITS) return;

        let seen: string | null = null;
        try {
            seen = localStorage.getItem(SEEN_KEY);
        } catch {
            // Sin almacenamiento no se puede recordar que ya se cerró, así que
            // no se enseña: mejor callar que repetirse en cada carga.
            return;
        }
        if (seen === RELEASE_VERSION) return;

        // Si el banner de cookies sigue pendiente, se espera a que decida.
        if (!hasDecided()) {
            const onDecision = () => setOpen(true);
            window.addEventListener(CONSENT_EVENT, onDecision, { once: true });
            return () => window.removeEventListener(CONSENT_EVENT, onDecision);
        }

        setOpen(true);
    }, []);

    const close = () => {
        setOpen(false);
        try {
            localStorage.setItem(SEEN_KEY, RELEASE_VERSION);
        } catch {
            /* Si no se puede guardar, volverá a salir. No es grave. */
        }
    };

    if (!open) return null;

    return (
        <Modal
            isOpen={open}
            onClose={close}
            title={RELEASE_NOTES.title}
            icon={
                <img
                    src="/logo-icon.svg"
                    alt=""
                    className="h-9 w-9 shrink-0"
                    aria-hidden
                />
            }
        >
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary">
                        <Sparkles className="h-3 w-3" aria-hidden />
                        {RELEASE_NOTES.version}
                    </span>
                    <span className="text-[11px] text-on-surface-variant">{RELEASE_NOTES.date}</span>
                </div>

                <ol className="divide-y divide-surface-light">
                    {RELEASE_NOTES.highlights.map(({ text }, index) => (
                        <li key={text} className="flex items-center gap-3 py-2.5 text-sm text-on-surface">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                                {index + 1}
                            </span>
                            <span className="min-w-0">{text}</span>
                        </li>
                    ))}
                </ol>

                <div className="flex justify-end">
                    <button
                        type="button"
                        onClick={close}
                        className="inline-flex h-8 items-center rounded-full bg-primary px-4 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    >
                        Entendido
                    </button>
                </div>
            </div>
        </Modal>
    );
}
