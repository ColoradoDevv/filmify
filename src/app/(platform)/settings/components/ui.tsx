'use client';

import { AlertCircle, CheckCircle2, Loader2, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Piezas de la pantalla de ajustes.
 *
 * La versión anterior repetía en cada sección tarjetas con degradado, iconos en
 * cajas de 40px y botones de 48px de alto: mucha superficie para poca
 * información, y cada sección con medidas ligeramente distintas. Aquí los
 * ajustes son filas de una lista separadas por hairlines —etiqueta y
 * explicación a la izquierda, control a la derecha—, que es como se leen los
 * ajustes de verdad: de un vistazo y en vertical.
 *
 * Todo sale de los tokens del sitio; lo que cambia es la densidad.
 */

// ── Contenedores ─────────────────────────────────────────────────────────────

export function SettingsPanel({
    title, description, children, footer,
}: {
    title: string;
    description?: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
}) {
    return (
        <section className="rounded-xl border border-outline-variant bg-surface-container-low">
            <header className="border-b border-outline-variant px-4 py-3 sm:px-5">
                <h2 className="text-sm font-semibold text-on-surface">{title}</h2>
                {description && (
                    <p className="mt-0.5 text-xs text-on-surface-variant">{description}</p>
                )}
            </header>
            <div className="divide-y divide-outline-variant">{children}</div>
            {footer && (
                <div className="border-t border-outline-variant px-4 py-3 sm:px-5">{footer}</div>
            )}
        </section>
    );
}

/**
 * Una fila de ajuste. `control` va a la derecha y no se encoge; la explicación
 * envuelve. En móvil la fila se apila para que el control no estrangule al
 * texto.
 */
export function SettingRow({
    label, description, control, icon: Icon, htmlFor, danger = false,
}: {
    label: string;
    description?: string;
    control?: React.ReactNode;
    icon?: LucideIcon;
    htmlFor?: string;
    danger?: boolean;
}) {
    const Label = htmlFor ? 'label' : 'div';
    return (
        <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-5">
            <Label
                {...(htmlFor ? { htmlFor } : {})}
                className={cn('flex min-w-0 items-start gap-2.5', htmlFor && 'cursor-pointer')}
            >
                {Icon && (
                    <Icon
                        className={cn('mt-0.5 h-4 w-4 shrink-0', danger ? 'text-red-400' : 'text-on-surface-variant')}
                        aria-hidden
                    />
                )}
                <span className="min-w-0">
                    <span className={cn('block text-sm font-medium', danger ? 'text-red-300' : 'text-on-surface')}>
                        {label}
                    </span>
                    {description && (
                        <span className="mt-0.5 block text-xs leading-relaxed text-on-surface-variant">
                            {description}
                        </span>
                    )}
                </span>
            </Label>
            {control && <div className="shrink-0 sm:pl-2">{control}</div>}
        </div>
    );
}

/** Valor de solo lectura alineado a la derecha (correo, fechas, estados). */
export function ReadonlyValue({ children }: { children: React.ReactNode }) {
    return <span className="block text-sm text-on-surface-variant sm:text-right">{children}</span>;
}

// ── Controles ────────────────────────────────────────────────────────────────

export function Toggle({
    id, checked, onChange, disabled = false, label,
}: {
    id: string;
    checked: boolean;
    onChange: (next: boolean) => void;
    disabled?: boolean;
    label: string;
}) {
    return (
        <button
            id={id}
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={label}
            disabled={disabled}
            onClick={() => onChange(!checked)}
            className={cn(
                'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                checked ? 'bg-primary' : 'bg-surface-container-high border border-outline-variant',
                disabled && 'cursor-not-allowed opacity-50',
            )}
        >
            <span
                className={cn(
                    'inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform',
                    checked ? 'translate-x-[18px]' : 'translate-x-[3px]',
                )}
            />
        </button>
    );
}

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
    primary: 'bg-primary text-on-primary hover:bg-primary-hover',
    secondary: 'border border-outline-variant bg-surface-container text-on-surface hover:border-primary/40',
    danger: 'border border-red-500/40 text-red-300 hover:bg-red-500/10',
    ghost: 'text-on-surface-variant hover:text-on-surface hover:bg-on-surface/8',
};

export function Button({
    variant = 'secondary', loading = false, className, children, ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; loading?: boolean }) {
    return (
        <button
            {...props}
            disabled={props.disabled || loading}
            className={cn(
                'inline-flex h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 text-xs font-medium transition-colors',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                'disabled:cursor-not-allowed disabled:opacity-50',
                BUTTON_VARIANTS[variant],
                className,
            )}
        >
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
            {children}
        </button>
    );
}

export function TextField({
    label, hint, error, className, id, ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label?: string; hint?: string; error?: string }) {
    return (
        <div className="space-y-1.5">
            {label && (
                <label htmlFor={id} className="block text-xs font-medium text-on-surface-variant">
                    {label}
                </label>
            )}
            <input
                {...props}
                id={id}
                aria-invalid={!!error}
                className={cn(
                    'h-9 w-full rounded-lg border bg-surface-container px-3 text-sm text-on-surface',
                    'placeholder:text-on-surface-variant/50',
                    'focus:outline-none focus:ring-1',
                    error
                        ? 'border-red-500/60 focus:border-red-500 focus:ring-red-500/40'
                        : 'border-outline-variant focus:border-primary focus:ring-primary/40',
                    'disabled:cursor-not-allowed disabled:opacity-50',
                    className,
                )}
            />
            {error ? (
                <p className="text-xs text-red-400">{error}</p>
            ) : hint ? (
                <p className="text-xs text-on-surface-variant">{hint}</p>
            ) : null}
        </div>
    );
}

// ── Estado ───────────────────────────────────────────────────────────────────

export type StatusKind = 'success' | 'error';
export interface StatusMessage { type: StatusKind; text: string }

export function StatusBanner({ message }: { message: StatusMessage | null }) {
    if (!message) return null;
    const ok = message.type === 'success';
    const Icon = ok ? CheckCircle2 : AlertCircle;
    return (
        <div
            role="status"
            aria-live="polite"
            className={cn(
                'flex items-start gap-2 rounded-lg border px-3 py-2 text-xs',
                ok
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                    : 'border-red-500/30 bg-red-500/10 text-red-300',
            )}
        >
            <Icon className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="min-w-0">{message.text}</span>
        </div>
    );
}
