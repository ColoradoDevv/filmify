'use client';

import { useEffect, useState } from 'react';
import { User, Eye, Star, Users, CheckCircle, AlertCircle, History, FileText, ExternalLink } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { clearHistory as clearSearchHistory } from '@/lib/supabase/history';

export function PrivacySection({ user }: { user: any }) {
    const supabase = createClient();
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [privacy, setPrivacy] = useState({
        publicProfile: true,
        showWatchHistory: true,
        showWatchlist: true,
        allowFriendRequests: true
    });

    useEffect(() => {
        if (user?.user_metadata?.privacy) {
            setPrivacy(user.user_metadata.privacy);
        }
    }, [user]);

    const handleToggle = async (key: keyof typeof privacy) => {
        const newPrivacy = { ...privacy, [key]: !privacy[key] };
        setPrivacy(newPrivacy);
        setLoading(true);
        setMessage(null);

        try {
            const [{ error: authError }, { data: currentProfileData, error: profileFetchError }] = await Promise.all([
                supabase.auth.updateUser({ data: { privacy: newPrivacy } }),
                supabase.from('profiles').select('preferences').eq('id', user.id).single(),
            ]);

            if (authError) throw authError;
            if (profileFetchError) throw profileFetchError;

            const existingPreferences = currentProfileData?.preferences ?? {};
            const mergedPreferences = { ...existingPreferences, privacy: newPrivacy };

            const { error: profileUpdateError } = await supabase.from('profiles').update({ preferences: mergedPreferences }).eq('id', user.id);
            if (profileUpdateError) throw profileUpdateError;
        } catch (error: any) {
            setMessage({ type: 'error', text: 'Error al guardar: ' + error.message });
            setPrivacy(privacy);
        } finally {
            setLoading(false);
        }
    };

    const clearHistory = async () => {
        if (!confirm('¿Estás seguro de que quieres borrar tu historial de búsqueda?')) return;
        setLoading(true);
        try {
            await clearSearchHistory();
            setMessage({ type: 'success', text: 'Historial borrado correctamente' });
        } catch (err) {
            setMessage({ type: 'error', text: 'Error al borrar el historial' });
        } finally {
            setLoading(false);
        }
    };

    const items = [
        {
            key: 'publicProfile',
            label: 'Perfil Público',
            desc: 'Permitir que otros usuarios vean tu perfil',
            icon: User,
            color: 'from-blue-500/20 to-indigo-500/20',
            iconColor: 'text-blue-400'
        },
        {
            key: 'showWatchHistory',
            label: 'Mostrar Historial',
            desc: 'Mostrar lo que has visto en tu perfil público',
            icon: Eye,
            color: 'from-green-500/20 to-emerald-500/20',
            iconColor: 'text-green-400'
        },
        {
            key: 'showWatchlist',
            label: 'Mostrar Mi Lista',
            desc: 'Compartir tus listas guardadas públicamente',
            icon: Star,
            color: 'from-yellow-500/20 to-orange-500/20',
            iconColor: 'text-yellow-400'
        },
        {
            key: 'allowFriendRequests',
            label: 'Solicitudes de Amistad',
            desc: 'Permitir que otros te envíen solicitudes',
            icon: Users,
            color: 'from-purple-500/20 to-pink-500/20',
            iconColor: 'text-purple-400'
        }
    ];

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="pb-4 border-b border-surface-light/30">
                <h2 className="text-xl font-bold mb-1 bg-gradient-to-r from-white to-text-secondary bg-clip-text text-transparent">Privacidad</h2>
                <p className="text-xs text-text-secondary">Controla quién ve tu actividad</p>
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
                {items.map((item) => {
                    const Icon = item.icon;
                    return (
                        <div key={item.key} className="p-4 bg-gradient-to-br from-surface-light/30 to-surface-light/10 backdrop-blur-sm rounded-2xl border border-surface-light/30 hover:border-surface-light/50 transition-all duration-300">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3 flex-1 pr-4">
                                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center shrink-0`}>
                                        <Icon className={`w-5 h-5 ${item.iconColor}`} />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-semibold text-white">{item.label}</h3>
                                        <p className="text-[10px] text-text-secondary">{item.desc}</p>
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={privacy[item.key as keyof typeof privacy]}
                                        onChange={() => handleToggle(item.key as keyof typeof privacy)}
                                        disabled={loading}
                                    />
                                    <div className="w-9 h-5 bg-surface-light/50 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-primary peer-checked:to-primary-hover peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"></div>
                                </label>
                            </div>
                        </div>
                    );
                })}

                {/* Clear History Danger Zone */}
                <div className="md:col-span-2 p-4 bg-red-500/5 border border-red-500/20 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                            <History className="w-5 h-5 text-red-400" />
                        </div>
                        <div>
                            <h3 className="text-red-400 text-sm font-semibold">Historial de Reproducción</h3>
                            <p className="text-[10px] text-text-secondary">Borrar todos los títulos vistos</p>
                        </div>
                    </div>
                    <button
                        onClick={clearHistory}
                        disabled={loading}
                        className="px-4 py-2 bg-transparent border border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 rounded-xl text-xs font-medium transition-all duration-300 hover:scale-105 disabled:opacity-50"
                    >
                        Borrar Historial
                    </button>
                </div>

                {/* Export Data */}
                <div className="md:col-span-2 p-6 bg-surface-light/30 backdrop-blur-sm rounded-2xl border border-surface-light/30">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center shrink-0">
                                <FileText className="w-6 h-6 text-primary" />
                            </div>
                            <div className="text-left">
                                <h3 className="text-base font-bold text-white mb-1">Tus Datos y Privacidad (GDPR)</h3>
                                <p className="text-xs text-text-secondary max-w-md">
                                    Tienes derecho a obtener una copia de tus datos personales. Prepararemos un archivo JSON con toda tu información.
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={async () => {
                                setLoading(true);
                                try {
                                    const supabaseClient = createClient();
                                    const { data: { user: currentUser } } = await supabaseClient.auth.getUser();
                                    if (!currentUser) return;

                                    const [{ data: profile }, { data: reviews }, { data: searchHistory }] = await Promise.all([
                                        supabaseClient.from('profiles').select('*').eq('id', currentUser.id).single(),
                                        supabaseClient.from('reviews').select('*').eq('user_id', currentUser.id),
                                        supabaseClient.from('search_history').select('*').eq('user_id', currentUser.id),
                                    ]);

                                    const exportData = {
                                        exported_at: new Date().toISOString(),
                                        account: { email: currentUser.email, created_at: currentUser.created_at },
                                        profile,
                                        reviews: reviews ?? [],
                                        search_history: searchHistory ?? [],
                                    };

                                    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = `filmify-datos-${new Date().toISOString().split('T')[0]}.json`;
                                    a.click();
                                    URL.revokeObjectURL(url);
                                    setMessage({ type: 'success', text: 'Datos exportados correctamente' });
                                } catch {
                                    setMessage({ type: 'error', text: 'Error al exportar los datos' });
                                } finally {
                                    setLoading(false);
                                }
                            }}
                            disabled={loading}
                            className="w-full md:w-auto px-6 py-2.5 bg-surface-light hover:bg-surface-hover text-white rounded-xl text-xs font-bold transition-all duration-300 flex items-center justify-center gap-2 border border-white/5 hover:border-primary/30 disabled:opacity-50"
                        >
                            <ExternalLink className="w-3 h-3" />
                            Descargar mis datos
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
