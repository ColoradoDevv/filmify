'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import {
    ArrowLeft, Bell, HelpCircle, Loader2, Lock, type LucideIcon,
    ShieldCheck, SlidersHorizontal, User,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useTVDetection } from '@/hooks/useTVDetection';
import { useSpatialNavigation } from '@/hooks/useSpatialNavigation';
import { getUserPreferences } from '@/app/actions/settings';
import { DEFAULT_PREFERENCES, type UserPreferences } from '@/lib/user-preferences';
import { applyReducedMotion } from '@/lib/reduced-motion';
import { cn } from '@/lib/utils';

import { ProfileSection } from './sections/ProfileSection';
import { AccountSection } from './sections/AccountSection';
import { PrivacySection } from './sections/PrivacySection';
import { PreferencesSection } from './sections/PreferencesSection';
import { NotificationsSection } from './sections/NotificationsSection';
import { SupportSection } from './sections/SupportSection';

const TABS = [
    { id: 'profile', label: 'Perfil', icon: User },
    { id: 'account', label: 'Cuenta', icon: Lock },
    { id: 'privacy', label: 'Privacidad', icon: ShieldCheck },
    { id: 'preferences', label: 'Preferencias', icon: SlidersHorizontal },
    { id: 'notifications', label: 'Notificaciones', icon: Bell },
    { id: 'support', label: 'Ayuda', icon: HelpCircle },
] as const satisfies readonly { id: string; label: string; icon: LucideIcon }[];

type TabId = (typeof TABS)[number]['id'];

function isTabId(value: string | null): value is TabId {
    return !!value && TABS.some((t) => t.id === value);
}

/**
 * Ajustes de cuenta.
 *
 * Las preferencias se cargan UNA vez aquí y bajan a las secciones como props.
 * Antes cada sección se traía su propia copia de `profiles.preferences` al
 * montarse y la escribía a su manera; una de ellas sobrescribía la columna
 * entera y se llevaba por delante favoritos y amistades. Ahora la lectura y la
 * escritura pasan por `@/app/actions/settings`, que fusiona siempre.
 *
 * La pestaña vive en `?tab=`, así que se puede enlazar y sobrevive a recargar.
 */
export default function SettingsPage() {
    const supabase = createClient();
    const router = useRouter();
    const searchParams = useSearchParams();

    const [user, setUser] = useState<SupabaseUser | null>(null);
    const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
    const [loading, setLoading] = useState(true);

    const requested = searchParams.get('tab');
    const activeTab: TabId = isTabId(requested) ? requested : 'profile';

    const { isTV } = useTVDetection();
    const containerRef = useRef<HTMLDivElement>(null);
    useSpatialNavigation(containerRef, { enabled: isTV, focusOnMount: isTV });

    useEffect(() => {
        let alive = true;
        (async () => {
            const [{ data: { user: current } }, prefs] = await Promise.all([
                supabase.auth.getUser(),
                getUserPreferences(),
            ]);
            if (!alive) return;
            setUser(current);
            if (prefs.ok) {
                setPreferences(prefs.preferences);
                // La cuenta manda sobre el espejo local de este navegador.
                applyReducedMotion(prefs.preferences.playback.reducedMotion);
            }
            setLoading(false);
        })();
        return () => { alive = false; };
    }, [supabase]);

    const refreshUser = useCallback(async () => {
        const { data: { user: current } } = await supabase.auth.getUser();
        setUser(current);
    }, [supabase]);

    const selectTab = useCallback((tab: TabId) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('tab', tab);
        router.replace(`/settings?${params.toString()}`, { scroll: false });
    }, [router, searchParams]);

    if (loading) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary" aria-label="Cargando ajustes" />
            </div>
        );
    }

    return (
        <div ref={containerRef} className="mx-auto max-w-5xl">
            <header className="mb-5">
                <Link
                    href="/browse"
                    className="mb-3 inline-flex items-center gap-1.5 rounded text-xs font-medium text-on-surface-variant transition-colors hover:text-on-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                    <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
                    Volver al catálogo
                </Link>
                <h1 className="text-xl font-semibold text-on-surface sm:text-2xl">Ajustes</h1>
                <p className="mt-0.5 text-sm text-on-surface-variant">
                    {user?.email ?? 'Tu cuenta de FilmiFy'}
                </p>
            </header>

            <div className="flex flex-col gap-5 lg:flex-row lg:gap-6">
                {/* Navegación: fila con scroll en móvil, columna fija en escritorio. */}
                <nav
                    aria-label="Secciones de ajustes"
                    /* Rejilla en móvil, columna en escritorio.
                       Era una fila con `overflow-x-auto scrollbar-hide`: las seis
                       pestañas no caben en 375 px, y sin barra visible las tres
                       últimas —Preferencias, Notificaciones y Ayuda— quedaban
                       cortadas sin ninguna pista de que hubiera más. Con dos
                       columnas se ven todas y no hay nada que desplazar. */
                    className="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:flex lg:w-52 lg:shrink-0 lg:flex-col"
                >
                    {TABS.map(({ id, label, icon: Icon }) => {
                        const active = activeTab === id;
                        return (
                            <button
                                key={id}
                                type="button"
                                onClick={() => selectTab(id)}
                                aria-current={active ? 'page' : undefined}
                                className={cn(
                                    // `min-w-0` + `truncate`: en dos columnas a 375 px
                                    // «Notificaciones» va justa, y sin esto empujaría
                                    // la celda en vez de recortarse.
                                    'flex min-w-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                                    'tv-focusable lg:w-full',
                                    active
                                        ? 'bg-surface-container text-on-surface'
                                        : 'text-on-surface-variant hover:bg-on-surface/5 hover:text-on-surface',
                                )}
                            >
                                <Icon className={cn('h-4 w-4 shrink-0', active && 'text-primary')} aria-hidden />
                                <span className="truncate">{label}</span>
                            </button>
                        );
                    })}
                </nav>

                <div className="min-w-0 flex-1">
                    {activeTab === 'profile' && <ProfileSection user={user} onUpdate={refreshUser} />}
                    {activeTab === 'account' && <AccountSection user={user} onUpdate={refreshUser} />}
                    {activeTab === 'privacy' && (
                        <PrivacySection
                            privacy={preferences.privacy}
                            onSaved={(privacy) => setPreferences((p) => ({ ...p, privacy }))}
                        />
                    )}
                    {activeTab === 'preferences' && (
                        <PreferencesSection
                            playback={preferences.playback}
                            onSaved={(playback) => setPreferences((p) => ({ ...p, playback }))}
                        />
                    )}
                    {activeTab === 'notifications' && (
                        <NotificationsSection
                            notifications={preferences.notifications}
                            onSaved={(notifications) => setPreferences((p) => ({ ...p, notifications }))}
                        />
                    )}
                    {activeTab === 'support' && <SupportSection />}
                </div>
            </div>
        </div>
    );
}
