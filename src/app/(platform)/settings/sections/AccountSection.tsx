'use client';

import { useCallback, useMemo, useState } from 'react';
import { AtSign, Check, Eye, EyeOff, KeyRound, Trash2, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Modal from '@/components/ui/Modal';
import {
    SettingsPanel, SettingRow, ReadonlyValue, Button, TextField, StatusBanner, type StatusMessage,
} from '../components/ui';
import ConfirmDialog from '../components/ConfirmDialog';

const DAY_MS = 24 * 60 * 60 * 1000;
const EMAIL_COOLDOWN_MS = 30 * DAY_MS;

/** Misma política que register/actions.ts y reset-password/actions.ts. */
const PASSWORD_RULES: { id: string; label: string; test: (v: string) => boolean }[] = [
    { id: 'length', label: 'Al menos 8 caracteres', test: (v) => v.length >= 8 },
    { id: 'uppercase', label: 'Una mayúscula', test: (v) => /[A-Z]/.test(v) },
    { id: 'lowercase', label: 'Una minúscula', test: (v) => /[a-z]/.test(v) },
    { id: 'number', label: 'Un número', test: (v) => /[0-9]/.test(v) },
    { id: 'special', label: 'Un símbolo', test: (v) => /[!@#$%^&*(),.?":{}|<>]/.test(v) },
];

type PasswordStep = 'request' | 'verify' | 'update';

/**
 * Cuenta y seguridad: correo, contraseña y baja.
 *
 * La lógica es la que ya había —Supabase Auth para correo y contraseña, y
 * /api/account/delete para la baja—; lo que cambia es la presentación y que los
 * diálogos ya no usan `alert()`/`confirm()` del navegador.
 *
 * El cambio de contraseña es en tres pasos a propósito: pedimos un código al
 * correo y lo verificamos antes de dejar escribir la nueva, para que quien
 * encuentre una sesión abierta no pueda quedarse con la cuenta.
 */
export function AccountSection({ user, onUpdate }: { user: any; onUpdate: () => Promise<void> }) {
    const supabase = createClient();
    const [message, setMessage] = useState<StatusMessage | null>(null);
    const [loading, setLoading] = useState(false);

    const [emailOpen, setEmailOpen] = useState(false);
    const [newEmail, setNewEmail] = useState('');

    const [passwordOpen, setPasswordOpen] = useState(false);
    const [step, setStep] = useState<PasswordStep>('request');
    const [otp, setOtp] = useState('');
    const [passwords, setPasswords] = useState({ next: '', confirm: '' });
    const [showPassword, setShowPassword] = useState(false);

    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState('');

    const emailVerified = !!user?.email_confirmed_at;

    /** Días que faltan para poder volver a cambiar el correo, o 0. */
    const emailCooldownDays = useMemo(() => {
        const last = user?.user_metadata?.last_email_change;
        if (!last) return 0;
        const elapsed = Date.now() - new Date(last).getTime();
        if (elapsed >= EMAIL_COOLDOWN_MS) return 0;
        return Math.ceil((EMAIL_COOLDOWN_MS - elapsed) / DAY_MS);
    }, [user?.user_metadata?.last_email_change]);

    const ruleState = useMemo(
        () => PASSWORD_RULES.map((r) => ({ ...r, ok: r.test(passwords.next) })),
        [passwords.next],
    );
    const passwordValid = ruleState.every((r) => r.ok) && passwords.next === passwords.confirm;

    const openEmail = () => {
        setMessage(null);
        setNewEmail(user?.email ?? '');
        setEmailOpen(true);
    };

    const submitEmail = useCallback(async () => {
        if (!newEmail || newEmail === user?.email) return;
        setLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({
                email: newEmail,
                data: { last_email_change: new Date().toISOString() },
            });
            if (error) throw error;
            setEmailOpen(false);
            setMessage({ type: 'success', text: 'Te enviamos un correo de confirmación a la dirección nueva. El cambio se aplica al abrirlo.' });
            await onUpdate();
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message ?? 'No se pudo cambiar el correo' });
        } finally {
            setLoading(false);
        }
    }, [newEmail, onUpdate, supabase, user?.email]);

    const sendOtp = useCallback(async () => {
        setLoading(true);
        setMessage(null);
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(user.email);
            if (error) throw error;
            setStep('verify');
        } catch (error: any) {
            const raw = String(error.message ?? '');
            const wait = raw.match(/after (\d+) seconds/)?.[1];
            setMessage({
                type: 'error',
                text: wait
                    ? `Por seguridad, espera ${wait} segundos antes de pedir otro código.`
                    : raw || 'No se pudo enviar el código',
            });
        } finally {
            setLoading(false);
        }
    }, [supabase, user?.email]);

    const verifyOtp = useCallback(async () => {
        setLoading(true);
        setMessage(null);
        try {
            const { error } = await supabase.auth.verifyOtp({ email: user.email, token: otp, type: 'recovery' });
            if (error) throw error;
            setStep('update');
        } catch {
            setMessage({ type: 'error', text: 'El código no es válido o ha caducado.' });
        } finally {
            setLoading(false);
        }
    }, [otp, supabase, user?.email]);

    const submitPassword = useCallback(async () => {
        if (!passwordValid) return;
        setLoading(true);
        setMessage(null);
        try {
            const { error } = await supabase.auth.updateUser({ password: passwords.next });
            if (error) throw error;
            setPasswordOpen(false);
            setStep('request');
            setOtp('');
            setPasswords({ next: '', confirm: '' });
            setMessage({ type: 'success', text: 'Contraseña actualizada.' });
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message ?? 'No se pudo actualizar la contraseña' });
        } finally {
            setLoading(false);
        }
    }, [passwordValid, passwords.next, supabase]);

    const deleteAccount = useCallback(async () => {
        setLoading(true);
        setMessage(null);
        try {
            const res = await fetch('/api/account/delete', { method: 'DELETE' });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.error || 'No se pudo eliminar la cuenta');
            }
            await supabase.auth.signOut();
            window.location.href = '/login?deleted=true';
        } catch (error: any) {
            setDeleteOpen(false);
            setMessage({ type: 'error', text: error.message });
            setLoading(false);
        }
    }, [supabase]);

    return (
        <div className="space-y-4">
            <StatusBanner message={message} />

            <SettingsPanel title="Acceso" description="Cómo entras en tu cuenta.">
                <SettingRow
                    icon={AtSign}
                    label="Correo electrónico"
                    description={
                        emailVerified
                            ? 'Verificado. Solo se puede cambiar una vez cada 30 días.'
                            : 'Sin verificar. Revisa tu bandeja de entrada.'
                    }
                    control={
                        <div className="flex items-center gap-3">
                            <ReadonlyValue>{user?.email ?? '—'}</ReadonlyValue>
                            <Button onClick={openEmail} disabled={emailCooldownDays > 0}>
                                {emailCooldownDays > 0 ? `${emailCooldownDays} d` : 'Cambiar'}
                            </Button>
                        </div>
                    }
                />

                <SettingRow
                    icon={KeyRound}
                    label="Contraseña"
                    description="Te enviaremos un código al correo para confirmar que eres tú antes de cambiarla."
                    control={
                        <Button onClick={() => { setMessage(null); setPasswordOpen(true); }}>
                            Cambiar
                        </Button>
                    }
                />
            </SettingsPanel>

            <SettingsPanel title="Zona de riesgo" description="Acciones que no se pueden deshacer.">
                <SettingRow
                    icon={Trash2}
                    danger
                    label="Eliminar mi cuenta"
                    description="Borra tu perfil, tus reseñas, tus listas y tu historial de forma permanente."
                    control={
                        <Button variant="danger" onClick={() => { setDeleteConfirm(''); setDeleteOpen(true); }}>
                            Eliminar cuenta
                        </Button>
                    }
                />
            </SettingsPanel>

            {/* ── Cambio de correo ─────────────────────────────────────────── */}
            <Modal isOpen={emailOpen} onClose={() => setEmailOpen(false)} title="Cambiar correo electrónico">
                <div className="space-y-4">
                    <p className="text-sm text-on-surface-variant">
                        Enviaremos un enlace de confirmación a la dirección nueva. Hasta que lo abras, seguirás
                        entrando con la actual.
                    </p>
                    <TextField
                        id="account-new-email"
                        type="email"
                        label="Nueva dirección"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder="tu@correo.com"
                    />
                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => setEmailOpen(false)}>Cancelar</Button>
                        <Button
                            variant="primary"
                            loading={loading}
                            disabled={!newEmail || newEmail === user?.email}
                            onClick={() => void submitEmail()}
                        >
                            Enviar confirmación
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* ── Cambio de contraseña, en tres pasos ──────────────────────── */}
            <Modal
                isOpen={passwordOpen}
                onClose={() => { setPasswordOpen(false); setStep('request'); setOtp(''); }}
                title="Cambiar contraseña"
            >
                <div className="space-y-4">
                    <StatusBanner message={message} />

                    {step === 'request' && (
                        <>
                            <p className="text-sm text-on-surface-variant">
                                Enviaremos un código de verificación a <strong className="text-on-surface">{user?.email}</strong>.
                            </p>
                            <div className="flex justify-end">
                                <Button variant="primary" loading={loading} onClick={() => void sendOtp()}>
                                    Enviar código
                                </Button>
                            </div>
                        </>
                    )}

                    {step === 'verify' && (
                        <>
                            <TextField
                                id="account-otp"
                                label="Código recibido"
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value.trim())}
                                placeholder="12345678"
                                hint="Revisa también la carpeta de spam."
                            />
                            <div className="flex justify-end gap-2">
                                <Button variant="ghost" onClick={() => void sendOtp()} disabled={loading}>
                                    Reenviar
                                </Button>
                                <Button
                                    variant="primary"
                                    loading={loading}
                                    disabled={otp.length < 6}
                                    onClick={() => void verifyOtp()}
                                >
                                    Verificar
                                </Button>
                            </div>
                        </>
                    )}

                    {step === 'update' && (
                        <>
                            <div className="relative">
                                <TextField
                                    id="account-new-password"
                                    label="Nueva contraseña"
                                    type={showPassword ? 'text' : 'password'}
                                    autoComplete="new-password"
                                    value={passwords.next}
                                    onChange={(e) => setPasswords((p) => ({ ...p, next: e.target.value }))}
                                    className="pr-9"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((v) => !v)}
                                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                                    className="absolute right-2 top-[26px] rounded p-1 text-on-surface-variant hover:text-on-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>

                            <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                                {ruleState.map((r) => (
                                    <li key={r.id} className="flex items-center gap-1.5 text-xs">
                                        {r.ok
                                            ? <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" aria-hidden />
                                            : <X className="h-3.5 w-3.5 shrink-0 text-on-surface-variant/60" aria-hidden />}
                                        <span className={r.ok ? 'text-emerald-300' : 'text-on-surface-variant'}>{r.label}</span>
                                    </li>
                                ))}
                            </ul>

                            <TextField
                                id="account-confirm-password"
                                label="Repite la contraseña"
                                type={showPassword ? 'text' : 'password'}
                                autoComplete="new-password"
                                value={passwords.confirm}
                                onChange={(e) => setPasswords((p) => ({ ...p, confirm: e.target.value }))}
                                error={
                                    passwords.confirm && passwords.confirm !== passwords.next
                                        ? 'No coincide con la anterior'
                                        : undefined
                                }
                            />

                            <div className="flex justify-end">
                                <Button
                                    variant="primary"
                                    loading={loading}
                                    disabled={!passwordValid}
                                    onClick={() => void submitPassword()}
                                >
                                    Guardar contraseña
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            </Modal>

            {/* ── Baja ─────────────────────────────────────────────────────── */}
            <ConfirmDialog
                open={deleteOpen}
                title="Eliminar cuenta"
                description="Se borrarán tu perfil, tus reseñas, tus listas y tu historial. No hay forma de recuperarlos."
                confirmLabel="Eliminar definitivamente"
                loading={loading}
                confirmDisabled={deleteConfirm !== user?.email}
                onCancel={() => setDeleteOpen(false)}
                onConfirm={() => void deleteAccount()}
            >
                <TextField
                    id="account-delete-confirm"
                    label={`Escribe ${user?.email} para confirmar`}
                    value={deleteConfirm}
                    onChange={(e) => setDeleteConfirm(e.target.value)}
                    autoComplete="off"
                />
            </ConfirmDialog>
        </div>
    );
}
