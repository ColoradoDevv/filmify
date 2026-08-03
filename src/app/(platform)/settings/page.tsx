'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
    User,
    Settings as SettingsIcon,
    Lock,
    Bell,
    ArrowLeft,
    Loader2,
    ShieldCheck,
    HelpCircle,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useTVDetection } from '@/hooks/useTVDetection';
import { useSpatialNavigation } from '@/hooks/useSpatialNavigation';
import { ProfileSection } from './sections/ProfileSection';
import { AccountSection } from './sections/AccountSection';
import { PrivacySection } from './sections/PrivacySection';
import { PreferencesSection } from './sections/PreferencesSection';
import { NotificationsSection } from './sections/NotificationsSection';
import { SupportSection } from './sections/SupportSection';
import { AdSlot } from '@/components/ads';

export default function SettingsPage() {
    const supabase = createClient();
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'profile' | 'account' | 'preferences' | 'notifications' | 'privacy' | 'support'>('profile');

    const { isTV } = useTVDetection();
    const containerRef = useRef<HTMLDivElement>(null);

    useSpatialNavigation(containerRef, {
        enabled: isTV,
        focusOnMount: true
    });

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
            setLoading(false);
        };
        getUser();
    }, []);

    const handleUserUpdate = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    const tabs = [
        { id: 'profile', label: 'Perfil', icon: User },
        { id: 'account', label: 'Cuenta y Seguridad', icon: Lock },
        { id: 'privacy', label: 'Privacidad', icon: ShieldCheck },
        { id: 'preferences', label: 'Preferencias', icon: SettingsIcon },
        { id: 'notifications', label: 'Notificaciones', icon: Bell },
        { id: 'support', label: 'Ayuda y Legal', icon: HelpCircle }
    ];

    return (
        <div className="max-w-6xl mx-auto" ref={containerRef}>
            {/* Enhanced Header */}
            <div className="mb-6 relative">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-purple-500/10 to-pink-500/10 blur-3xl -z-10 opacity-50" />
                <div className="relative">
                    <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-white via-primary to-purple-400 bg-clip-text text-transparent">
                        Configuración
                    </h1>
                    <p className="text-text-secondary text-base">Personaliza tu experiencia en FilmiFy</p>
                    <div className="mt-4">
                        <Link
                            href="/browse"
                            className="inline-flex items-center gap-2 px-4 py-3 rounded-full bg-primary text-black font-semibold hover:bg-primary-hover transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Volver a Browse
                        </Link>
                    </div>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
                {/* Enhanced Sidebar */}
                <div className="lg:w-72 flex-shrink-0">
                    <div className="sticky top-6 bg-surface-light/50 backdrop-blur-xl rounded-2xl border border-surface-light/50 p-3 space-y-2 shadow-xl shadow-black/20">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`group w-full flex items-center gap-4 px-5 py-4 rounded-xl text-sm font-medium transition-all duration-300 tv-focusable ${isActive
                                        ? 'bg-gradient-to-r from-primary to-primary-hover text-white shadow-lg shadow-primary/30 scale-[1.02]'
                                        : 'text-text-secondary hover:bg-surface-hover/50 hover:text-white hover:scale-[1.01]'
                                        }`}
                                >
                                    <Icon className={`w-5 h-5 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                                    <span className="flex-1 text-left">{tab.label}</span>
                                    {isActive && (
                                        <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Enhanced Content */}
                <div className="flex-1 min-w-0">
                    <div className="bg-surface-light/50 backdrop-blur-xl rounded-2xl border border-surface-light/50 p-8 shadow-xl shadow-black/20 transition-all duration-300">
                        {activeTab === 'profile' && <ProfileSection user={user} onUpdate={handleUserUpdate} />}
                        {activeTab === 'account' && <AccountSection user={user} onUpdate={handleUserUpdate} />}
                        {activeTab === 'preferences' && <PreferencesSection user={user} />}
                        {activeTab === 'notifications' && <NotificationsSection user={user} />}
                        {activeTab === 'privacy' && <PrivacySection user={user} />}
                        {activeTab === 'support' && <SupportSection />}
                    </div>

                    {/* 📢 Banner publicitario */}
                    <AdSlot />
                </div>
            </div>
        </div>
    );
}
