'use client';

import { useState } from 'react';
import { Mail, Lock, Smartphone, AlertCircle, AlertTriangle, CheckCircle, Loader2, Shield, Eye, EyeOff } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Modal from '@/components/ui/Modal';

export function AccountSection({ user, onUpdate }: { user: any, onUpdate: () => Promise<void> }) {
    const supabase = createClient();
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Modal State
    const [modalType, setModalType] = useState<'email' | 'password' | 'delete' | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState('');

    const [passwordStep, setPasswordStep] = useState<'request' | 'verify' | 'update'>('request');
    const [otpToken, setOtpToken] = useState('');

    const [newEmail, setNewEmail] = useState('');
    const [passwords, setPasswords] = useState({
        new: '',
        confirm: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Constants
    const DAYS_30 = 30 * 24 * 60 * 60 * 1000;

    const checkEmailRestriction = () => {
        const lastChange = user?.user_metadata?.last_email_change;
        if (!lastChange) return true;

        const timeDiff = Date.now() - new Date(lastChange).getTime();
        if (timeDiff < DAYS_30) {
            const daysRemaining = Math.ceil((DAYS_30 - timeDiff) / (24 * 60 * 60 * 1000));
            setMessage({
                type: 'error',
                text: `Debes esperar ${daysRemaining} días para cambiar tu correo electrónico.`
            });
            return false;
        }
        return true;
    };

    const handleEmailClick = () => {
        setMessage(null);
        if (checkEmailRestriction()) {
            setNewEmail(user?.email || '');
            setModalType('email');
        }
    };

    const handleUpdateEmail = async () => {
        if (!newEmail || newEmail === user.email) return;

        setLoading(true);
        setMessage(null);

        try {
            const { error } = await supabase.auth.updateUser({
                email: newEmail,
                data: { last_email_change: new Date().toISOString() }
            });

            if (error) throw error;

            setMessage({ type: 'success', text: 'Se ha enviado un correo de confirmación a la nueva dirección.' });
            setModalType(null);
            await onUpdate();
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message });
        } finally {
            setLoading(false);
        }
    };

    // Password Flow Handlers
    const handleSendOtp = async () => {
        setLoading(true);
        setMessage(null);
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(user.email);
            if (error) throw error;
            setPasswordStep('verify');
            setMessage({ type: 'success', text: 'Código enviado a tu correo.' });
        } catch (error: any) {
            let errorMessage = error.message;
            if (errorMessage.includes('For security purposes, you can only request this after')) {
                const seconds = errorMessage.match(/\d+/)?.[0] || 'unos';
                errorMessage = `Por seguridad, espera ${seconds} segundos antes de solicitarlo nuevamente.`;
            }
            setMessage({ type: 'error', text: errorMessage });
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async () => {
        setLoading(true);
        setMessage(null);
        try {
            const { error } = await supabase.auth.verifyOtp({
                email: user.email,
                token: otpToken,
                type: 'recovery'
            });
            if (error) throw error;
            setPasswordStep('update');
            setMessage(null);
        } catch (error: any) {
            setMessage({ type: 'error', text: 'Código inválido o expirado.' });
        } finally {
            setLoading(false);
        }
    };

    const checkPasswordRequirements = (password: string) => {
        return {
            length: password.length >= 6,
            number: /\d/.test(password),
            special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
        };
    };

    const handleUpdatePassword = async () => {
        if (passwords.new !== passwords.confirm) {
            setMessage({ type: 'error', text: 'Las contraseñas nuevas no coinciden' });
            return;
        }

        const reqs = checkPasswordRequirements(passwords.new);
        if (!reqs.length || !reqs.number || !reqs.special) {
            setMessage({ type: 'error', text: 'La contraseña no cumple con los requisitos mínimos' });
            return;
        }

        setLoading(true);
        setMessage(null);

        try {
            const { error } = await supabase.auth.updateUser({
                password: passwords.new
            });

            if (error) throw error;

            setMessage({ type: 'success', text: 'Contraseña actualizada correctamente' });
            setTimeout(() => {
                setModalType(null);
                setPasswords({ new: '', confirm: '' });
                setPasswordStep('request');
                setOtpToken('');
                setMessage(null);
            }, 2000);
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message });
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (deleteConfirm !== user.email) return;

        setLoading(true);
        try {
            const res = await fetch('/api/account/delete', { method: 'DELETE' });
            if (!res.ok) {
                const body = await res.json();
                throw new Error(body.error || 'Error al eliminar la cuenta');
            }
            await supabase.auth.signOut();
            window.location.href = '/login?deleted=true';
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message });
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="pb-4 border-b border-surface-light/30">
                <h2 className="text-xl font-bold mb-1 bg-gradient-to-r from-white to-text-secondary bg-clip-text text-transparent">Configuración de Cuenta</h2>
                <p className="text-xs text-text-secondary">Seguridad y acceso</p>
            </div>

            {message && !modalType && (
                <div className={`p-3 rounded-xl flex items-center gap-3 backdrop-blur-sm border transition-all duration-300 animate-in slide-in-from-top ${message.type === 'success'
                    ? 'bg-green-500/10 text-green-400 border-green-500/20'
                    : 'bg-red-500/10 text-red-400 border-red-500/20'
                    }`}>
                    {message.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                    <span className="text-xs font-medium">{message.text}</span>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Email Card */}
                <div className="p-4 bg-gradient-to-br from-surface-light/30 to-surface-light/10 backdrop-blur-sm rounded-2xl border border-surface-light/30">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center">
                            <Mail className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-white">Correo Electrónico</h3>
                            <p className="text-[10px] text-text-secondary">Dirección asociada</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="flex-1 bg-surface-light/30 backdrop-blur-sm border border-surface-light/50 rounded-xl py-2 px-3 text-xs text-white flex justify-between items-center">
                            <span className="truncate mr-2">{user?.email}</span>
                            <span className="text-[10px] text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded font-medium whitespace-nowrap">✓ Verificado</span>
                        </div>
                    </div>
                    <div className="flex justify-between items-center">
                        <p className="text-[10px] text-text-secondary flex items-center gap-1">
                            <Lock className="w-3 h-3" />
                            Cambio cada 30 días
                        </p>
                        <button
                            onClick={handleEmailClick}
                            className="px-3 py-1.5 bg-surface-light/50 hover:bg-surface-hover/50 backdrop-blur-sm border border-surface-light/50 rounded-lg text-xs font-medium transition-all duration-300 hover:scale-105"
                        >
                            Editar
                        </button>
                    </div>
                </div>

                {/* Password Card */}
                <div className="p-4 bg-gradient-to-br from-surface-light/30 to-surface-light/10 backdrop-blur-sm rounded-2xl border border-surface-light/30">
                    <div className="flex items-center justify-between h-full">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center">
                                <Lock className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <p className="text-white text-sm font-semibold">Contraseña</p>
                                <p className="text-xs text-text-secondary mt-0.5">••••••••••</p>
                            </div>
                        </div>
                        <button
                            onClick={() => {
                                setMessage(null);
                                setPasswordStep('request');
                                setOtpToken('');
                                setModalType('password');
                            }}
                            className="px-4 py-2 bg-gradient-to-r from-primary to-primary-hover text-white rounded-xl text-xs font-medium hover:shadow-lg hover:shadow-primary/30 transition-all duration-300 hover:scale-105"
                        >
                            Cambiar
                        </button>
                    </div>
                </div>

                {/* Devices Section */}
                <div className="md:col-span-2 p-4 bg-gradient-to-br from-surface-light/30 to-surface-light/10 backdrop-blur-sm rounded-2xl border border-surface-light/30">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center">
                            <Smartphone className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-white">Dispositivos y Sesiones</h3>
                            <p className="text-[10px] text-text-secondary">Sesiones activas actualmente</p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-surface-light/20 rounded-xl border border-white/5">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-green-500/10 rounded-lg">
                                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-white">Este dispositivo (Sesión actual)</p>
                                    <p className="text-[10px] text-text-secondary">Activo ahora</p>
                                </div>
                            </div>
                            <span className="text-[10px] font-bold text-primary uppercase tracking-wider">En línea</span>
                        </div>

                        <p className="text-[10px] text-text-muted text-center italic py-1">
                            Para cerrar sesión en otros dispositivos, cambia tu contraseña.
                        </p>
                    </div>
                </div>

                {/* Danger Zone */}
                <div className="md:col-span-2 p-4 border border-red-500/20 bg-gradient-to-br from-red-500/5 to-red-500/10 backdrop-blur-sm rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                            <AlertCircle className="w-5 h-5 text-red-400" />
                        </div>
                        <div>
                            <h3 className="text-red-400 text-sm font-semibold">Zona de Peligro</h3>
                            <p className="text-[10px] text-text-secondary">Eliminar cuenta permanentemente</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setModalType('delete')}
                        className="px-4 py-2 bg-transparent border border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 rounded-xl text-xs font-medium transition-all duration-300 hover:scale-105"
                    >
                        Eliminar Cuenta
                    </button>
                </div>
            </div>

            {/* Email Modal */}
            <Modal
                isOpen={modalType === 'email'}
                onClose={() => setModalType(null)}
                title="Cambiar Correo Electrónico"
            >
                <div className="space-y-4">
                    {message && (
                        <div className={`p-3 rounded-lg flex items-center gap-2 ${message.type === 'success' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                            {message.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                            <span className="text-xs font-medium">{message.text}</span>
                        </div>
                    )}
                    <div>
                        <label className="text-sm font-medium text-text-secondary mb-1.5 block">
                            Nuevo Correo Electrónico
                        </label>
                        <input
                            type="email"
                            value={newEmail}
                            onChange={(e) => setNewEmail(e.target.value)}
                            className="w-full bg-surface-light border border-surface-light rounded-lg py-2.5 px-4 focus:outline-none focus:border-primary transition-colors text-sm text-white"
                            autoFocus
                        />
                        <p className="text-xs text-text-secondary mt-2">
                            Te enviaremos un enlace de confirmación a tu nueva dirección.
                        </p>
                    </div>

                    <div className="flex justify-end gap-3 mt-6">
                        <button
                            onClick={() => setModalType(null)}
                            className="px-4 py-2 bg-transparent hover:bg-surface-light rounded-lg text-sm font-medium transition-colors text-text-secondary hover:text-white"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleUpdateEmail}
                            disabled={loading || !newEmail || newEmail === user.email}
                            className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover transition-colors text-sm disabled:opacity-50 flex items-center gap-2"
                        >
                            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                            Actualizar Correo
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Delete Account Modal */}
            <Modal
                isOpen={modalType === 'delete'}
                onClose={() => setModalType(null)}
                title="¿Eliminar tu cuenta?"
            >
                <div className="space-y-4">
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
                        <p className="text-sm font-medium flex items-center gap-2 mb-2">
                            <AlertTriangle className="w-5 h-5" />
                            Esta acción es irreversible
                        </p>
                        <p className="text-xs">
                            Se eliminarán todos tus datos personales, historial de navegación, listas y valoraciones de forma permanente.
                        </p>
                    </div>

                    <div>
                        <p className="text-sm text-text-secondary mb-3">
                            Para confirmar, escribe tu correo electrónico: <span className="text-white font-semibold">{user?.email}</span>
                        </p>
                        <input
                            type="email"
                            value={deleteConfirm}
                            onChange={(e) => setDeleteConfirm(e.target.value)}
                            placeholder={user?.email}
                            className="w-full bg-surface-light border border-surface-light rounded-lg py-2.5 px-4 focus:outline-none focus:border-red-500 transition-colors text-sm text-white"
                            autoFocus
                        />
                    </div>

                    <div className="flex justify-end gap-3 mt-6">
                        <button
                            onClick={() => setModalType(null)}
                            className="px-4 py-2 bg-transparent hover:bg-surface-light rounded-lg text-sm font-medium transition-colors text-text-secondary hover:text-white"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleDeleteAccount}
                            disabled={loading || deleteConfirm !== user?.email}
                            className="px-4 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors text-sm disabled:opacity-50 flex items-center gap-2"
                        >
                            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                            Eliminar Permanentemente
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Password Modal */}
            <Modal
                isOpen={modalType === 'password'}
                onClose={() => setModalType(null)}
                title={
                    passwordStep === 'request' ? 'Verificación de Seguridad' :
                        passwordStep === 'verify' ? 'Ingresar Código' :
                            'Nueva Contraseña'
                }
            >
                <div className="space-y-4">
                    {message && (
                        <div className={`p-3 rounded-lg flex items-center gap-2 ${message.type === 'success' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                            {message.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                            <span className="text-xs font-medium">{message.text}</span>
                        </div>
                    )}

                    {passwordStep === 'request' && (
                        <div className="text-center py-4">
                            <Shield className="w-12 h-12 text-primary mx-auto mb-4" />
                            <p className="text-text-secondary mb-6">
                                Por seguridad, enviaremos un código de verificación a tu correo electrónico
                                <span className="text-white font-medium block mt-1">{user?.email}</span>
                            </p>

                            <button
                                onClick={handleSendOtp}
                                disabled={loading}
                                className="w-full px-4 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover transition-colors text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                                Enviar Código
                            </button>
                        </div>
                    )}

                    {passwordStep === 'verify' && (
                        <div>
                            <label className="text-sm font-medium text-text-secondary mb-1.5 block">
                                Código de 8 dígitos
                            </label>
                            <input
                                type="text"
                                value={otpToken}
                                onChange={(e) => setOtpToken(e.target.value.replace(/\D/g, '').slice(0, 8))}
                                placeholder="00000000"
                                className="w-full bg-surface-light border border-surface-light rounded-lg py-2.5 px-4 focus:outline-none focus:border-primary transition-colors text-sm text-white text-center tracking-widest text-xl"
                                autoFocus
                            />
                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    onClick={() => setPasswordStep('request')}
                                    className="px-4 py-2 bg-transparent hover:bg-surface-light rounded-lg text-sm font-medium transition-colors text-text-secondary hover:text-white"
                                >
                                    Atrás
                                </button>
                                <button
                                    onClick={handleVerifyOtp}
                                    disabled={loading || otpToken.length !== 8}
                                    className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover transition-colors text-sm disabled:opacity-50 flex items-center gap-2"
                                >
                                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                                    Verificar
                                </button>
                            </div>
                        </div>
                    )}

                    {passwordStep === 'update' && (
                        <>
                            <div>
                                <label className="text-sm font-medium text-text-secondary mb-1.5 block">
                                    Nueva Contraseña
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={passwords.new}
                                        onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                                        className="w-full bg-surface-light border border-surface-light rounded-lg py-2.5 px-4 pr-10 focus:outline-none focus:border-primary transition-colors text-sm text-white"
                                        autoFocus
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-white transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                                {/* Password Requirements Checklist */}
                                <div className="mt-3 space-y-2">
                                    <p className="text-xs text-text-secondary mb-2">La contraseña debe contener:</p>
                                    <div className="grid grid-cols-1 gap-1">
                                        {[
                                            { key: 'length', label: 'Mínimo 6 caracteres' },
                                            { key: 'number', label: 'Al menos un número' },
                                            { key: 'special', label: 'Al menos un carácter especial' }
                                        ].map(req => {
                                            const isMet = checkPasswordRequirements(passwords.new)[req.key as keyof ReturnType<typeof checkPasswordRequirements>];
                                            return (
                                                <div key={req.key} className={`flex items-center gap-2 text-xs ${isMet ? 'text-green-500' : 'text-text-secondary'}`}>
                                                    {isMet ? <CheckCircle className="w-3 h-3" /> : <div className="w-3 h-3 rounded-full border border-text-secondary/50" />}
                                                    <span>{req.label}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-text-secondary mb-1.5 block">
                                    Confirmar Contraseña
                                </label>
                                <div className="relative">
                                    <input
                                        type={showConfirmPassword ? "text" : "password"}
                                        value={passwords.confirm}
                                        onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                                        className="w-full bg-surface-light border border-surface-light rounded-lg py-2.5 px-4 pr-10 focus:outline-none focus:border-primary transition-colors text-sm text-white"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-white transition-colors"
                                    >
                                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    onClick={() => setModalType(null)}
                                    className="px-4 py-2 bg-transparent hover:bg-surface-light rounded-lg text-sm font-medium transition-colors text-text-secondary hover:text-white"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleUpdatePassword}
                                    disabled={loading || !passwords.new || !passwords.confirm}
                                    className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover transition-colors text-sm disabled:opacity-50 flex items-center gap-2"
                                >
                                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                                    Actualizar Contraseña
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </Modal>
        </div>
    );
}
