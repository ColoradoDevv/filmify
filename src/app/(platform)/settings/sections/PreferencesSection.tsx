'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, AlertCircle, Play, ShieldAlert, Zap, Globe, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Modal from '@/components/ui/Modal';

export function PreferencesSection({ user }: { user: any }) {
    const supabase = createClient();
    const [settings, setSettings] = useState({
        autoplay: true,
        adultContent: false,
        reducedMotion: false,
        language: 'es'
    });
    const [showAgeVerification, setShowAgeVerification] = useState(false);
    const [birthdate, setBirthdate] = useState('');
    const [verificationError, setVerificationError] = useState<string | null>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!user?.id) return;

        supabase
            .from('profiles')
            .select('preferences')
            .eq('id', user.id)
            .single()
            .then(({ data }: { data: { preferences?: Record<string, any> } | null }) => {
                const prefs = data?.preferences;
                if (!prefs) return;

                // Merge DB prefs over defaults, then validate adult content
                const merged = { ...settings, ...prefs };
                if (merged.adultContent) {
                    const birthDate = user?.user_metadata?.birthdate ? new Date(user.user_metadata.birthdate) : null;
                    const isEmailConfirmed = !!user?.email_confirmed_at;
                    let isAgeVerified = false;
                    if (birthDate) {
                        const today = new Date();
                        let age = today.getFullYear() - birthDate.getFullYear();
                        const m = today.getMonth() - birthDate.getMonth();
                        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
                        isAgeVerified = age >= 18;
                    }
                    if (!isEmailConfirmed || !isAgeVerified) merged.adultContent = false;
                }

                setSettings(merged);
                if (typeof window !== 'undefined') {
                    localStorage.setItem('filmify_preferences', JSON.stringify(merged));
                }
                if (merged.reducedMotion && typeof document !== 'undefined') {
                    document.documentElement.style.scrollBehavior = 'auto';
                }
            });
    }, [user?.id]);

    const updateSetting = async (key: keyof typeof settings, value: any) => {
        if (key === 'adultContent' && value === true) {
            // Check email confirmation
            if (!user?.email_confirmed_at) {
                alert('Debes confirmar tu correo electrónico para activar esta opción.');
                return;
            }

            // Check age verification
            if (!user?.user_metadata?.birthdate) {
                setShowAgeVerification(true);
                return;
            }

            // Check if user is 18+
            const birthDate = new Date(user.user_metadata.birthdate);
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }

            if (age < 18) {
                alert('Debes ser mayor de 18 años para activar esta opción.');
                return;
            }
        }

        const newSettings = { ...settings, [key]: value };
        setSettings(newSettings);
        if (typeof window !== 'undefined') {
            localStorage.setItem('filmify_preferences', JSON.stringify(newSettings));
        }

        // Apply immediate effects where possible
        if (key === 'reducedMotion' && typeof document !== 'undefined') {
            document.documentElement.style.scrollBehavior = value ? 'auto' : 'smooth';
        }

        // Save to Supabase
        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    preferences: newSettings,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', user.id);

            if (error) {
                console.error('Error saving preferences:', error);
                setMessage({ type: 'error', text: 'Error al guardar preferencias en la nube' });
            } else {
                // Optional: Show success message briefly or just keep it silent
                // setMessage({ type: 'success', text: 'Preferencias guardadas' });
            }
        } catch (err) {
            console.error('Error saving preferences:', err);
        }
    };

    const handleAgeVerification = async () => {
        if (!birthdate) return;

        const birthDateObj = new Date(birthdate);
        const today = new Date();
        let age = today.getFullYear() - birthDateObj.getFullYear();
        const m = today.getMonth() - birthDateObj.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDateObj.getDate())) {
            age--;
        }

        if (age < 18) {
            setVerificationError('Debes ser mayor de 18 años para acceder a contenido para adultos.');
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({
                data: { birthdate: birthdate }
            });

            if (error) throw error;

            setShowAgeVerification(false);
            updateSetting('adultContent', true);
            setMessage({ type: 'success', text: 'Edad verificada correctamente. Contenido para adultos activado.' });
        } catch (error: any) {
            setVerificationError(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="pb-4 border-b border-surface-light/30">
                <h2 className="text-xl font-bold mb-1 bg-gradient-to-r from-white to-text-secondary bg-clip-text text-transparent">Preferencias</h2>
                <p className="text-xs text-text-secondary">Personaliza tu experiencia</p>
            </div>

            {message && (
                <div className={`p-3 rounded-xl flex items-center gap-3 backdrop-blur-sm border transition-all duration-300 animate-in slide-in-from-top ${message.type === 'success'
                    ? 'bg-green-500/10 text-green-400 border-green-500/20'
                    : 'bg-red-500/10 text-red-400 border-red-500/20'
                    }`}>
                    {message.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                    <span className="text-xs font-medium">{message.text}</span>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Autoplay */}
                <div className="p-4 bg-gradient-to-br from-surface-light/30 to-surface-light/10 backdrop-blur-sm rounded-2xl border border-surface-light/30 hover:border-surface-light/50 transition-all duration-300">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1 pr-4">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center shrink-0">
                                <Play className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-white">Reproducción Automática</h3>
                                <p className="text-[10px] text-text-secondary">Trailers al navegar</p>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={settings.autoplay}
                                onChange={(e) => updateSetting('autoplay', e.target.checked)}
                            />
                            <div className="w-9 h-5 bg-surface-light/50 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-primary peer-checked:to-primary-hover"></div>
                        </label>
                    </div>
                </div>

                {/* Adult Content */}
                <div className="p-4 bg-gradient-to-br from-surface-light/30 to-surface-light/10 backdrop-blur-sm rounded-2xl border border-surface-light/30 hover:border-surface-light/50 transition-all duration-300">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1 pr-4">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500/20 to-orange-500/20 flex items-center justify-center shrink-0">
                                <ShieldAlert className="w-5 h-5 text-red-400" />
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-white">Contenido para Adultos</h3>
                                <p className="text-[10px] text-text-secondary">Mostrar contenido +18</p>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={settings.adultContent}
                                onChange={(e) => updateSetting('adultContent', e.target.checked)}
                            />
                            <div className="w-9 h-5 bg-surface-light/50 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-primary peer-checked:to-primary-hover"></div>
                        </label>
                    </div>
                </div>

                {/* Reduced Motion */}
                <div className="p-4 bg-gradient-to-br from-surface-light/30 to-surface-light/10 backdrop-blur-sm rounded-2xl border border-surface-light/30 hover:border-surface-light/50 transition-all duration-300">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1 pr-4">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center shrink-0">
                                <Zap className="w-5 h-5 text-blue-400" />
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-white">Reducción de Movimiento</h3>
                                <p className="text-[10px] text-text-secondary">Minimizar animaciones</p>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={settings.reducedMotion}
                                onChange={(e) => updateSetting('reducedMotion', e.target.checked)}
                            />
                            <div className="w-9 h-5 bg-surface-light/50 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-primary peer-checked:to-primary-hover"></div>
                        </label>
                    </div>
                </div>

                {/* Language */}
                <div className="p-4 bg-gradient-to-br from-surface-light/30 to-surface-light/10 backdrop-blur-sm rounded-2xl border border-surface-light/30 hover:border-surface-light/50 transition-all duration-300">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1 pr-4">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center shrink-0">
                                <Globe className="w-5 h-5 text-green-400" />
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-white">Idioma</h3>
                                <p className="text-[10px] text-text-secondary">Idioma de la interfaz</p>
                            </div>
                        </div>
                        <select
                            value={settings.language}
                            onChange={(e) => updateSetting('language', e.target.value)}
                            className="bg-surface-light/50 backdrop-blur-sm border border-surface-light/50 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 text-white transition-all cursor-pointer hover:bg-surface-hover/50"
                        >
                            <option value="es" className="bg-surface">Español</option>
                            <option value="en" className="bg-surface">English</option>
                            <option value="pt" className="bg-surface">Português</option>
                        </select>
                    </div>
                </div>
            </div>

            <Modal
                isOpen={showAgeVerification}
                onClose={() => setShowAgeVerification(false)}
                title="Verificación de Edad"
            >
                <div className="space-y-4">
                    <p className="text-sm text-text-secondary">
                        Para acceder a contenido clasificado para adultos, necesitamos verificar que eres mayor de 18 años.
                        Esta información se guardará en tu perfil.
                    </p>

                    {verificationError && (
                        <div className="p-3 bg-red-500/10 text-red-500 rounded-lg flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" />
                            <span className="text-xs font-medium">{verificationError}</span>
                        </div>
                    )}

                    <div>
                        <label className="text-sm font-medium text-text-secondary mb-1.5 block">
                            Fecha de Nacimiento
                        </label>
                        <input
                            type="date"
                            value={birthdate}
                            onChange={(e) => setBirthdate(e.target.value)}
                            className="w-full bg-surface-light border border-surface-light rounded-lg py-2.5 px-4 focus:outline-none focus:border-primary transition-colors text-sm text-white"
                        />
                    </div>

                    <div className="flex justify-end gap-3 mt-6">
                        <button
                            onClick={() => setShowAgeVerification(false)}
                            className="px-4 py-2 bg-transparent hover:bg-surface-light rounded-lg text-sm font-medium transition-colors text-text-secondary hover:text-white"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleAgeVerification}
                            disabled={loading || !birthdate}
                            className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover transition-colors text-sm disabled:opacity-50 flex items-center gap-2"
                        >
                            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                            Verificar Edad
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
