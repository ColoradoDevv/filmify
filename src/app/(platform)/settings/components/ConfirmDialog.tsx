'use client';

import Modal from '@/components/ui/Modal';
import { Button } from './ui';

/**
 * Confirmación de una acción destructiva.
 *
 * Sustituye a los `confirm()` y `alert()` nativos que usaban los ajustes: se
 * ven como el navegador, no como el sitio, y en algunos navegadores móviles el
 * usuario puede silenciarlos, dejando la acción sin confirmar.
 *
 * `requireText` es para lo irreversible de verdad (borrar la cuenta): obliga a
 * teclear un valor exacto antes de habilitar el botón.
 */
export default function ConfirmDialog({
    open, title, description, confirmLabel, onConfirm, onCancel, loading = false, children, confirmDisabled = false,
}: {
    open: boolean;
    title: string;
    description: string;
    confirmLabel: string;
    onConfirm: () => void;
    onCancel: () => void;
    loading?: boolean;
    confirmDisabled?: boolean;
    children?: React.ReactNode;
}) {
    return (
        <Modal isOpen={open} onClose={onCancel} title={title}>
            <div className="space-y-4">
                <p className="text-sm leading-relaxed text-on-surface-variant">{description}</p>

                {children}

                <div className="flex justify-end gap-2 pt-1">
                    <Button variant="ghost" onClick={onCancel} disabled={loading}>
                        Cancelar
                    </Button>
                    <Button
                        variant="danger"
                        onClick={onConfirm}
                        loading={loading}
                        disabled={confirmDisabled}
                    >
                        {confirmLabel}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
