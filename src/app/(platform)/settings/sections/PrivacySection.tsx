'use client';

import { useCallback, useState } from 'react';
import { Download, Eye, History, ListVideo, Trash2, UserPlus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { clearHistory as clearSearchHistory } from '@/lib/supabase/history';
import { patchUserPreferences } from '@/app/actions/settings';
import type { PrivacyPreferences } from '@/lib/user-preferences';
import {
    SettingsPanel, SettingRow, Toggle, Button, StatusBanner, type StatusMessage,
} from '../components/ui';
import ConfirmDialog from '../components/ConfirmDialog';

/**
 * Visibilidad del perfil y control de los datos.
 *
 * Fuente única: `profiles.preferences.privacy`. Antes se guardaba por duplicado
 * —también en `user_metadata.privacy`, que era de donde se leía— y dos sitios
 * para el mismo dato acaban divergiendo; `/profile` ya leía del segundo.
 *
 * `publicProfile` y `allowFriendRequests` siempre gobernaron algo. Los otros
 * dos no: `showWatchlist` solo pintaba una frase en el perfil ajeno sin ocultar
 * nada, y `showWatchHistory` no lo leía nadie —«visto» ni siquiera salía del
 * localStorage—. Y no bastaba con filtrar en el componente: `profiles` era
 * legible sin sesión, favoritos y amistades incluidos, así que cualquier gate
 * aquí habría sido decorativo. Ahora los cuatro se aplican en la base de datos
 * (`can_view_profile_section`, 20260825_privacy_gated_content.sql) y esta
 * pantalla solo escribe el valor.
 */
export function PrivacySection({
    privacy, onSaved,
}: {
    privacy: PrivacyPreferences;
    onSaved: (next: PrivacyPreferences) => void;
}) {
    const [saving, setSaving] = useState<keyof PrivacyPreferences | null>(null);
    const [busy, setBusy] = useState<'export' | 'history' | null>(null);
    const [confirmClear, setConfirmClear] = useState(false);
    const [message, setMessage] = useState<StatusMessage | null>(null);

    const update = useCallback(async (key: keyof PrivacyPreferences, value: boolean) => {
        setSaving(key);
        setMessage(null);
        const res = await patchUserPreferences({ privacy: { [key]: value } });
        if (res.ok) onSaved(res.preferences.privacy);
        else setMessage({ type: 'error', text: res.error ?? 'No se pudo guardar el ajuste' });
        setSaving(null);
    }, [onSaved]);

    const exportData = useCallback(async () => {
        setBusy('export');
        setMessage(null);
        try {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Sesión no iniciada');

            // Columnas explícitas y `preferences` aparte, por RPC: `select('*')`
            // se expande a TODAS las columnas y `preferences`, `birthdate`,
            // `role` e `is_banned` están revocadas para `authenticated` (ver
            // 20260826_close_profiles_read.sql). Con el asterisco, la consulta
            // fallaría entera y el export saldría sin perfil.
            const [profile, preferences, reviews, history] = await Promise.all([
                supabase
                    .from('profiles')
                    .select('id, username, full_name, avatar_url, bio, updated_at')
                    .eq('id', user.id)
                    .single(),
                supabase.rpc('get_my_preferences'),
                supabase.from('reviews').select('*').eq('user_id', user.id),
                supabase.from('search_history').select('*').eq('user_id', user.id),
            ]);

            const payload = {
                exported_at: new Date().toISOString(),
                account: { id: user.id, email: user.email, created_at: user.created_at },
                profile: profile.data ?? null,
                // Va en el export aunque no sea legible por PostgREST: son sus
                // datos, y aquí incluye favoritos y amistades.
                preferences: preferences.data ?? null,
                reviews: reviews.data ?? [],
                search_history: history.data ?? [],
            };

            const url = URL.createObjectURL(
                new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }),
            );
            const a = document.createElement('a');
            a.href = url;
            a.download = `filmify-datos-${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(url);

            setMessage({ type: 'success', text: 'Descarga iniciada.' });
        } catch {
            setMessage({ type: 'error', text: 'No se pudieron exportar tus datos.' });
        } finally {
            setBusy(null);
        }
    }, []);

    const clearHistory = useCallback(async () => {
        setConfirmClear(false);
        setBusy('history');
        setMessage(null);
        try {
            await clearSearchHistory();
            setMessage({ type: 'success', text: 'Historial de búsqueda borrado.' });
        } catch {
            setMessage({ type: 'error', text: 'No se pudo borrar el historial.' });
        } finally {
            setBusy(null);
        }
    }, []);

    const toggle = (key: keyof PrivacyPreferences, label: string) => (
        <Toggle
            id={`privacy-${key}`}
            label={label}
            checked={privacy[key]}
            disabled={saving === key}
            onChange={(v) => void update(key, v)}
        />
    );

    return (
        <div className="space-y-4">
            <StatusBanner message={message} />

            <SettingsPanel
                title="Visibilidad"
                description="Qué pueden ver otros usuarios cuando abren tu perfil."
            >
                <SettingRow
                    icon={Eye}
                    htmlFor="privacy-publicProfile"
                    label="Perfil público"
                    description="Sin esto, tu perfil solo eres tú quien lo ve."
                    control={toggle('publicProfile', 'Perfil público')}
                />
                <SettingRow
                    icon={History}
                    htmlFor="privacy-showWatchHistory"
                    label="Mostrar lo que he visto"
                    description="Tu historial aparece en tu perfil público."
                    control={toggle('showWatchHistory', 'Mostrar lo que he visto')}
                />
                <SettingRow
                    icon={ListVideo}
                    htmlFor="privacy-showWatchlist"
                    label="Mostrar mis listas"
                    description="Tus favoritos y listas aparecen en tu perfil público."
                    control={toggle('showWatchlist', 'Mostrar mis listas')}
                />
                <SettingRow
                    icon={UserPlus}
                    htmlFor="privacy-allowFriendRequests"
                    label="Aceptar solicitudes de amistad"
                    description="Al desactivarlo, nadie puede enviarte nuevas solicitudes."
                    control={toggle('allowFriendRequests', 'Aceptar solicitudes de amistad')}
                />
            </SettingsPanel>

            <SettingsPanel
                title="Tus datos"
                description="Descarga o elimina la información que guardamos sobre ti."
            >
                <SettingRow
                    icon={Download}
                    label="Exportar mis datos"
                    description="Un archivo JSON con tu perfil, tus reseñas y tu historial de búsqueda."
                    control={
                        <Button onClick={() => void exportData()} loading={busy === 'export'}>
                            Descargar
                        </Button>
                    }
                />
                <SettingRow
                    icon={Trash2}
                    danger
                    label="Borrar historial de búsqueda"
                    description="Elimina todo lo que has buscado. No se puede deshacer."
                    control={
                        <Button
                            variant="danger"
                            onClick={() => setConfirmClear(true)}
                            loading={busy === 'history'}
                        >
                            Borrar
                        </Button>
                    }
                />
            </SettingsPanel>

            <ConfirmDialog
                open={confirmClear}
                title="Borrar historial de búsqueda"
                description="Se eliminarán todas tus búsquedas guardadas. Esta acción no se puede deshacer."
                confirmLabel="Borrar historial"
                onCancel={() => setConfirmClear(false)}
                onConfirm={() => void clearHistory()}
            />
        </div>
    );
}
