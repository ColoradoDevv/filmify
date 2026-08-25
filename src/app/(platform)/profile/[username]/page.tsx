'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Clapperboard, Eye, EyeOff, Heart, Loader2, User, Users } from 'lucide-react';
import { AdSlot } from '@/components/ads';
import { getWatchHistory, type WatchHistoryEntry } from '@/app/actions/watch-history';

const TMDB_IMG = 'https://image.tmdb.org/t/p/w342';

/**
 * Lo que `get_public_profile()` deja ver de un perfil ajeno.
 *
 * Antes esta página hacía `select('… , preferences')` y decidía en el navegador
 * qué enseñar. Eso significaba mandarle al visitante el objeto completo —los
 * favoritos, el grafo social entero y los ajustes de privacidad del otro— y
 * confiar en que la interfaz no lo pintara. La función devuelve ya filtrado
 * solo lo que a QUIEN pregunta le corresponde ver; el resto no sale de la base
 * de datos. Ver 20260825_privacy_gated_content.sql.
 */
interface PublicProfile {
    id: string;
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
    bio: string | null;
    is_own: boolean;
    is_friend: boolean;
    public_profile: boolean;
    /** Si es false, el perfil es privado y no somos ni el dueño ni su amistad. */
    visible: boolean;
    allow_friend_requests: boolean;
    show_watchlist: boolean;
    show_watch_history: boolean;
    has_incoming_request: boolean;
    has_outgoing_request: boolean;
}

interface PublicFavorite {
    tmdb_id: number;
    title: string;
    poster_path: string | null;
    media_type: string;
}

/** Forma común de una tarjeta, venga de favoritos o del historial. */
interface TitleCardItem {
    tmdbId: number;
    title: string;
    posterPath: string | null;
    mediaType: 'movie' | 'tv';
}

export default function FriendProfilePage() {
    const router = useRouter();
    const params = useParams();
    const username = typeof params.username === 'string' ? params.username : '';

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [profile, setProfile] = useState<PublicProfile | null>(null);
    const [favorites, setFavorites] = useState<TitleCardItem[]>([]);
    const [history, setHistory] = useState<TitleCardItem[]>([]);
    const [requestState, setRequestState] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle');

    useEffect(() => {
        if (!username) return;

        const supabase = createClient();
        let cancelled = false;

        const load = async () => {
            setLoading(true);
            setError(null);

            try {
                const { data, error: rpcError } = await supabase
                    .rpc('get_public_profile', { p_username: username });

                if (cancelled) return;

                if (rpcError) {
                    console.error(rpcError);
                    setError('Ocurrió un error al cargar el perfil.');
                    return;
                }
                if (!data) {
                    setError('No se encontró el perfil solicitado.');
                    return;
                }

                const target = data as PublicProfile;
                setProfile(target);

                // El contenido solo se pide si el perfil es visible. Los gates
                // reales están en la base de datos —`get_public_favorites`
                // comprueba `showWatchlist`, y `watch_history` lo hace por
                // RLS—, así que esto es solo ahorrarse dos peticiones que
                // volverían vacías.
                if (!target.visible) return;

                const [favResult, historyRows] = await Promise.all([
                    supabase.rpc('get_public_favorites', { p_owner: target.id, p_limit: 12 }),
                    getWatchHistory(target.id, 8),
                ]);

                if (cancelled) return;

                const favRows = (favResult.data ?? []) as PublicFavorite[];
                setFavorites(favRows.map((f) => ({
                    tmdbId: f.tmdb_id,
                    title: f.title,
                    posterPath: f.poster_path,
                    mediaType: f.media_type === 'tv' ? 'tv' : 'movie',
                })));

                setHistory(historyRows.map((h: WatchHistoryEntry) => ({
                    tmdbId: h.tmdbId,
                    title: h.title,
                    posterPath: h.posterPath,
                    mediaType: h.mediaType,
                })));
            } catch (err) {
                if (cancelled) return;
                console.error(err);
                setError('Ocurrió un error al cargar el perfil.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        void load();
        return () => { cancelled = true; };
    }, [username]);

    const canSendRequest = !!profile
        && !profile.is_own
        && !profile.is_friend
        && profile.allow_friend_requests
        && !profile.has_outgoing_request
        && !profile.has_incoming_request;

    const requestButtonText = !profile
        ? 'Enviar solicitud de amistad'
        : profile.is_friend
            ? 'Ya son amigos'
            : profile.has_incoming_request
                ? 'Solicitud entrante'
                : profile.has_outgoing_request
                    ? 'Solicitud enviada'
                    : profile.allow_friend_requests
                        ? 'Enviar solicitud de amistad'
                        : 'No acepta solicitudes';

    const handleSendRequest = useCallback(async () => {
        if (!profile || !canSendRequest) return;

        setRequestState('sending');
        try {
            const response = await fetch('/api/friends', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetId: profile.id }),
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
    }, [profile, canSendRequest]);

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

    if (error || !profile) {
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
                            {profile.avatar_url ? (
                                <Image src={profile.avatar_url} alt={profile.full_name || profile.username || 'Perfil'} fill className="object-cover" sizes="96px" />
                            ) : (
                                <div className="flex h-full items-center justify-center text-2xl font-bold text-white/80">
                                    {profile.username?.[0]?.toUpperCase() || 'A'}
                                </div>
                            )}
                        </div>
                        <div>
                            <p className="text-sm uppercase tracking-[0.3em] text-text-secondary">Perfil de usuario</p>
                            <h1 className="text-3xl font-bold">{profile.full_name || `@${profile.username}`}</h1>
                            <p className="text-text-secondary mt-1">@{profile.username || 'usuario'}</p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <button
                            type="button"
                            disabled={!canSendRequest || requestState === 'sending'}
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

                {!profile.visible ? (
                    <div className="mt-8 rounded-3xl border border-amber-500/20 bg-amber-500/5 p-6 text-center">
                        <p className="text-lg font-semibold text-white">Este perfil es privado.</p>
                        <p className="text-text-secondary mt-2">No puedes ver el contenido del usuario hasta que acepte tu solicitud.</p>
                        <p className="text-sm text-text-secondary mt-4">Solo puedes enviar una solicitud de amistad si el usuario lo permite.</p>
                    </div>
                ) : (
                    <div className="mt-8 grid gap-6 md:grid-cols-2">
                        <div className="rounded-3xl border border-surface-light/30 bg-background/80 p-6">
                            <h2 className="text-xl font-semibold mb-3">Acerca de</h2>
                            <p className="text-text-secondary leading-relaxed">{profile.bio || 'Este usuario no ha compartido una biografía aún.'}</p>
                        </div>
                        <div className="rounded-3xl border border-surface-light/30 bg-background/80 p-6">
                            <h2 className="text-xl font-semibold mb-3">Ajustes de privacidad</h2>
                            <ul className="space-y-3 text-sm text-text-secondary">
                                <PrivacyLine
                                    icon={User}
                                    text={profile.public_profile ? 'Perfil público' : 'Perfil privado'}
                                />
                                <PrivacyLine
                                    icon={Users}
                                    text={profile.allow_friend_requests
                                        ? 'Acepta solicitudes de amistad'
                                        : 'No acepta solicitudes de amistad'}
                                />
                                <PrivacyLine
                                    icon={profile.show_watchlist ? Eye : EyeOff}
                                    text={profile.show_watchlist
                                        ? 'Comparte sus favoritos'
                                        : 'Mantiene sus favoritos en privado'}
                                />
                                <PrivacyLine
                                    icon={profile.show_watch_history ? Eye : EyeOff}
                                    text={profile.show_watch_history
                                        ? 'Comparte lo que ha visto'
                                        : 'Mantiene su historial en privado'}
                                />
                            </ul>
                        </div>
                    </div>
                )}
            </section>

            {profile.visible && (
                <>
                    <TitleSection
                        icon={Heart}
                        title="Favoritos"
                        shared={profile.show_watchlist}
                        items={favorites}
                        hiddenCopy="Este usuario mantiene sus favoritos en privado."
                        emptyCopy="Todavía no ha guardado ningún favorito."
                    />

                    <TitleSection
                        icon={Clapperboard}
                        title="Lo que ha visto"
                        shared={profile.show_watch_history}
                        items={history}
                        hiddenCopy="Este usuario mantiene su historial en privado."
                        emptyCopy="Todavía no ha marcado nada como visto."
                    />
                </>
            )}

            {/* 📢 Banner publicitario */}
            <AdSlot className="my-0" />
        </div>
    );
}

function PrivacyLine({ icon: Icon, text }: { icon: typeof User; text: string }) {
    return (
        <li className="flex items-center gap-3">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-white">
                <Icon className="w-4 h-4" aria-hidden />
            </span>
            {text}
        </li>
    );
}

/**
 * Una sección de títulos del perfil.
 *
 * Distingue «no lo comparte» de «no tiene nada»: son cosas distintas y, para
 * quien mira, mezclarlas es confuso. Que la lista llegue vacía cuando el
 * interruptor está apagado ya lo garantiza la base de datos —aquí el flag solo
 * elige el texto—, así que un fallo de este componente no puede filtrar nada.
 */
function TitleSection({
    icon: Icon, title, shared, items, hiddenCopy, emptyCopy,
}: {
    icon: typeof Heart;
    title: string;
    shared: boolean;
    items: TitleCardItem[];
    hiddenCopy: string;
    emptyCopy: string;
}) {
    return (
        <section className="rounded-3xl border border-surface-light/30 bg-surface-light/10 p-6">
            <div className="mb-5 flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-white">
                    <Icon className="h-5 w-5" aria-hidden />
                </span>
                <h2 className="text-xl font-semibold text-white">{title}</h2>
            </div>

            {!shared ? (
                <p className="text-text-secondary text-sm">{hiddenCopy}</p>
            ) : items.length === 0 ? (
                <p className="text-text-secondary text-sm">{emptyCopy}</p>
            ) : (
                <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                    {items.map((item) => (
                        <li key={`${item.mediaType}-${item.tmdbId}`}>
                            <TitleCard item={item} />
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}

function TitleCard({ item }: { item: TitleCardItem }) {
    const href = item.mediaType === 'tv' ? `/tv/${item.tmdbId}` : `/movie/${item.tmdbId}`;

    return (
        <Link
            href={href}
            className="group block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
            <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-surface-container ring-1 ring-white/10 transition group-hover:ring-primary/60">
                {item.posterPath ? (
                    <Image
                        src={`${TMDB_IMG}${item.posterPath}`}
                        alt={item.title}
                        fill
                        sizes="(max-width: 640px) 30vw, 150px"
                        className="object-cover transition-transform duration-500 motion-safe:group-hover:scale-105"
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center px-2 text-center text-[11px] font-medium text-text-muted">
                        {item.title}
                    </div>
                )}
            </div>
            <p className="mt-1.5 line-clamp-2 text-[11px] font-semibold leading-tight text-white transition-colors group-hover:text-primary">
                {item.title}
            </p>
        </Link>
    );
}
