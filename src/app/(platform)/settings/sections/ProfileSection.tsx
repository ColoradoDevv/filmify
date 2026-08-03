'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { User, Camera, Lock, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Modal from '@/components/ui/Modal';

export function ProfileSection({ user, onUpdate }: { user: any, onUpdate: () => Promise<void> }) {
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

    // Sync username/fullName from profiles table in case user_metadata is stale
    useEffect(() => {
        if (!user?.id) return;
        supabase
            .from('profiles')
            .select('username, full_name, bio')
            .eq('id', user.id)
            .single()
            .then(({ data }: { data: { username?: string; full_name?: string; bio?: string } | null }) => {
                if (!data) return;
                setFormData(prev => ({
                    ...prev,
                    username: data.username || prev.username,
                    fullName: data.full_name || prev.fullName,
                    bio: data.bio || prev.bio,
                }));
            });
    }, [user?.id]);
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
