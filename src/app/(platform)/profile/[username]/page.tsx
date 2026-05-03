'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Heart, Users, Loader2, User } from 'lucide-react';

interface ProfilePreferences {
    privacy?: {
        publicProfile?: boolean;
        allowFriendRequests?: boolean;
        showWatchHistory?: boolean;
        showWatchlist?: boolean;
    };
    friends?: string[];
    incomingFriendRequests?: string[];
    outgoingFriendRequests?: string[];
}

interface ProfileDetails {
    id: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
    bio: string | null;
    preferences: ProfilePreferences | null;
}

export default function FriendProfilePage() {
    const router = useRouter();
    const params = useParams();
    const username = typeof params.username === 'string' ? params.username : '';
    const supabase = createClient();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [currentProfilePreferences, setCurrentProfilePreferences] = useState<ProfilePreferences | null>(null);
    const [targetProfile, setTargetProfile] = useState<ProfileDetails | null>(null);
    const [requestState, setRequestState] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle');

    useEffect(() => {
        const loadProfile = async () => {
            setLoading(true);
            setError(null);

            try {
                const { data: authData, error: authError } = await supabase.auth.getUser();
                if (authError || !authData.user) {
                    setError('Debes iniciar sesión para ver este perfil.');
                    return;
                }

                setCurrentUserId(authData.user.id);
                const [{ data: currentProfileData, error: currentProfileError }, { data: targetProfileData, error: targetProfileError }] = await Promise.all([
                    supabase
                        .from('profiles')
                        .select('id, preferences')
                        .eq('id', authData.user.id)
                        .single(),
                    supabase
                        .from('profiles')
                        .select('id, full_name, username, avatar_url, bio, preferences')
                        .eq('username', username)
                        .single(),
                ]);

                if (currentProfileError) {
                    console.error(currentProfileError);
                }
                if (targetProfileError) {
                    console.error(targetProfileError);
                }

                if (!targetProfileData) {
                    setError('No se encontró el perfil solicitado.');
                    return;
                }

                setCurrentProfilePreferences(currentProfileData?.preferences ?? null);
                setTargetProfile(targetProfileData as ProfileDetails);
            } catch (err) {
                console.error(err);
                setError('Ocurrió un error al cargar el perfil.');
            } finally {
                setLoading(false);
            }
        };

        if (username) {
            loadProfile();
        }
    }, [username, supabase]);

    const isOwnProfile = currentUserId === targetProfile?.id;
    const privacy = targetProfile?.preferences?.privacy ?? {};
    const isPrivateProfile = privacy.publicProfile === false;
    const allowFriendRequests = privacy.allowFriendRequests ?? true;
    const friends = targetProfile?.preferences?.friends ?? [];
    const incomingRequests = targetProfile?.preferences?.incomingFriendRequests ?? [];
    const currentFriends = currentProfilePreferences?.friends ?? [];
    const currentOutgoing = currentProfilePreferences?.outgoingFriendRequests ?? [];

    const isFriend = currentUserId && (friends.includes(currentUserId) || currentFriends.includes(targetProfile?.id ?? ''));
    const hasSentRequest = currentUserId && currentOutgoing.includes(targetProfile?.id ?? '');
    const hasIncomingRequest = currentUserId && incomingRequests.includes(currentUserId);

    const canSendRequest = !isOwnProfile && !isFriend && allowFriendRequests && !hasSentRequest && !hasIncomingRequest;
    const requestButtonText = isFriend
        ? 'Ya son amigos'
        : hasIncomingRequest
            ? 'Solicitud entrante'
            : hasSentRequest
                ? 'Solicitud enviada'
                : allowFriendRequests
                    ? 'Enviar solicitud de amistad'
                    : 'No acepta solicitudes';

    const handleSendRequest = async () => {
        if (!currentUserId || !targetProfile?.id || !canSendRequest) {
            return;
        }

        setRequestState('sending');
        try {
            const response = await fetch('/api/friends', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetId: targetProfile.id }),
            });

            const result = await response.json();
            if (!response.ok || result.error) {
                console.error(result);
                setRequestState('failed');
                return;
            }

            setRequestState('sent');
        } catch (err) {
            console.error(err);
            setRequestState('failed');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen pt-24 flex items-center justify-center">
                <div className="text-center text-text-secondary">
                    <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-primary" />
                    <p>Cargando perfil...</p>
                </div>
            </div>
        );
    }

    if (error || !targetProfile) {
        return (
            <div className="min-h-screen pt-24 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center">
                <div className="rounded-3xl border border-surface-light/30 bg-surface-light/10 p-10">
                    <h1 className="text-3xl font-bold mb-4">Perfil no encontrado</h1>
                    <p className="text-text-secondary mb-6">{error || 'No se pudo cargar el perfil indicado.'}</p>
                    <button onClick={() => router.push('/profile')} className="px-6 py-3 rounded-2xl bg-primary text-black font-semibold hover:bg-primary-hover transition">
                        Volver a mi perfil
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-24 pt-24 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
            <section className="rounded-3xl border border-surface-light/30 bg-surface-light/10 p-8 shadow-xl shadow-black/10">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-5">
                        <div className="relative h-24 w-24 overflow-hidden rounded-3xl bg-gradient-to-br from-primary/20 to-accent/20">
                            {targetProfile.avatar_url ? (
                                <Image src={targetProfile.avatar_url} alt={targetProfile.full_name || targetProfile.username || 'Perfil'} fill className="object-cover" sizes="96px" />
                            ) : (
                                <div className="flex h-full items-center justify-center text-2xl font-bold text-white/80">
                                    {targetProfile.username?.[0]?.toUpperCase() || 'A'}
                                </div>
                            )}
                        </div>
                        <div>
                            <p className="text-sm uppercase tracking-[0.3em] text-text-secondary">Perfil de usuario</p>
                            <h1 className="text-3xl font-bold">{targetProfile.full_name || `@${targetProfile.username}`}</h1>
                            <p className="text-text-secondary mt-1">@{targetProfile.username || 'usuario'}</p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <button
                            type="button"
                            disabled={!canSendRequest}
                            onClick={handleSendRequest}
                            className={`inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold transition ${canSendRequest ? 'bg-primary text-black hover:bg-primary-hover' : 'bg-surface-light text-text-secondary cursor-not-allowed'}`}
                        >
                            {requestState === 'sending' ? 'Enviando...' : requestState === 'sent' ? 'Solicitud enviada' : requestButtonText}
                        </button>
                        <Link href="/profile" className="inline-flex items-center justify-center rounded-2xl border border-surface-light/30 bg-background/80 px-5 py-3 text-sm font-semibold text-white hover:border-primary/50 hover:bg-surface-light/10 transition">
                            Volver a mi perfil
                        </Link>
                    </div>
                </div>

                {!isOwnProfile && isPrivateProfile && !isFriend ? (
                    <div className="mt-8 rounded-3xl border border-amber-500/20 bg-amber-500/5 p-6 text-center">
                        <p className="text-lg font-semibold text-white">Este perfil es privado.</p>
                        <p className="text-text-secondary mt-2">No puedes ver el contenido del usuario hasta que acepte tu solicitud.</p>
                        <p className="text-sm text-text-secondary mt-4">Solo puedes enviar una solicitud de amistad si el usuario lo permite.</p>
                    </div>
                ) : (
                    <div className="mt-8 grid gap-6 md:grid-cols-2">
                        <div className="rounded-3xl border border-surface-light/30 bg-background/80 p-6">
                            <h2 className="text-xl font-semibold mb-3">Acerca de</h2>
                            <p className="text-text-secondary leading-relaxed">{targetProfile.bio || 'Este usuario no ha compartido una biografía aún.'}</p>
                        </div>
                        <div className="rounded-3xl border border-surface-light/30 bg-background/80 p-6">
                            <h2 className="text-xl font-semibold mb-3">Ajustes de privacidad</h2>
                            <ul className="space-y-3 text-sm text-text-secondary">
                                <li className="flex items-center gap-3">
                                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-white">
                                        <User className="w-4 h-4" />
                                    </span>
                                    {privacy.publicProfile === false ? 'Perfil privado' : 'Perfil público'}
                                </li>
                                <li className="flex items-center gap-3">
                                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-white">
                                        <Users className="w-4 h-4" />
                                    </span>
                                    {allowFriendRequests ? 'Acepta solicitudes de amistad' : 'No acepta solicitudes de amistad'}
                                </li>
                                <li className="flex items-center gap-3">
                                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-white">
                                        <Heart className="w-4 h-4" />
                                    </span>
                                    {privacy.showWatchlist === false ? 'Oculta la lista de seguimiento' : 'Comparte su lista de seguimiento'}
                                </li>
                            </ul>
                        </div>
                    </div>
                )}

                {isFriend && (
                    <div className="mt-8 rounded-3xl border border-surface-light/30 bg-surface-light/10 p-6">
                        <p className="font-semibold text-white">Ya son amigos</p>
                        <p className="text-text-secondary mt-2">Ahora puedes ver el perfil completo y tus próximas interacciones.</p>
                    </div>
                )}
            </section>
        </div>
    );
}
