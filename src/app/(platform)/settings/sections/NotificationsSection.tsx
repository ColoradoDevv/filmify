'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, AlertCircle, Sparkles, Star, Users, Ticket } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export function NotificationsSection({ user }: { user: any }) {
    const supabase = createClient();
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [notifications, setNotifications] = useState({
        newReleases: true,
        recommendations: true,
        friendActivity: true,
        offers: false
    });

    useEffect(() => {
        if (!user?.id) return;
        supabase
            .from('profiles')
            .select('preferences')
            .eq('id', user.id)
            .single()
            .then(({ data }: { data: { preferences?: { notifications?: Record<string, any> } } | null }) => {
                if (data?.preferences?.notifications) {
                    setNotifications(prev => ({ ...prev, ...data.preferences!.notifications }));
                } else if (user?.user_metadata?.notifications) {
                    setNotifications(prev => ({ ...prev, ...user.user_metadata.notifications }));
                }
            });
    }, [user?.id]);

    const handleToggle = async (key: keyof typeof notifications) => {
        const newNotifications = { ...notifications, [key]: !notifications[key] };
        setNotifications(newNotifications);
        setLoading(true);
        setMessage(null);

        try {
            // Load current preferences to merge
            const { data: profileData } = await supabase
                .from('profiles')
                .select('preferences')
                .eq('id', user.id)
                .single();

            const merged = { ...(profileData?.preferences ?? {}), notifications: newNotifications };

            const { error: profileError } = await supabase
                .from('profiles')
                .update({ preferences: merged })
                .eq('id', user.id);

            if (profileError) throw profileError;
        } catch (error: any) {
            setMessage({ type: 'error', text: 'Error al guardar: ' + error.message });
            setNotifications(notifications);
        } finally {
            setLoading(false);
        }
    };

    const items = [
        {
            key: 'newReleases',
            label: 'Nuevos estrenos',
            desc: 'Películas y series añadidas recientemente',
            icon: Sparkles,
            color: 'from-blue-500/20 to-indigo-500/20',
            iconColor: 'text-blue-400'
        },
        {
            key: 'recommendations',
            label: 'Recomendaciones',
            desc: 'Sugerencias basadas en tus gustos',
            icon: Star,
            color: 'from-yellow-500/20 to-orange-500/20',
            iconColor: 'text-yellow-400'
        },
        {
            key: 'friendActivity',
            label: 'Actividad de amigos',
            desc: 'Lo que tus amigos están viendo',
            icon: Users,
            color: 'from-purple-500/20 to-pink-500/20',
            iconColor: 'text-purple-400'
        },
        {
            key: 'offers',
            label: 'Noticias y ofertas',
            desc: 'Promociones y novedades de FilmiFy',
            icon: Ticket,
            color: 'from-green-500/20 to-emerald-500/20',
            iconColor: 'text-green-400'
        }
    ];

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="pb-4 border-b border-surface-light/30">
                <h2 className="text-xl font-bold mb-1 bg-gradient-to-r from-white to-text-secondary bg-clip-text text-transparent">Notificaciones</h2>
                <p className="text-xs text-text-secondary">Controla tus alertas</p>
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
                                        checked={notifications[item.key as keyof typeof notifications]}
                                        onChange={() => handleToggle(item.key as keyof typeof notifications)}
                                        disabled={loading}
                                    />
                                    <div className="w-9 h-5 bg-surface-light/50 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-primary peer-checked:to-primary-hover peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"></div>
                                </label>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
