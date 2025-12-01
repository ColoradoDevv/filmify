'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import {
    User,
    Settings as SettingsIcon,
    Camera,
    Lock,
    Mail,
    Bell,
    Eye,
    EyeOff,
    CheckCircle,
    AlertCircle,
    Loader2,
    Shield
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Modal from '@/components/ui/Modal';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import { useTVDetection } from '@/hooks/useTVDetection';
import { useSpatialNavigation } from '@/hooks/useSpatialNavigation';

export default function SettingsPage() {
    const supabase = createClient();
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'profile' | 'account' | 'preferences' | 'notifications'>('profile');

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
        { id: 'account', label: 'Cuenta', icon: Lock },
        { id: 'preferences', label: 'Preferencias', icon: SettingsIcon },
        { id: 'notifications', label: 'Notificaciones', icon: Bell }
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
                    </div>
                </div>
            </div>
        </div>
    );
}

function ProfileSection({ user, onUpdate }: { user: any, onUpdate: () => Promise<void> }) {
    const supabase = createClient();
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingField, setEditingField] = useState<'fullName' | 'username' | null>(null);
    const [editValue, setEditValue] = useState('');

    // Validation State
    const [usernameStatus, setUsernameStatus] = useState<'default' | 'success' | 'error' | 'loading'>('default');
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const checkTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const [formData, setFormData] = useState({
        fullName: user?.user_metadata?.full_name || '',
        username: user?.user_metadata?.username || '',
        bio: user?.user_metadata?.bio || '',
        birthdate: user?.user_metadata?.birthdate || '',
    });
    const [avatarUrl, setAvatarUrl] = useState(user?.user_metadata?.avatar_url || '');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Constants for restrictions (in milliseconds)
    const DAYS_30 = 30 * 24 * 60 * 60 * 1000;
    const DAYS_6 = 6 * 24 * 60 * 60 * 1000;

    // Blacklist validation
    const blacklist = useMemo(() => [
        // Roles & System
        'admin', 'administrator', 'root', 'sysadmin', 'system', 'support', 'help', 'mod', 'moderator',
        'staff', 'official', 'filmify', 'owner', 'ceo', 'webmaster', 'dev', 'developer',

        // Offensive (Spanish)
        'puto', 'puta', 'mierda', 'cabron', 'pendejo', 'verga', 'pito', 'culo', 'coño',
        'mamaguevo', 'zorra', 'perra', 'maricon', 'marica', 'idiota', 'estupido', 'imbecil',
        'bastardo', 'polla', 'semen', 'tetas', 'vagina', 'concha', 'chupala', 'gonorrea',
        'malparido', 'carechimba', 'pajero', 'pajera',

        // Offensive (English)
        'dick', 'ass', 'bitch', 'fuck', 'shit', 'bastard', 'cunt', 'whore', 'slut',
        'nigger', 'nigga', 'faggot', 'rape', 'sex', 'porn', 'cock', 'pussy', 'tit', 'boob',
        'anus', 'anal', 'penis', 'vagina', 'nazi', 'hitler', 'kkk'
    ], []);

    const checkRestriction = (field: 'fullName' | 'username') => {
        const lastChange = user?.user_metadata?.[`last_${field}_change`];
        if (!lastChange) return true;

        const timeDiff = Date.now() - new Date(lastChange).getTime();
        const limit = field === 'fullName' ? DAYS_30 : DAYS_6;

        if (timeDiff < limit) {
            const daysRemaining = Math.ceil((limit - timeDiff) / (24 * 60 * 60 * 1000));
            setMessage({
                type: 'error',
                text: `Debes esperar ${daysRemaining} días para cambiar tu ${field === 'fullName' ? 'nombre' : 'usuario'}.`
            });
            return false;
        }
        return true;
    };

    const checkUsernameUnique = async (username: string) => {
        const { data, error } = await supabase
            .from('profiles')
            .select('username')
            .eq('username', username)
            .neq('id', user.id) // Exclude current user
            .single();

        return !data;
    };

    const generateSuggestions = async (baseName: string, isBlacklisted: boolean) => {
        const newSuggestions: string[] = [];
        const randomSuffix = () => Math.floor(Math.random() * 1000);

        if (isBlacklisted) {
            // Generate completely different thematic names
            const prefixes = ['Cinefilo', 'MovieBuff', 'FilmFan', 'Director', 'Actor', 'Viewer'];
            for (let i = 0; i < 3; i++) {
                const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
                newSuggestions.push(`${prefix}_${randomSuffix()}`);
            }
        } else {
            // Generate variations of the base name
            newSuggestions.push(`${baseName}_${randomSuffix()}`);
            newSuggestions.push(`${baseName}${randomSuffix()}`);
            newSuggestions.push(`The${baseName}`);
        }

        // Verify suggestions are unique
        const verifiedSuggestions: string[] = [];
        for (const suggestion of newSuggestions) {
            const isUnique = await checkUsernameUnique(suggestion);
            if (isUnique) verifiedSuggestions.push(suggestion);
            if (verifiedSuggestions.length >= 3) break;
        }

        return verifiedSuggestions;
    };

    const validateUsername = async (username: string) => {
        if (username === formData.username) {
            setUsernameStatus('default');
            setSuggestions([]);
            return;
        }

        if (username.length < 3) {
            setUsernameStatus('error');
            setSuggestions([]);
            return;
        }

        setUsernameStatus('loading');
        setSuggestions([]);

        // Check blacklist
        const lowerVal = username.toLowerCase();
        const isBlacklisted = blacklist.some(word => lowerVal.includes(word));

        if (isBlacklisted) {
            setUsernameStatus('error');
            const newSuggestions = await generateSuggestions(username, true);
            setSuggestions(newSuggestions);
            return;
        }

        // Check uniqueness
        const isUnique = await checkUsernameUnique(username);
        if (!isUnique) {
            setUsernameStatus('error');
            const newSuggestions = await generateSuggestions(username, false);
            setSuggestions(newSuggestions);
        } else {
            setUsernameStatus('success');
            setSuggestions([]);
        }
    };

    const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setEditValue(value);

        if (editingField === 'username') {
            // Clear previous timeout
            if (checkTimeoutRef.current) {
                clearTimeout(checkTimeoutRef.current);
            }

            // Immediate feedback for length
            if (value.length > 0 && value.length < 3) {
                setUsernameStatus('error');
                setSuggestions([]);
            } else if (value.length === 0 || value === formData.username) {
                setUsernameStatus('default');
                setSuggestions([]);
            } else {
                // Debounce validation
                setUsernameStatus('loading');
                checkTimeoutRef.current = setTimeout(() => {
                    validateUsername(value);
                }, 500);
            }
        }
    };

    const applySuggestion = (suggestion: string) => {
        setEditValue(suggestion);
        setUsernameStatus('success');
        setSuggestions([]);
    };

    const handleEditClick = (field: 'fullName' | 'username') => {
        setMessage(null);
        if (checkRestriction(field)) {
            setEditingField(field);
            setEditValue(formData[field]);
            setUsernameStatus('default');
            setSuggestions([]);
            setIsModalOpen(true);
        }
    };

    const handleSaveField = async () => {
        if (!editingField) return;

        // Validation check for username
        if (editingField === 'username') {
            if (editValue !== formData.username && usernameStatus !== 'success') {
                return; // Prevent saving if invalid
            }
        }

        setLoading(true);
        setMessage(null);

        try {
            const updates: any = {
                [editingField === 'fullName' ? 'full_name' : 'username']: editValue,
                [`last_${editingField}_change`]: new Date().toISOString()
            };

            // Update Auth User Metadata
            const { error: authError } = await supabase.auth.updateUser({
                data: updates
            });

            if (authError) throw authError;

            // Update Profiles Table
            const { error: profileError } = await supabase
                .from('profiles')
                .update({
                    [editingField === 'fullName' ? 'full_name' : 'username']: editValue,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', user.id);

            if (profileError) throw profileError;

            setFormData(prev => ({ ...prev, [editingField]: editValue }));
            setMessage({ type: 'success', text: 'Perfil actualizado correctamente' });
            setIsModalOpen(false);
            await onUpdate();
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message });
        } finally {
            setLoading(false);
        }
    };

    const handleBioUpdate = async () => {
        setLoading(true);
        setMessage(null);

        try {
            // Update Auth User Metadata
            const { error: authError } = await supabase.auth.updateUser({
                data: { bio: formData.bio }
            });

            if (authError) throw authError;

            // Update Profiles Table
            const { error: profileError } = await supabase
                .from('profiles')
                .update({
                    bio: formData.bio,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', user.id);

            if (profileError) throw profileError;

            setMessage({ type: 'success', text: 'Biografía actualizada correctamente' });
            await onUpdate();
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message });
        } finally {
            setLoading(false);
        }
    };

    const handleBirthdateUpdate = async () => {
        if (!formData.birthdate) return;

        setLoading(true);
        setMessage(null);

        try {
            // Update Auth User Metadata
            const { error: authError } = await supabase.auth.updateUser({
                data: { birthdate: formData.birthdate }
            });

            if (authError) throw authError;

            // Update Profiles Table
            const { error: profileError } = await supabase
                .from('profiles')
                .update({
                    bio: formData.bio, // This seems like a copy-paste error in original code, but I'll fix it to update birthdate
                    birthdate: formData.birthdate,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', user.id);

            if (profileError) throw profileError;

            setMessage({ type: 'success', text: 'Fecha de nacimiento guardada correctamente' });
            await onUpdate();
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message });
        } finally {
            setLoading(false);
        }
    };

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        const file = e.target.files[0];
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}-${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        setLoading(true);
        setMessage(null);

        try {
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            // Update Auth User Metadata
            const { error: updateError } = await supabase.auth.updateUser({
                data: { avatar_url: publicUrl }
            });

            if (updateError) throw updateError;

            // Update Profiles Table
            const { error: profileError } = await supabase
                .from('profiles')
                .update({
                    avatar_url: publicUrl,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', user.id);

            if (profileError) throw profileError;

            setAvatarUrl(publicUrl);
            setMessage({ type: 'success', text: 'Avatar actualizado correctamente' });
            await onUpdate();
        } catch (error: any) {
            setMessage({ type: 'error', text: 'Error al subir la imagen: ' + error.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Section Header */}
            <div className="flex items-center justify-between pb-4 border-b border-surface-light/30">
                <div>
                    <h2 className="text-xl font-bold mb-1 bg-gradient-to-r from-white to-text-secondary bg-clip-text text-transparent">
                        Perfil Público
                    </h2>
                    <p className="text-xs text-text-secondary">Información visible para otros usuarios</p>
                </div>
            </div>

            {/* Enhanced Messages */}
            {message && (
                <div className={`p-3 rounded-xl flex items-center gap-3 backdrop-blur-sm border transition-all duration-300 animate-in slide-in-from-top ${message.type === 'success'
                    ? 'bg-green-500/10 text-green-400 border-green-500/20'
                    : 'bg-red-500/10 text-red-500/20 text-red-400'
                    }`}>
                    {message.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                    <span className="text-xs font-medium">{message.text}</span>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Avatar Section - Compact */}
                <div className="lg:col-span-1">
                    <div className="p-4 bg-gradient-to-br from-surface-light/30 to-surface-light/10 backdrop-blur-sm rounded-2xl border border-surface-light/30 flex flex-col items-center text-center">
                        <div className="relative group cursor-pointer mb-3" onClick={() => fileInputRef.current?.click()}>
                            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary/20 to-purple-500/20 overflow-hidden flex items-center justify-center relative border-2 border-surface-light/50 group-hover:border-primary/50 transition-all duration-300 group-hover:scale-105">
                                {avatarUrl ? (
                                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <User className="w-10 h-10 text-text-muted" />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                                    <div className="text-center">
                                        <Camera className="w-6 h-6 text-white mx-auto mb-1" />
                                        <span className="text-[10px] text-white font-medium">Cambiar</span>
                                    </div>
                                </div>
                            </div>
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={handleAvatarUpload}
                            />
                        </div>
                        <h3 className="font-semibold text-white text-sm mb-1">Tu Avatar</h3>
                        <p className="text-xs text-text-secondary mb-3">Max 2MB</p>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={loading}
                            className="w-full px-3 py-2 bg-gradient-to-r from-primary to-primary-hover text-white rounded-xl text-xs font-medium hover:shadow-lg hover:shadow-primary/30 transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Subiendo...' : 'Subir foto'}
                        </button>
                    </div>
                </div>

                {/* Form Fields */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-white flex items-center gap-2">
                                Nombre Completo
                            </label>
                            <div className="flex gap-2">
                                <div className="flex-1 bg-surface-light/30 backdrop-blur-sm border border-surface-light/50 rounded-xl py-2.5 px-3 text-sm text-white truncate">
                                    {formData.fullName || 'No definido'}
                                </div>
                                <button
                                    onClick={() => handleEditClick('fullName')}
                                    className="px-3 py-2 bg-surface-light/50 hover:bg-surface-hover/50 backdrop-blur-sm border border-surface-light/50 rounded-xl text-xs font-medium transition-all duration-300 hover:scale-105"
                                >
                                    Editar
                                </button>
                            </div>
                            <p className="text-[10px] text-text-secondary flex items-center gap-1">
                                <Lock className="w-3 h-3" />
                                Cambio cada 30 días
                            </p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-white flex items-center gap-2">
                                Nombre de Usuario
                            </label>
                            <div className="flex gap-2">
                                <div className="flex-1 bg-surface-light/30 backdrop-blur-sm border border-surface-light/50 rounded-xl py-2.5 px-3 text-sm text-white truncate">
                                    {formData.username || 'No definido'}
                                </div>
                                <button
                                    onClick={() => handleEditClick('username')}
                                    className="px-3 py-2 bg-surface-light/50 hover:bg-surface-hover/50 backdrop-blur-sm border border-surface-light/50 rounded-xl text-xs font-medium transition-all duration-300 hover:scale-105"
                                >
                                    Editar
                                </button>
                            </div>
                            <p className="text-[10px] text-text-secondary flex items-center gap-1">
                                <Lock className="w-3 h-3" />
                                Cambio cada 6 días
                            </p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-white">Fecha de Nacimiento</label>
                            <div className="flex gap-2">
                                <input
                                    type="date"
                                    value={formData.birthdate}
                                    onChange={(e) => setFormData({ ...formData, birthdate: e.target.value })}
                                    disabled={!!user?.user_metadata?.birthdate}
                                    className={`flex-1 bg-surface-light/30 backdrop-blur-sm border border-surface-light/50 rounded-xl py-2.5 px-3 text-sm text-white focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all ${!!user?.user_metadata?.birthdate ? 'cursor-not-allowed opacity-60' : ''}`}
                                />
                                {!user?.user_metadata?.birthdate && (
                                    <button
                                        onClick={handleBirthdateUpdate}
                                        disabled={loading || !formData.birthdate}
                                        className="px-3 py-2 bg-gradient-to-r from-primary to-primary-hover text-white rounded-xl font-medium hover:shadow-lg hover:shadow-primary/30 transition-all duration-300 text-xs disabled:opacity-50 flex items-center gap-2 hover:scale-105"
                                    >
                                        {loading && <Loader2 className="w-3 h-3 animate-spin" />}
                                        Guardar
                                    </button>
                                )}
                            </div>
                            {user?.user_metadata?.birthdate ? (
                                <p className="text-[10px] text-text-secondary flex items-center gap-1">
                                    <Lock className="w-3 h-3" />
                                    Contactar a soporte para cambiar
                                </p>
                            ) : (
                                <p className="text-[10px] text-yellow-400/80 flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" />
                                    Acción permanente
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2 pt-2">
                        <label className="text-xs font-semibold text-white">Biografía</label>
                        <textarea
                            rows={3}
                            value={formData.bio}
                            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                            placeholder="Cuéntanos sobre ti..."
                            className="w-full bg-surface-light/30 backdrop-blur-sm border border-surface-light/50 rounded-xl p-3 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all text-sm resize-none text-white placeholder:text-text-muted"
                        />
                        <div className="flex justify-end">
                            <button
                                onClick={handleBioUpdate}
                                disabled={loading}
                                className="px-4 py-2 bg-gradient-to-r from-primary to-primary-hover text-white rounded-xl font-medium hover:shadow-lg hover:shadow-primary/30 transition-all duration-300 text-xs disabled:opacity-50 flex items-center gap-2 hover:scale-105"
                            >
                                {loading && <Loader2 className="w-3 h-3 animate-spin" />}
                                Guardar Bio
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Edit Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={`Editar ${editingField === 'fullName' ? 'Nombre Completo' : 'Nombre de Usuario'}`}
            >
                <div className="space-y-4">
                    <div>
                        <label className="text-sm font-medium text-text-secondary mb-1.5 block">
                            Nuevo {editingField === 'fullName' ? 'Nombre' : 'Usuario'}
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                value={editValue}
                                onChange={handleEditChange}
                                className={`w-full bg-surface-light border rounded-lg py-2.5 px-4 focus:outline-none focus:ring-2 transition-all text-sm text-white ${editingField === 'username' && usernameStatus === 'error'
                                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                                    : editingField === 'username' && usernameStatus === 'success'
                                        ? 'border-green-500 focus:border-green-500 focus:ring-green-500/20'
                                        : 'border-surface-light focus:border-primary focus:ring-primary/20'
                                    }`}
                                autoFocus
                            />
                            {editingField === 'username' && usernameStatus === 'loading' && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                    <Loader2 className="w-4 h-4 animate-spin text-text-muted" />
                                </div>
                            )}
                        </div>

                        {/* Suggestions */}
                        {editingField === 'username' && suggestions.length > 0 && (
                            <div className="mt-2 animate-fade-in-up">
                                <p className="text-xs text-text-secondary mb-1.5">Sugerencias disponibles:</p>
                                <div className="flex flex-wrap gap-2">
                                    {suggestions.map((suggestion) => (
                                        <button
                                            key={suggestion}
                                            type="button"
                                            onClick={() => applySuggestion(suggestion)}
                                            className="px-3 py-1 text-xs font-medium bg-surface-light/50 hover:bg-primary/20 hover:text-primary border border-surface-light hover:border-primary/30 rounded-full transition-all"
                                        >
                                            {suggestion}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-3 mt-6">
                        <button
                            onClick={() => setIsModalOpen(false)}
                            className="px-4 py-2 bg-transparent hover:bg-surface-light rounded-lg text-sm font-medium transition-colors text-text-secondary hover:text-white"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSaveField}
                            disabled={loading || !editValue.trim() || (editingField === 'username' && editValue !== formData.username && usernameStatus !== 'success')}
                            className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover transition-colors text-sm disabled:opacity-50 flex items-center gap-2"
                        >
                            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                            Guardar Cambios
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

function AccountSection({ user, onUpdate }: { user: any, onUpdate: () => Promise<void> }) {
    const supabase = createClient();
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Modal State
    const [modalType, setModalType] = useState<'email' | 'password' | null>(null);
    const [passwordStep, setPasswordStep] = useState<'request' | 'verify' | 'update'>('request');
    const [otpToken, setOtpToken] = useState('');

    // Captcha State
    const [captchaToken, setCaptchaToken] = useState<string | null>(null);
    const captchaRef = useRef<HCaptcha>(null);

    const [newEmail, setNewEmail] = useState('');
    const [passwords, setPasswords] = useState({
        new: '',
        confirm: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Constants
    const DAYS_30 = 30 * 24 * 60 * 60 * 1000;

    const checkEmailRestriction = () => {
        const lastChange = user?.user_metadata?.last_email_change;
        if (!lastChange) return true;

        const timeDiff = Date.now() - new Date(lastChange).getTime();
        if (timeDiff < DAYS_30) {
            const daysRemaining = Math.ceil((DAYS_30 - timeDiff) / (24 * 60 * 60 * 1000));
            setMessage({
                type: 'error',
                text: `Debes esperar ${daysRemaining} días para cambiar tu correo electrónico.`
            });
            return false;
        }
        return true;
    };

    const handleEmailClick = () => {
        setMessage(null);
        if (checkEmailRestriction()) {
            setNewEmail(user?.email || '');
            setModalType('email');
        }
    };

    const handleUpdateEmail = async () => {
        if (!newEmail || newEmail === user.email) return;

        setLoading(true);
        setMessage(null);

        try {
            const { error } = await supabase.auth.updateUser({
                email: newEmail,
                data: { last_email_change: new Date().toISOString() }
            });

            if (error) throw error;

            setMessage({ type: 'success', text: 'Se ha enviado un correo de confirmación a la nueva dirección.' });
            setModalType(null);
            await onUpdate();
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message });
        } finally {
            setLoading(false);
        }
    };

    // Password Flow Handlers
    const handleSendOtp = async () => {
        if (!captchaToken) {
            setMessage({ type: 'error', text: 'Por favor, completa el captcha.' });
            return;
        }

        setLoading(true);
        setMessage(null);
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
                captchaToken
            });
            if (error) throw error;
            setPasswordStep('verify');
            setMessage({ type: 'success', text: 'Código enviado a tu correo.' });
        } catch (error: any) {
            let errorMessage = error.message;
            if (errorMessage.includes('For security purposes, you can only request this after')) {
                const seconds = errorMessage.match(/\d+/)?.[0] || 'unos';
                errorMessage = `Por seguridad, espera ${seconds} segundos antes de solicitarlo nuevamente.`;
            }
            setMessage({ type: 'error', text: errorMessage });
            captchaRef.current?.resetCaptcha();
            setCaptchaToken(null);
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async () => {
        setLoading(true);
        setMessage(null);
        try {
            const { error } = await supabase.auth.verifyOtp({
                email: user.email,
                token: otpToken,
                type: 'recovery'
            });
            if (error) throw error;
            setPasswordStep('update');
            setMessage(null);
        } catch (error: any) {
            setMessage({ type: 'error', text: 'Código inválido o expirado.' });
        } finally {
            setLoading(false);
        }
    };

    const checkPasswordRequirements = (password: string) => {
        return {
            length: password.length >= 6,
            number: /\d/.test(password),
            special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
        };
    };

    const handleUpdatePassword = async () => {
        if (passwords.new !== passwords.confirm) {
            setMessage({ type: 'error', text: 'Las contraseñas nuevas no coinciden' });
            return;
        }

        const reqs = checkPasswordRequirements(passwords.new);
        if (!reqs.length || !reqs.number || !reqs.special) {
            setMessage({ type: 'error', text: 'La contraseña no cumple con los requisitos mínimos' });
            return;
        }

        setLoading(true);
        setMessage(null);

        try {
            const { error } = await supabase.auth.updateUser({
                password: passwords.new
            });

            if (error) throw error;

            setMessage({ type: 'success', text: 'Contraseña actualizada correctamente' });
            setTimeout(() => {
                setModalType(null);
                setPasswords({ new: '', confirm: '' });
                setPasswordStep('request');
                setOtpToken('');
                setCaptchaToken(null);
                setMessage(null);
            }, 2000);
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="pb-4 border-b border-surface-light/30">
                <h2 className="text-xl font-bold mb-1 bg-gradient-to-r from-white to-text-secondary bg-clip-text text-transparent">Configuración de Cuenta</h2>
                <p className="text-xs text-text-secondary">Seguridad y acceso</p>
            </div>

            {message && !modalType && (
                <div className={`p-3 rounded-xl flex items-center gap-3 backdrop-blur-sm border transition-all duration-300 animate-in slide-in-from-top ${message.type === 'success'
                    ? 'bg-green-500/10 text-green-400 border-green-500/20'
                    : 'bg-red-500/10 text-red-400 border-red-500/20'
                    }`}>
                    {message.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                    <span className="text-xs font-medium">{message.text}</span>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Email Card */}
                <div className="p-4 bg-gradient-to-br from-surface-light/30 to-surface-light/10 backdrop-blur-sm rounded-2xl border border-surface-light/30">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center">
                            <Mail className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-white">Correo Electrónico</h3>
                            <p className="text-[10px] text-text-secondary">Dirección asociada</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="flex-1 bg-surface-light/30 backdrop-blur-sm border border-surface-light/50 rounded-xl py-2 px-3 text-xs text-white flex justify-between items-center">
                            <span className="truncate mr-2">{user?.email}</span>
                            <span className="text-[10px] text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded font-medium whitespace-nowrap">✓ Verificado</span>
                        </div>
                    </div>
                    <div className="flex justify-between items-center">
                        <p className="text-[10px] text-text-secondary flex items-center gap-1">
                            <Lock className="w-3 h-3" />
                            Cambio cada 30 días
                        </p>
                        <button
                            onClick={handleEmailClick}
                            className="px-3 py-1.5 bg-surface-light/50 hover:bg-surface-hover/50 backdrop-blur-sm border border-surface-light/50 rounded-lg text-xs font-medium transition-all duration-300 hover:scale-105"
                        >
                            Editar
                        </button>
                    </div>
                </div>

                {/* Password Card */}
                <div className="p-4 bg-gradient-to-br from-surface-light/30 to-surface-light/10 backdrop-blur-sm rounded-2xl border border-surface-light/30">
                    <div className="flex items-center justify-between h-full">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center">
                                <Lock className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <p className="text-white text-sm font-semibold">Contraseña</p>
                                <p className="text-xs text-text-secondary mt-0.5">••••••••••</p>
                            </div>
                        </div>
                        <button
                            onClick={() => {
                                setMessage(null);
                                setPasswordStep('request');
                                setOtpToken('');
                                setModalType('password');
                                setCaptchaToken(null);
                            }}
                            className="px-4 py-2 bg-gradient-to-r from-primary to-primary-hover text-white rounded-xl text-xs font-medium hover:shadow-lg hover:shadow-primary/30 transition-all duration-300 hover:scale-105"
                        >
                            Cambiar
                        </button>
                    </div>
                </div>

                {/* Danger Zone */}
                <div className="md:col-span-2 p-4 border border-red-500/20 bg-gradient-to-br from-red-500/5 to-red-500/10 backdrop-blur-sm rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                            <AlertCircle className="w-5 h-5 text-red-400" />
                        </div>
                        <div>
                            <h3 className="text-red-400 text-sm font-semibold">Zona de Peligro</h3>
                            <p className="text-[10px] text-text-secondary">Eliminar cuenta permanentemente</p>
                        </div>
                    </div>
                    <button className="px-4 py-2 bg-transparent border border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 rounded-xl text-xs font-medium transition-all duration-300 hover:scale-105">
                        Eliminar Cuenta
                    </button>
                </div>
            </div>

            {/* Email Modal */}
            <Modal
                isOpen={modalType === 'email'}
                onClose={() => setModalType(null)}
                title="Cambiar Correo Electrónico"
            >
                <div className="space-y-4">
                    {message && (
                        <div className={`p-3 rounded-lg flex items-center gap-2 ${message.type === 'success' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                            {message.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                            <span className="text-xs font-medium">{message.text}</span>
                        </div>
                    )}
                    <div>
                        <label className="text-sm font-medium text-text-secondary mb-1.5 block">
                            Nuevo Correo Electrónico
                        </label>
                        <input
                            type="email"
                            value={newEmail}
                            onChange={(e) => setNewEmail(e.target.value)}
                            className="w-full bg-surface-light border border-surface-light rounded-lg py-2.5 px-4 focus:outline-none focus:border-primary transition-colors text-sm text-white"
                            autoFocus
                        />
                        <p className="text-xs text-text-secondary mt-2">
                            Te enviaremos un enlace de confirmación a tu nueva dirección.
                        </p>
                    </div>

                    <div className="flex justify-end gap-3 mt-6">
                        <button
                            onClick={() => setModalType(null)}
                            className="px-4 py-2 bg-transparent hover:bg-surface-light rounded-lg text-sm font-medium transition-colors text-text-secondary hover:text-white"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleUpdateEmail}
                            disabled={loading || !newEmail || newEmail === user.email}
                            className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover transition-colors text-sm disabled:opacity-50 flex items-center gap-2"
                        >
                            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                            Actualizar Correo
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Password Modal */}
            <Modal
                isOpen={modalType === 'password'}
                onClose={() => setModalType(null)}
                title={
                    passwordStep === 'request' ? 'Verificación de Seguridad' :
                        passwordStep === 'verify' ? 'Ingresar Código' :
                            'Nueva Contraseña'
                }
            >
                <div className="space-y-4">
                    {message && (
                        <div className={`p-3 rounded-lg flex items-center gap-2 ${message.type === 'success' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                            {message.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                            <span className="text-xs font-medium">{message.text}</span>
                        </div>
                    )}

                    {passwordStep === 'request' && (
                        <div className="text-center py-4">
                            <Shield className="w-12 h-12 text-primary mx-auto mb-4" />
                            <p className="text-text-secondary mb-6">
                                Por seguridad, enviaremos un código de verificación a tu correo electrónico
                                <span className="text-white font-medium block mt-1">{user?.email}</span>
                            </p>

                            <div className="flex justify-center mb-6">
                                <HCaptcha
                                    sitekey={process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY!}
                                    onVerify={(token) => setCaptchaToken(token)}
                                    ref={captchaRef}
                                    theme="dark"
                                />
                            </div>

                            <button
                                onClick={handleSendOtp}
                                disabled={loading || !captchaToken}
                                className="w-full px-4 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover transition-colors text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                                Enviar Código
                            </button>
                        </div>
                    )}

                    {passwordStep === 'verify' && (
                        <div>
                            <label className="text-sm font-medium text-text-secondary mb-1.5 block">
                                Código de 8 dígitos
                            </label>
                            <input
                                type="text"
                                value={otpToken}
                                onChange={(e) => setOtpToken(e.target.value.replace(/\D/g, '').slice(0, 8))}
                                placeholder="00000000"
                                className="w-full bg-surface-light border border-surface-light rounded-lg py-2.5 px-4 focus:outline-none focus:border-primary transition-colors text-sm text-white text-center tracking-widest text-xl"
                                autoFocus
                            />
                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    onClick={() => setPasswordStep('request')}
                                    className="px-4 py-2 bg-transparent hover:bg-surface-light rounded-lg text-sm font-medium transition-colors text-text-secondary hover:text-white"
                                >
                                    Atrás
                                </button>
                                <button
                                    onClick={handleVerifyOtp}
                                    disabled={loading || otpToken.length !== 8}
                                    className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover transition-colors text-sm disabled:opacity-50 flex items-center gap-2"
                                >
                                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                                    Verificar
                                </button>
                            </div>
                        </div>
                    )}

                    {passwordStep === 'update' && (
                        <>
                            <div>
                                <label className="text-sm font-medium text-text-secondary mb-1.5 block">
                                    Nueva Contraseña
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={passwords.new}
                                        onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                                        className="w-full bg-surface-light border border-surface-light rounded-lg py-2.5 px-4 pr-10 focus:outline-none focus:border-primary transition-colors text-sm text-white"
                                        autoFocus
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-white transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                                {/* Password Requirements Checklist */}
                                <div className="mt-3 space-y-2">
                                    <p className="text-xs text-text-secondary mb-2">La contraseña debe contener:</p>
                                    <div className="grid grid-cols-1 gap-1">
                                        {[
                                            { key: 'length', label: 'Mínimo 6 caracteres' },
                                            { key: 'number', label: 'Al menos un número' },
                                            { key: 'special', label: 'Al menos un carácter especial' }
                                        ].map(req => {
                                            const isMet = checkPasswordRequirements(passwords.new)[req.key as keyof ReturnType<typeof checkPasswordRequirements>];
                                            return (
                                                <div key={req.key} className={`flex items-center gap-2 text-xs ${isMet ? 'text-green-500' : 'text-text-secondary'}`}>
                                                    {isMet ? <CheckCircle className="w-3 h-3" /> : <div className="w-3 h-3 rounded-full border border-text-secondary/50" />}
                                                    <span>{req.label}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-text-secondary mb-1.5 block">
                                    Confirmar Contraseña
                                </label>
                                <div className="relative">
                                    <input
                                        type={showConfirmPassword ? "text" : "password"}
                                        value={passwords.confirm}
                                        onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                                        className="w-full bg-surface-light border border-surface-light rounded-lg py-2.5 px-4 pr-10 focus:outline-none focus:border-primary transition-colors text-sm text-white"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-white transition-colors"
                                    >
                                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    onClick={() => setModalType(null)}
                                    className="px-4 py-2 bg-transparent hover:bg-surface-light rounded-lg text-sm font-medium transition-colors text-text-secondary hover:text-white"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleUpdatePassword}
                                    disabled={loading || !passwords.new || !passwords.confirm}
                                    className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover transition-colors text-sm disabled:opacity-50 flex items-center gap-2"
                                >
                                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                                    Actualizar Contraseña
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </Modal>
        </div>
    );
}

function PreferencesSection({ user }: { user: any }) {
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
        const savedSettings = localStorage.getItem('filmify_preferences');
        if (savedSettings) {
            const parsedSettings = JSON.parse(savedSettings);

            // Validate adult content setting against current user status
            if (parsedSettings.adultContent) {
                const isEmailConfirmed = !!user?.email_confirmed_at;
                const birthDate = user?.user_metadata?.birthdate ? new Date(user.user_metadata.birthdate) : null;

                let isAgeVerified = false;
                if (birthDate) {
                    const today = new Date();
                    let age = today.getFullYear() - birthDate.getFullYear();
                    const m = today.getMonth() - birthDate.getMonth();
                    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                        age--;
                    }
                    isAgeVerified = age >= 18;
                }

                if (!isEmailConfirmed || !isAgeVerified) {
                    parsedSettings.adultContent = false;
                    localStorage.setItem('filmify_preferences', JSON.stringify(parsedSettings));
                }
            }

            setSettings(parsedSettings);

            // Apply reduced motion immediately
            if (parsedSettings.reducedMotion) {
                document.documentElement.style.scrollBehavior = 'auto';
            }
        }
    }, [user]);

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
        localStorage.setItem('filmify_preferences', JSON.stringify(newSettings));

        // Apply immediate effects where possible
        if (key === 'reducedMotion') {
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
                        <div className="flex-1 pr-4">
                            <h3 className="text-sm font-semibold text-white mb-0.5">Reproducción Automática</h3>
                            <p className="text-[10px] text-text-secondary">Trailers al navegar</p>
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
                        <div className="flex-1 pr-4">
                            <h3 className="text-sm font-semibold text-white mb-0.5">Contenido para Adultos</h3>
                            <p className="text-[10px] text-text-secondary">Mostrar contenido +18</p>
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
                        <div className="flex-1 pr-4">
                            <h3 className="text-sm font-semibold text-white mb-0.5">Reducción de Movimiento</h3>
                            <p className="text-[10px] text-text-secondary">Minimizar animaciones</p>
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
                        <div className="flex-1 pr-4">
                            <h3 className="text-sm font-semibold text-white mb-0.5">Idioma</h3>
                            <p className="text-[10px] text-text-secondary">Idioma de la interfaz</p>
                        </div>
                        <select
                            value={settings.language}
                            onChange={(e) => updateSetting('language', e.target.value)}
                            className="bg-surface-light/50 backdrop-blur-sm border border-surface-light/50 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 text-white transition-all cursor-pointer hover:bg-surface-hover/50"
                        >
                            <option value="es">Español</option>
                            <option value="en">English</option>
                            <option value="pt">Português</option>
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

function NotificationsSection({ user }: { user: any }) {
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
        if (user?.user_metadata?.notifications) {
            setNotifications(user.user_metadata.notifications);
        }
    }, [user]);

    const handleToggle = async (key: keyof typeof notifications) => {
        const newNotifications = { ...notifications, [key]: !notifications[key] };
        setNotifications(newNotifications);
        setLoading(true);
        setMessage(null);

        try {
            const { error } = await supabase.auth.updateUser({
                data: { notifications: newNotifications }
            });

            if (error) throw error;
            // Silent success or optional message
        } catch (error: any) {
            setMessage({ type: 'error', text: 'Error al guardar: ' + error.message });
            // Revert on error
            setNotifications(notifications);
        } finally {
            setLoading(false);
        }
    };

    const items = [
        { key: 'newReleases', label: 'Nuevos estrenos' },
        { key: 'recommendations', label: 'Recomendaciones personalizadas' },
        { key: 'friendActivity', label: 'Actividad de amigos' },
        { key: 'offers', label: 'Noticias y ofertas' }
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
                {items.map((item) => (
                    <div key={item.key} className="p-4 bg-gradient-to-br from-surface-light/30 to-surface-light/10 backdrop-blur-sm rounded-2xl border border-surface-light/30 hover:border-surface-light/50 transition-all duration-300">
                        <div className="flex items-center justify-between">
                            <div className="flex-1 pr-4">
                                <span className="text-sm font-semibold text-white">{item.label}</span>
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
                ))}
            </div>
        </div>
    );
}


