'use client';

import { useState } from 'react';
import { Settings as SettingsIcon, User, Bell, Save } from 'lucide-react';

export default function SettingsPage() {
    const [profile, setProfile] = useState({
        name: 'Usuario',
        avatar: '',
    });

    const [preferences, setPreferences] = useState({
        notifications: true,
        autoplay: false,
    });

    const [saved, setSaved] = useState(false);

    const handleSave = () => {
        // TODO: Implement actual save functionality
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    };

    return (
        <div className="space-y-8 max-w-4xl">
            {/* Header */}
            <div className="flex items-center gap-3">
                <SettingsIcon className="w-8 h-8 text-primary" />
                <div>
                    <h1 className="text-3xl sm:text-4xl font-bold">Ajustes</h1>
                    <p className="text-text-secondary mt-1">
                        Personaliza tu experiencia en FilmiFy
                    </p>
                </div>
            </div>

            {/* Profile Section */}
            <div className="card p-6">
                <div className="flex items-center gap-3 mb-6">
                    <User className="w-6 h-6 text-primary" />
                    <h2 className="text-xl font-semibold">Perfil</h2>
                </div>

                <div className="space-y-4">
                    {/* Avatar */}
                    <div>
                        <label className="block text-sm font-medium mb-2">
                            Avatar
                        </label>
                        <div className="flex items-center gap-4">
                            <div className="w-20 h-20 bg-surface-light rounded-full flex items-center justify-center">
                                <User className="w-10 h-10 text-text-muted" />
                            </div>
                            <button className="px-4 py-2 bg-surface-light hover:bg-surface-hover rounded-lg text-sm font-medium transition-colors">
                                Cambiar Avatar
                            </button>
                        </div>
                    </div>

                    {/* Name */}
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium mb-2">
                            Nombre
                        </label>
                        <input
                            type="text"
                            id="name"
                            value={profile.name}
                            onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                            className="w-full px-4 py-3 bg-surface-light border border-surface-light rounded-lg focus:outline-none focus:border-primary transition-colors"
                        />
                    </div>
                </div>
            </div>

            {/* Preferences Section */}
            <div className="card p-6">
                <div className="flex items-center gap-3 mb-6">
                    <Bell className="w-6 h-6 text-primary" />
                    <h2 className="text-xl font-semibold">Preferencias</h2>
                </div>

                <div className="space-y-4">
                    {/* Notifications Toggle */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-medium">Notificaciones</h3>
                            <p className="text-sm text-text-secondary">
                                Recibe actualizaciones sobre nuevas películas
                            </p>
                        </div>
                        <button
                            onClick={() => setPreferences({ ...preferences, notifications: !preferences.notifications })}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${preferences.notifications ? 'bg-primary' : 'bg-surface-light'
                                }`}
                        >
                            <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${preferences.notifications ? 'translate-x-6' : 'translate-x-1'
                                    }`}
                            />
                        </button>
                    </div>

                    {/* Autoplay Toggle */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-medium">Reproducción automática</h3>
                            <p className="text-sm text-text-secondary">
                                Reproduce trailers automáticamente
                            </p>
                        </div>
                        <button
                            onClick={() => setPreferences({ ...preferences, autoplay: !preferences.autoplay })}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${preferences.autoplay ? 'bg-primary' : 'bg-surface-light'
                                }`}
                        >
                            <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${preferences.autoplay ? 'translate-x-6' : 'translate-x-1'
                                    }`}
                            />
                        </button>
                    </div>
                </div>
            </div>

            {/* Save Button */}
            <div className="flex items-center gap-4">
                <button
                    onClick={handleSave}
                    className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary-hover transition-colors"
                >
                    <Save className="w-5 h-5" />
                    Guardar Cambios
                </button>

                {saved && (
                    <span className="text-success font-medium">
                        ✓ Cambios guardados
                    </span>
                )}
            </div>
        </div>
    );
}
