'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Lock, Globe, Users, Play, X } from 'lucide-react';
import { getPosterUrl } from '@/lib/tmdb/service';
import { verifyRoomPassword } from '@/app/(platform)/rooms/actions';
import { Party } from '@/types/watch-party';
import { createClient } from '@/lib/supabase/client';

interface RoomsListProps {
    initialParties: Party[];
}

export default function RoomsList({ initialParties }: RoomsListProps) {
    const router = useRouter();
    const [parties, setParties] = useState<Party[]>(initialParties);
    const [selectedParty, setSelectedParty] = useState<Party | null>(null);
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const supabase = createClient();

    useEffect(() => {
        setParties(initialParties);
    }, [initialParties]);

    useEffect(() => {
        const channel = supabase
            .channel('rooms-list')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'parties',
                },
                (payload) => {
                    if (payload.eventType === 'INSERT') {
                        setParties((prev) => [payload.new as Party, ...prev]);
                    } else if (payload.eventType === 'DELETE') {
                        setParties((prev) => prev.filter((p) => p.id !== payload.old.id));
                    } else if (payload.eventType === 'UPDATE') {
                        setParties((prev) =>
                            prev.map((p) => (p.id === payload.new.id ? { ...p, ...payload.new } : p))
                        );
                    }
                }
            )
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'party_members',
                },
                async (payload) => {
                    const newRecord = payload.new as any;
                    const oldRecord = payload.old as any;
                    const partyId = newRecord?.party_id || oldRecord?.party_id;

                    if (!partyId) {
                        // Fallback: If we don't have the party_id (e.g. DELETE without REPLICA IDENTITY FULL),
                        // we verify by re-fetching the whole list to be safe.
                        const { data: refreshedParties } = await supabase
                            .from('parties')
                            .select('id, tmdb_id, title, poster_path, host_id, status, created_at, name, is_private, party_members(count)')
                            .neq('status', 'finished')
                            .order('created_at', { ascending: false });

                        if (refreshedParties) {
                            setParties(refreshedParties as Party[]);
                        }
                        return;
                    }

                    const { count } = await supabase
                        .from('party_members')
                        .select('*', { count: 'exact', head: true })
                        .eq('party_id', partyId);

                    setParties((prev) =>
                        prev.map((p) =>
                            p.id === partyId
                                ? { ...p, party_members: [{ count: count || 0 }] }
                                : p
                        )
                    );
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const handleJoin = async (party: Party) => {
        if (party.is_private) {
            setSelectedParty(party);
            setPassword('');
            setError('');
        } else {
            router.push(`/party/${party.id}`);
        }
    };

    const handlePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedParty) return;

        setIsLoading(true);
        setError('');

        try {
            const result = await verifyRoomPassword(selectedParty.id, password);
            if (result.success) {
                router.push(`/party/${selectedParty.id}`);
            } else {
                setError(result.error || 'Contraseña incorrecta');
            }
        } catch (err) {
            setError('Error al verificar la contraseña');
        } finally {
            setIsLoading(false);
        }
    };

    if (parties.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh] text-center space-y-4">
                <div className="p-6 rounded-full bg-white/5 border border-white/10">
                    <Users className="w-12 h-12 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-white">No hay salas activas</h3>
                <p className="text-gray-400 max-w-sm">
                    Sé el primero en crear una sala de cine y ver películas con amigos.
                </p>
            </div>
        );
    }

    return (
        <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {parties.map((party) => (
                    <div
                        key={party.id}
                        className="group relative bg-surface border border-white/10 rounded-xl overflow-hidden hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/10 cursor-pointer"
                        onClick={() => handleJoin(party)}
                    >
                        {/* Backdrop/Poster Background */}
                        <div className="absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity">
                            {party.poster_path && (
                                <Image
                                    src={getPosterUrl(party.poster_path || '')}
                                    alt={party.title}
                                    fill
                                    className="object-cover blur-sm"
                                />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/80 to-transparent" />
                        </div>

                        <div className="relative p-5 space-y-4">
                            {/* Header */}
                            <div className="flex items-start justify-between">
                                <div className={`p-2 rounded-lg ${party.is_private ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                                    {party.is_private ? <Lock size={16} /> : <Globe size={16} />}
                                </div>
                                <div className="flex items-center gap-2">
                                    {(() => {
                                        const statusConfig = {
                                            waiting: { label: 'Esperando', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' },
                                            counting: { label: 'Comenzando...', color: 'bg-blue-500/20 text-blue-400 border-blue-500/50' },
                                            playing: { label: 'Reproduciendo', color: 'bg-green-500/20 text-green-400 border-green-500/50' },
                                            finished: { label: 'Finalizada', color: 'bg-gray-500/20 text-gray-400 border-gray-500/50' },
                                        };
                                        const config = statusConfig[party.status as keyof typeof statusConfig] || statusConfig.waiting;

                                        return (
                                            <span className={`text-xs font-medium px-2 py-1 rounded-full border ${config.color}`}>
                                                {config.label}
                                            </span>
                                        );
                                    })()}
                                </div>
                            </div>

                            {/* Content */}
                            <div className="space-y-1">
                                <h3 className="text-lg font-bold text-white line-clamp-1 group-hover:text-primary transition-colors">
                                    {party.name}
                                </h3>
                                <p className="text-sm text-gray-400 line-clamp-1">
                                    Viendo: <span className="text-white">{party.title}</span>
                                </p>
                            </div>

                            {/* Footer */}
                            <div className="pt-4 border-t border-white/5 flex items-center justify-between text-sm text-gray-500">
                                <div className="flex items-center gap-2">
                                    <Users size={14} />
                                    <span>{party.party_members?.[0]?.count || 0} espectadores</span>
                                </div>
                                <Play size={14} className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all text-primary" />
                            </div>
                        </div>
                    </div>
                ))}
            </div >

            {/* Password Modal */}
            {
                selectedParty && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                        <div className="w-full max-w-sm bg-surface border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
                                <h3 className="font-bold text-white">Sala Privada</h3>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedParty(null);
                                    }}
                                    className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handlePasswordSubmit} className="p-6 space-y-4">
                                <div className="text-center space-y-2">
                                    <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mx-auto text-red-400 mb-4">
                                        <Lock size={24} />
                                    </div>
                                    <p className="text-sm text-gray-400">
                                        Esta sala está protegida. Ingresa el código de acceso.
                                    </p>
                                </div>

                                <input
                                    type="text"
                                    maxLength={6}
                                    autoFocus
                                    value={password}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/\D/g, '');
                                        setPassword(val);
                                    }}
                                    className="w-full px-4 py-3 rounded-xl bg-black/20 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all tracking-widest text-center font-mono text-lg"
                                    placeholder="000000"
                                />

                                {error && (
                                    <p className="text-red-400 text-sm text-center bg-red-500/10 p-2 rounded-lg">
                                        {error}
                                    </p>
                                )}

                                <button
                                    type="submit"
                                    disabled={isLoading || password.length !== 6}
                                    className="w-full py-3 rounded-xl bg-primary text-white font-bold hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isLoading ? 'Verificando...' : 'Entrar'}
                                </button>
                            </form>
                        </div>
                    </div>
                )
            }
        </>
    );
}
