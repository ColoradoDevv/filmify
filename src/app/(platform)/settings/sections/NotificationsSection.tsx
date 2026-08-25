'use client';

import { useCallback, useState } from 'react';
import { Clapperboard, TrendingUp } from 'lucide-react';
import { patchUserPreferences } from '@/app/actions/settings';
import type { NotificationPreferences } from '@/lib/user-preferences';
import { SettingsPanel, SettingRow, Toggle, StatusBanner, type StatusMessage } from '../components/ui';

/**
 * Avisos que FilmiFy envía al centro de notificaciones.
 *
 * Antes había cuatro interruptores y ninguno servía: se guardaban en el perfil,
 * pero el cron de /api/cron/notifications insertaba filas para todo el mundo
 * sin mirarlos. Ahora el cron los respeta.
 *
 * Los de «actividad de amigos» y «ofertas» desaparecieron porque no existía
 * ningún productor de esas notificaciones en el proyecto: eran un interruptor
 * para algo que nunca llegaba.
 */
export function NotificationsSection({
    notifications, onSaved,
}: {
    notifications: NotificationPreferences;
    onSaved: (next: NotificationPreferences) => void;
}) {
    const [saving, setSaving] = useState<keyof NotificationPreferences | null>(null);
    const [message, setMessage] = useState<StatusMessage | null>(null);

    const update = useCallback(async (key: keyof NotificationPreferences, value: boolean) => {
        setSaving(key);
        setMessage(null);
        const res = await patchUserPreferences({ notifications: { [key]: value } });
        if (res.ok) onSaved(res.preferences.notifications);
        else setMessage({ type: 'error', text: res.error ?? 'No se pudo guardar el ajuste' });
        setSaving(null);
    }, [onSaved]);

    return (
        <div className="space-y-4">
            <StatusBanner message={message} />

            <SettingsPanel
                title="Notificaciones"
                description="Aparecen en la campana de la barra superior. No enviamos correo."
            >
                <SettingRow
                    icon={Clapperboard}
                    htmlFor="notif-releases"
                    label="Estrenos"
                    description="Películas que llegan a cartelera y próximos lanzamientos, sin repetir un título dos veces en siete días."
                    control={
                        <Toggle
                            id="notif-releases"
                            label="Estrenos"
                            checked={notifications.newReleases}
                            disabled={saving === 'newReleases'}
                            onChange={(v) => void update('newReleases', v)}
                        />
                    }
                />

                <SettingRow
                    icon={TrendingUp}
                    htmlFor="notif-trending"
                    label="Resumen de tendencias"
                    description="Un aviso con lo más visto de la semana."
                    control={
                        <Toggle
                            id="notif-trending"
                            label="Resumen de tendencias"
                            checked={notifications.recommendations}
                            disabled={saving === 'recommendations'}
                            onChange={(v) => void update('recommendations', v)}
                        />
                    }
                />
            </SettingsPanel>
        </div>
    );
}
