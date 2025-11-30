'use client';

import { useState, useEffect } from 'react';
import { Cookie, X, ChevronRight, Shield, BarChart3, Megaphone, Check, ChevronLeft } from 'lucide-react';

type ConsentState = {
    analytics: boolean;
    marketing: boolean;
};

export const CookieConsent = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [showDetails, setShowDetails] = useState(false);
    const [preferences, setPreferences] = useState<ConsentState>({
        analytics: true,
        marketing: false
    });

    useEffect(() => {
        const stored = localStorage.getItem('cookie_consent');
        if (!stored) {
            // Small delay for animation
            const timer = setTimeout(() => setIsVisible(true), 1000);
            return () => clearTimeout(timer);
        } else {
            // Restore preferences if available (optional, usually we just don't show it)
            // But if we wanted to let them edit, we'd load it here.
            // For now, just apply the stored consent to GTM
            try {
                const parsed = JSON.parse(stored);
                // If it's the old format (string), treat as 'granted' -> all true
                if (typeof parsed === 'string') {
                    applyConsent({ analytics: parsed === 'granted', marketing: parsed === 'granted' });
                } else {
                    applyConsent(parsed);
                }
            } catch (e) {
                // Fallback for simple string format
                if (stored === 'granted') applyConsent({ analytics: true, marketing: true });
                else applyConsent({ analytics: false, marketing: false });
            }
        }
    }, []);

    const applyConsent = (state: ConsentState) => {
        if (typeof window !== 'undefined' && window.gtag) {
            window.gtag('consent', 'update', {
                'analytics_storage': state.analytics ? 'granted' : 'denied',
                'ad_storage': state.marketing ? 'granted' : 'denied',
                'ad_user_data': state.marketing ? 'granted' : 'denied',
                'ad_personalization': state.marketing ? 'granted' : 'denied',
                'functionality_storage': 'granted', // Always granted
                'personalization_storage': 'granted', // Always granted
                'security_storage': 'granted' // Always granted
            });
        }
    };

    const savePreferences = (state: ConsentState) => {
        applyConsent(state);
        localStorage.setItem('cookie_consent', JSON.stringify(state));
        setIsVisible(false);
    };

    const handleAcceptAll = () => {
        savePreferences({ analytics: true, marketing: true });
    };

    const handleRejectAll = () => {
        savePreferences({ analytics: false, marketing: false });
    };

    const handleSavePreferences = () => {
        savePreferences(preferences);
    };

    if (!isVisible) return null;

    return (
        <>
            {/* Blocking Backdrop */}
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] animate-in fade-in duration-500" />

            <div className="fixed bottom-0 left-0 right-0 md:bottom-6 md:left-6 md:right-auto md:max-w-[480px] z-[101] p-4 md:p-0">
                <div className="bg-[#0f1115] border border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-500">



                    {!showDetails ? (
                        // MAIN VIEW
                        <div className="p-6 space-y-6">
                            <div className="flex items-start gap-4">
                                <div className="p-3.5 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-2xl border border-white/5 shadow-inner">
                                    <Cookie className="text-white" size={28} />
                                </div>
                                <div className="flex-1 space-y-1.5">
                                    <h3 className="font-bold text-white text-xl tracking-tight">Tu privacidad importa</h3>
                                    <p className="text-gray-400 text-sm leading-relaxed">
                                        Usamos cookies para mejorar tu experiencia, analizar nuestro tráfico y personalizar el contenido. Tú decides qué compartir.
                                    </p>
                                </div>
                            </div>

                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={handleAcceptAll}
                                    className="w-full py-3.5 rounded-xl bg-white text-black font-bold hover:bg-gray-200 transition-all active:scale-[0.98] shadow-lg shadow-white/5"
                                >
                                    Aceptar todo
                                </button>

                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => setShowDetails(true)}
                                        className="py-3.5 rounded-xl bg-white/5 text-white font-medium hover:bg-white/10 border border-white/5 transition-all active:scale-[0.98]"
                                    >
                                        Personalizar
                                    </button>
                                    <button
                                        onClick={handleRejectAll}
                                        className="py-3.5 rounded-xl bg-white/5 text-white font-medium hover:bg-white/10 border border-white/5 transition-all active:scale-[0.98]"
                                    >
                                        Rechazar
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        // DETAILS VIEW
                        <div className="p-6 space-y-6">
                            <div className="flex items-center gap-3 pb-4 border-b border-white/5">
                                <button
                                    onClick={() => setShowDetails(false)}
                                    className="p-2 -ml-2 rounded-full hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
                                >
                                    <ChevronLeft size={24} />
                                </button>
                                <h3 className="font-bold text-white text-lg">Preferencias de Cookies</h3>
                            </div>

                            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                {/* Essential */}
                                <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/5 border border-white/5">
                                    <Shield className="text-green-400 mt-1" size={20} />
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="font-bold text-white">Esenciales</span>
                                            <span className="text-xs font-bold text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full">Siempre activo</span>
                                        </div>
                                        <p className="text-xs text-gray-400 leading-relaxed">
                                            Necesarias para que el sitio funcione correctamente. No se pueden desactivar.
                                        </p>
                                    </div>
                                </div>

                                {/* Analytics */}
                                <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/5 border border-white/5">
                                    <BarChart3 className={preferences.analytics ? "text-blue-400 mt-1" : "text-gray-500 mt-1"} size={20} />
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="font-bold text-white">Analíticas</span>
                                            <button
                                                onClick={() => setPreferences(p => ({ ...p, analytics: !p.analytics }))}
                                                className={`relative w-11 h-6 rounded-full transition-colors duration-200 ease-in-out ${preferences.analytics ? 'bg-blue-500' : 'bg-gray-700'}`}
                                            >
                                                <span className={`absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ease-in-out ${preferences.analytics ? 'translate-x-5' : 'translate-x-0'}`} />
                                            </button>
                                        </div>
                                        <p className="text-xs text-gray-400 leading-relaxed">
                                            Nos ayudan a entender cómo usas el sitio para mejorarlo.
                                        </p>
                                    </div>
                                </div>

                                {/* Marketing */}
                                <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/5 border border-white/5">
                                    <Megaphone className={preferences.marketing ? "text-purple-400 mt-1" : "text-gray-500 mt-1"} size={20} />
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="font-bold text-white">Marketing</span>
                                            <button
                                                onClick={() => setPreferences(p => ({ ...p, marketing: !p.marketing }))}
                                                className={`relative w-11 h-6 rounded-full transition-colors duration-200 ease-in-out ${preferences.marketing ? 'bg-purple-500' : 'bg-gray-700'}`}
                                            >
                                                <span className={`absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ease-in-out ${preferences.marketing ? 'translate-x-5' : 'translate-x-0'}`} />
                                            </button>
                                        </div>
                                        <p className="text-xs text-gray-400 leading-relaxed">
                                            Permiten mostrarte contenido y anuncios relevantes para ti.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={handleSavePreferences}
                                className="w-full py-3.5 rounded-xl bg-white text-black font-bold hover:bg-gray-200 transition-all active:scale-[0.98] shadow-lg shadow-white/5"
                            >
                                Guardar preferencias
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};
