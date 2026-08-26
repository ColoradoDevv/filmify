'use client';

import { useCallback, useState } from 'react';
import { Accessibility, ShieldAlert } from 'lucide-react';
import { patchUserPreferences } from '@/app/actions/settings';
import type { PlaybackPreferences } from '@/lib/user-preferences';
import { applyReducedMotion } from '@/lib/reduced-motion';
import { SettingsPanel, SettingRow, Toggle, StatusBanner, type StatusMessage } from '../components/ui';

/**
 * Preferencias de reproducción y accesibilidad.
 *
 * Antes había cuatro interruptores y ninguno hacía nada de verdad:
 *  - «Idioma» ofrecía inglés y portugués en una interfaz que solo existe en
 *    español. Se retira: traducir la app es un proyecto aparte, no una casilla.
 *  - «Reproducción automática» solo la leía `MovieHero`, un componente que ya
 *    no se monta en ninguna ruta. Se retira hasta que haya un reproductor que
 *    la respete.
 *  - «Reducción de movimiento» cambiaba `scrollBehavior` y nada más; las
 *    animaciones seguían corriendo. Ahora pone una clase en <html> que apaga
 *    animaciones y transiciones en todo el sitio.
 *  - «Contenido para adultos» no filtraba nada: prometía un control +18
 *    inexistente. Ahora gobierna `include_adult` en las búsquedas de TMDB.
 */
export function PreferencesSection({
    playback, onSaved,
}: {
    playback: PlaybackPreferences;
    onSaved: (next: PlaybackPreferences) => void;
}) {
    const [saving, setSaving] = useState<keyof PlaybackPreferences | null>(null);
    const [message, setMessage] = useState<StatusMessage | null>(null);

    const update = useCallback(async (key: keyof PlaybackPreferences, value: boolean) => {
        setSaving(key);
        setMessage(null);

        // El movimiento reducido se aplica antes de la ida y vuelta al servidor:
        // es un ajuste de accesibilidad y esperar a la red para obedecerlo se
        // nota. Si el guardado falla, se revierte igual que el resto.
        if (key === 'reducedMotion') applyReducedMotion(value);

        const res = await patchUserPreferences({ playback: { [key]: value } });

        if (!res.ok) {
            if (key === 'reducedMotion') applyReducedMotion(playback.reducedMotion);
            setMessage({ type: 'error', text: res.error ?? 'No se pudo guardar el ajuste' });
        } else {
            onSaved(res.preferences.playback);
            applyReducedMotion(res.preferences.playback.reducedMotion);
        }
        setSaving(null);
    }, [onSaved, playback.reducedMotion]);

    return (
        <div className="space-y-4">
            <StatusBanner message={message} />

            <SettingsPanel
                title="Reproducción y accesibilidad"
                description="Se aplican a este navegador y a tu cuenta en cualquier dispositivo."
            >
                <SettingRow
                    icon={Accessibility}
                    htmlFor="pref-reduced-motion"
                    label="Reducir movimiento"
                    description="Desactiva animaciones y transiciones en toda la interfaz. Útil si te marean o si tu equipo va justo."
                    control={
                        <Toggle
                            id="pref-reduced-motion"
                            label="Reducir movimiento"
                            checked={playback.reducedMotion}
                            disabled={saving === 'reducedMotion'}
                            onChange={(v) => void update('reducedMotion', v)}
                        />
                    }
                />

                <SettingRow
                    icon={ShieldAlert}
                    htmlFor="pref-adult"
                    label="Incluir contenido para adultos en la búsqueda"
                    description="Los resultados marcados como adultos por TMDB aparecen al buscar. Desactivado, quedan siempre fuera."
                    control={
                        <Toggle
                            id="pref-adult"
                            label="Incluir contenido para adultos en la búsqueda"
                            checked={playback.adultContent}
                            disabled={saving === 'adultContent'}
                            onChange={(v) => void update('adultContent', v)}
                        />
                    }
                />
            </SettingsPanel>
        </div>
    );
}
