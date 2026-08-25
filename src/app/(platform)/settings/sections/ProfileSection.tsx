'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { AtSign, CalendarDays, Camera, Check, IdCard, Loader2, Pencil, User, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Modal from '@/components/ui/Modal';
import {
    SettingsPanel, SettingRow, ReadonlyValue, Button, TextField, StatusBanner, type StatusMessage,
} from '../components/ui';

const DAY_MS = 24 * 60 * 60 * 1000;
const COOLDOWNS = { fullName: 30 * DAY_MS, username: 6 * DAY_MS };
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BIO = 280;

/** Nombres reservados u ofensivos que no pueden usarse como usuario. */
const BLACKLIST = [
    'admin', 'administrator', 'root', 'sysadmin', 'system', 'support', 'help', 'mod', 'moderator',
    'staff', 'official', 'filmify', 'owner', 'ceo', 'webmaster', 'dev', 'developer',
    'puto', 'puta', 'mierda', 'cabron', 'pendejo', 'verga', 'pito', 'culo', 'coño',
    'mamaguevo', 'zorra', 'perra', 'maricon', 'marica', 'idiota', 'estupido', 'imbecil',
    'bastardo', 'polla', 'semen', 'tetas', 'vagina', 'concha', 'chupala', 'gonorrea',
    'malparido', 'carechimba', 'pajero', 'pajera',
    'dick', 'ass', 'bitch', 'fuck', 'shit', 'bastard', 'cunt', 'whore', 'slut',
    'nigger', 'nigga', 'faggot', 'rape', 'sex', 'porn', 'cock', 'pussy', 'tit', 'boob',
    'anus', 'anal', 'nazi', 'hitler', 'kkk',
];

type EditableField = 'fullName' | 'username';
type NameStatus = 'idle' | 'checking' | 'ok' | 'taken' | 'blocked' | 'short';

/**
 * Perfil público: avatar, nombre, usuario, biografía y fecha de nacimiento.
 *
 * Nombre y usuario tienen ventana de espera (30 y 6 días) para que nadie
 * suplante a otro cambiándose el nombre a diario. El usuario además se valida
 * contra una lista de reservados y contra los que ya existen.
 */
export function ProfileSection({ user, onUpdate }: { user: any; onUpdate: () => Promise<void> }) {
    const supabase = createClient();
    const [message, setMessage] = useState<StatusMessage | null>(null);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);

    const [profile, setProfile] = useState({
        fullName: user?.user_metadata?.full_name ?? '',
        username: user?.user_metadata?.username ?? '',
        bio: user?.user_metadata?.bio ?? '',
        birthdate: user?.user_metadata?.birthdate ?? '',
    });
    const [avatarUrl, setAvatarUrl] = useState<string>(user?.user_metadata?.avatar_url ?? '');
    const [bioDraft, setBioDraft] = useState(profile.bio);

    const [editing, setEditing] = useState<EditableField | null>(null);
    const [draft, setDraft] = useState('');
    const [status, setStatus] = useState<NameStatus>('idle');
    const [suggestions, setSuggestions] = useState<string[]>([]);

    const fileRef = useRef<HTMLInputElement>(null);
    const checkRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // `profiles` manda sobre `user_metadata`: es la tabla que leen el resto de
    // pantallas, y los metadatos de Auth pueden quedarse atrás.
    useEffect(() => {
        if (!user?.id) return;
        let alive = true;
        supabase
            .from('profiles')
            .select('username, full_name, bio')
            .eq('id', user.id)
            .single()
            .then(({ data }: { data: { username?: string; full_name?: string; bio?: string } | null }) => {
                if (!alive || !data) return;
                setProfile((prev) => ({
                    ...prev,
                    username: data.username || prev.username,
                    fullName: data.full_name || prev.fullName,
                    bio: data.bio ?? prev.bio,
                }));
                setBioDraft(data.bio ?? '');
            });
        return () => { alive = false; };
    }, [supabase, user?.id]);

    const cooldownDays = useCallback((field: EditableField) => {
        const last = user?.user_metadata?.[`last_${field}_change`];
        if (!last) return 0;
        const elapsed = Date.now() - new Date(last).getTime();
        if (elapsed >= COOLDOWNS[field]) return 0;
        return Math.ceil((COOLDOWNS[field] - elapsed) / DAY_MS);
    }, [user?.user_metadata]);

    const isUsernameFree = useCallback(async (name: string) => {
        const { data, error } = await supabase
            .from('profiles')
            .select('id')
            .eq('username', name)
            .neq('id', user.id)
            .maybeSingle();
        // Ante un error de red no afirmamos que está libre: se trata como
        // ocupado para no dejar que dos cuentas acaben con el mismo usuario.
        if (error) return false;
        return !data;
    }, [supabase, user?.id]);

    const buildSuggestions = useCallback(async (base: string, blocked: boolean) => {
        const rand = () => Math.floor(Math.random() * 1000);
        const seeds = blocked
            ? ['Cinefilo', 'Cinefila', 'ButacaLibre', 'Palomitas'].map((p) => `${p}_${rand()}`)
            : [`${base}_${rand()}`, `${base}${rand()}`, `el${base}`];
        const free: string[] = [];
        for (const s of seeds) {
            if (await isUsernameFree(s)) free.push(s);
            if (free.length >= 3) break;
        }
        return free;
    }, [isUsernameFree]);

    const validateUsername = useCallback(async (value: string) => {
        if (value === profile.username) { setStatus('idle'); setSuggestions([]); return; }
        if (value.length < 3) { setStatus('short'); setSuggestions([]); return; }

        setStatus('checking');
        const lower = value.toLowerCase();
        if (BLACKLIST.some((w) => lower.includes(w))) {
            setStatus('blocked');
            setSuggestions(await buildSuggestions(value, true));
            return;
        }
        if (!(await isUsernameFree(value))) {
            setStatus('taken');
            setSuggestions(await buildSuggestions(value, false));
            return;
        }
        setStatus('ok');
        setSuggestions([]);
    }, [buildSuggestions, isUsernameFree, profile.username]);

    const onDraftChange = (value: string) => {
        setDraft(value);
        if (editing !== 'username') return;
        if (checkRef.current) clearTimeout(checkRef.current);
        if (value.length === 0 || value === profile.username) { setStatus('idle'); setSuggestions([]); return; }
        if (value.length < 3) { setStatus('short'); setSuggestions([]); return; }
        setStatus('checking');
        checkRef.current = setTimeout(() => void validateUsername(value), 450);
    };

    const openEditor = (field: EditableField) => {
        setMessage(null);
        const days = cooldownDays(field);
        if (days > 0) {
            setMessage({
                type: 'error',
                text: `Podrás cambiar tu ${field === 'fullName' ? 'nombre' : 'usuario'} dentro de ${days} día${days === 1 ? '' : 's'}.`,
            });
            return;
        }
        setEditing(field);
        setDraft(profile[field]);
        setStatus('idle');
        setSuggestions([]);
    };

    const saveField = useCallback(async () => {
        if (!editing) return;
        const value = draft.trim();
        if (!value) return;
        if (editing === 'username' && value !== profile.username && status !== 'ok') return;

        const column = editing === 'fullName' ? 'full_name' : 'username';
        setLoading(true);
        setMessage(null);
        try {
            const { error: authError } = await supabase.auth.updateUser({
                data: { [column]: value, [`last_${editing}_change`]: new Date().toISOString() },
            });
            if (authError) throw authError;

            const { error: dbError } = await supabase
                .from('profiles')
                .update({ [column]: value, updated_at: new Date().toISOString() })
                .eq('id', user.id);
            if (dbError) throw dbError;

            setProfile((p) => ({ ...p, [editing]: value }));
            setEditing(null);
            setMessage({ type: 'success', text: 'Perfil actualizado.' });
            await onUpdate();
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message ?? 'No se pudo guardar' });
        } finally {
            setLoading(false);
        }
    }, [draft, editing, onUpdate, profile.username, status, supabase, user?.id]);

    const saveSimple = useCallback(async (column: 'bio' | 'birthdate', value: string, label: string) => {
        setLoading(true);
        setMessage(null);
        try {
            const { error: authError } = await supabase.auth.updateUser({ data: { [column]: value } });
            if (authError) throw authError;
            const { error: dbError } = await supabase
                .from('profiles')
                .update({ [column]: value, updated_at: new Date().toISOString() })
                .eq('id', user.id);
            if (dbError) throw dbError;
            setProfile((p) => ({ ...p, [column === 'bio' ? 'bio' : 'birthdate']: value }));
            setMessage({ type: 'success', text: `${label} guardada.` });
            await onUpdate();
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message ?? 'No se pudo guardar' });
        } finally {
            setLoading(false);
        }
    }, [onUpdate, supabase, user?.id]);

    const uploadAvatar = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = ''; // permite volver a elegir el mismo archivo
        if (!file) return;

        // Validación en cliente: el bucket la repite del lado del servidor, pero
        // así el error se ve al instante y no tras subir dos megas.
        if (!AVATAR_TYPES.includes(file.type)) {
            setMessage({ type: 'error', text: 'Formato no admitido. Usa JPG, PNG o WebP.' });
            return;
        }
        if (file.size > MAX_AVATAR_BYTES) {
            setMessage({ type: 'error', text: 'La imagen supera los 2 MB.' });
            return;
        }

        setUploading(true);
        setMessage(null);
        try {
            const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
            const path = `${user.id}-${Date.now()}.${ext}`;

            const { error: upErr } = await supabase.storage.from('avatars').upload(path, file);
            if (upErr) throw upErr;

            const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);

            const { error: authError } = await supabase.auth.updateUser({ data: { avatar_url: publicUrl } });
            if (authError) throw authError;

            const { error: dbError } = await supabase
                .from('profiles')
                .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
                .eq('id', user.id);
            if (dbError) throw dbError;

            setAvatarUrl(publicUrl);
            setMessage({ type: 'success', text: 'Foto actualizada.' });
            await onUpdate();
        } catch (error: any) {
            setMessage({ type: 'error', text: `No se pudo subir la imagen: ${error.message ?? ''}`.trim() });
        } finally {
            setUploading(false);
        }
    }, [onUpdate, supabase, user?.id]);

    const usernameHint = useMemo(() => {
        switch (status) {
            case 'short': return { error: 'Mínimo 3 caracteres' };
            case 'taken': return { error: 'Ese usuario ya está cogido' };
            case 'blocked': return { error: 'Ese usuario no está permitido' };
            case 'ok': return { hint: 'Disponible' };
            case 'checking': return { hint: 'Comprobando…' };
            default: return {};
        }
    }, [status]);

    const nameDays = cooldownDays('fullName');
    const userDays = cooldownDays('username');

    return (
        <div className="space-y-4">
            <StatusBanner message={message} />

            <SettingsPanel title="Perfil público" description="Lo que ven otros usuarios de FilmiFy.">
                <SettingRow
                    icon={Camera}
                    label="Foto de perfil"
                    description="JPG, PNG o WebP, hasta 2 MB."
                    control={
                        <div className="flex items-center gap-3">
                            <span className="relative block h-9 w-9 overflow-hidden rounded-full border border-outline-variant bg-surface-container">
                                {avatarUrl ? (
                                    <Image src={avatarUrl} alt="" fill sizes="36px" className="object-cover" unoptimized />
                                ) : (
                                    <span className="flex h-full w-full items-center justify-center">
                                        <User className="h-4 w-4 text-on-surface-variant" aria-hidden />
                                    </span>
                                )}
                            </span>
                            <input
                                ref={fileRef}
                                type="file"
                                accept={AVATAR_TYPES.join(',')}
                                onChange={(e) => void uploadAvatar(e)}
                                className="sr-only"
                            />
                            <Button onClick={() => fileRef.current?.click()} loading={uploading}>
                                Cambiar
                            </Button>
                        </div>
                    }
                />

                <SettingRow
                    icon={IdCard}
                    label="Nombre"
                    description={nameDays > 0 ? `Podrás cambiarlo en ${nameDays} días.` : 'Se puede cambiar una vez cada 30 días.'}
                    control={
                        <div className="flex items-center gap-3">
                            <ReadonlyValue>{profile.fullName || 'Sin definir'}</ReadonlyValue>
                            <Button onClick={() => openEditor('fullName')} disabled={nameDays > 0}>
                                <Pencil className="h-3.5 w-3.5" aria-hidden /> Editar
                            </Button>
                        </div>
                    }
                />

                <SettingRow
                    icon={AtSign}
                    label="Nombre de usuario"
                    description={userDays > 0 ? `Podrás cambiarlo en ${userDays} días.` : 'Identifica tu perfil. Una vez cada 6 días.'}
                    control={
                        <div className="flex items-center gap-3">
                            <ReadonlyValue>{profile.username ? `@${profile.username}` : 'Sin definir'}</ReadonlyValue>
                            <Button onClick={() => openEditor('username')} disabled={userDays > 0}>
                                <Pencil className="h-3.5 w-3.5" aria-hidden /> Editar
                            </Button>
                        </div>
                    }
                />

                <SettingRow
                    icon={CalendarDays}
                    label="Fecha de nacimiento"
                    description={profile.birthdate ? 'Ya guardada. No se puede modificar.' : 'Solo se puede guardar una vez.'}
                    control={
                        profile.birthdate ? (
                            <ReadonlyValue>{profile.birthdate}</ReadonlyValue>
                        ) : (
                            <div className="flex items-center gap-2">
                                <input
                                    type="date"
                                    value={profile.birthdate}
                                    onChange={(e) => setProfile((p) => ({ ...p, birthdate: e.target.value }))}
                                    className="h-8 rounded-lg border border-outline-variant bg-surface-container px-2 text-xs text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40"
                                />
                                <Button
                                    variant="primary"
                                    disabled={!profile.birthdate}
                                    loading={loading}
                                    onClick={() => void saveSimple('birthdate', profile.birthdate, 'Fecha de nacimiento')}
                                >
                                    Guardar
                                </Button>
                            </div>
                        )
                    }
                />
            </SettingsPanel>

            <SettingsPanel
                title="Biografía"
                description="Un par de líneas sobre ti en tu perfil."
                footer={
                    <div className="flex items-center justify-between gap-3">
                        <span className="text-xs text-on-surface-variant">
                            {bioDraft.length}/{MAX_BIO}
                        </span>
                        <Button
                            variant="primary"
                            loading={loading}
                            disabled={bioDraft === profile.bio}
                            onClick={() => void saveSimple('bio', bioDraft, 'Biografía')}
                        >
                            Guardar biografía
                        </Button>
                    </div>
                }
            >
                <div className="px-4 py-3 sm:px-5">
                    <textarea
                        value={bioDraft}
                        maxLength={MAX_BIO}
                        rows={3}
                        onChange={(e) => setBioDraft(e.target.value)}
                        placeholder="Cuéntale a la gente qué te gusta ver."
                        aria-label="Biografía"
                        className="w-full resize-none rounded-lg border border-outline-variant bg-surface-container px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40"
                    />
                </div>
            </SettingsPanel>

            {/* ── Editor de nombre / usuario ───────────────────────────────── */}
            <Modal
                isOpen={editing !== null}
                onClose={() => setEditing(null)}
                title={editing === 'username' ? 'Cambiar nombre de usuario' : 'Cambiar nombre'}
            >
                <div className="space-y-4">
                    <TextField
                        id="profile-draft"
                        label={editing === 'username' ? 'Nombre de usuario' : 'Nombre'}
                        value={draft}
                        onChange={(e) => onDraftChange(e.target.value)}
                        autoComplete="off"
                        {...usernameHint}
                    />

                    {suggestions.length > 0 && (
                        <div>
                            <p className="mb-1.5 text-xs text-on-surface-variant">Sugerencias libres:</p>
                            <div className="flex flex-wrap gap-1.5">
                                {suggestions.map((s) => (
                                    <button
                                        key={s}
                                        type="button"
                                        onClick={() => { setDraft(s); setStatus('ok'); setSuggestions([]); }}
                                        className="rounded-full border border-outline-variant bg-surface-container px-2.5 py-1 text-xs text-on-surface-variant transition-colors hover:border-primary/40 hover:text-on-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex items-center justify-end gap-2">
                        {status === 'checking' && (
                            <Loader2 className="h-4 w-4 animate-spin text-on-surface-variant" aria-hidden />
                        )}
                        {status === 'ok' && <Check className="h-4 w-4 text-emerald-400" aria-hidden />}
                        {(status === 'taken' || status === 'blocked' || status === 'short') && (
                            <X className="h-4 w-4 text-red-400" aria-hidden />
                        )}
                        <Button variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button>
                        <Button
                            variant="primary"
                            loading={loading}
                            disabled={
                                !draft.trim()
                                || (editing === 'username' && draft.trim() !== profile.username && status !== 'ok')
                            }
                            onClick={() => void saveField()}
                        >
                            Guardar
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
