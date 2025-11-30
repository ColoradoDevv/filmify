'use client';

import { Party, PartyMember } from '@/types/watch-party';
import { Play, Check, X, LogOut, Copy, Users } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { getPosterUrl } from '@/lib/tmdb/service';
import { useState } from 'react';

interface PartyLobbyProps {
    party: Party;
    members: PartyMember[];
    currentUser: { id: string };
    onToggleReady: (isReady: boolean) => void;
    onStartParty: () => void;
}

export const PartyLobby = ({
    party,
    members,
    currentUser,
    onToggleReady,
    onStartParty,
}: PartyLobbyProps) => {
    const router = useRouter();
    const isHost = party.host_id === currentUser.id;
    const myMember = members.find((m) => m.user_id === currentUser.id);
    const isReady = myMember?.is_ready || false;
    const allReady = members.length > 0 && members.every((m) => m.is_ready);
    const [copied, setCopied] = useState(false);

    const handleCopyCode = () => {
        if (party.room_code) {
            navigator.clipboard.writeText(party.room_code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleLeave = () => {
        router.push('/rooms');
    };

    return (
        <div className="relative h-full w-full overflow-hidden flex flex-col">
            {/* Background */}
            <div className="absolute inset-0 z-0">
                {party.poster_path ? (
                    <Image
                        src={getPosterUrl(party.poster_path) || ''}
                        alt="Background"
                        fill
                        className="object-cover blur-xl opacity-30 scale-110"
                    />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-gray-900 to-black" />
                )}
                <div className="absolute inset-0 bg-black/40" />
            </div>

            {/* Content */}
            <div className="relative z-10 flex-1 flex flex-col p-6 md:p-12 max-w-7xl mx-auto w-full h-full">

                {/* Header */}
                <div className="flex justify-between items-start shrink-0 mb-8">
                    <div className="space-y-2">
                        <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
                            {party.name}
                        </h1>
                        <div className="flex items-center gap-4 text-gray-300">
                            <span className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full text-sm">
                                <Users size={14} /> {members.length} Miembros
                            </span>
                            {party.room_code && (
                                <button
                                    onClick={handleCopyCode}
                                    className="flex items-center gap-2 bg-primary/20 hover:bg-primary/30 px-3 py-1 rounded-full text-sm text-primary transition-colors group"
                                >
                                    <span className="font-mono font-bold tracking-wider">{party.room_code}</span>
                                    {copied ? <Check size={14} /> : <Copy size={14} className="opacity-50 group-hover:opacity-100" />}
                                </button>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={handleLeave}
                        className="p-3 rounded-full bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-all border border-white/10 hover:border-red-500/50"
                        title="Salir de la sala"
                    >
                        <LogOut size={20} />
                    </button>
                </div>

                {/* Main Content Grid */}
                <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 min-h-0">

                    {/* Left: Movie Info */}
                    <div className="lg:col-span-4 flex flex-col items-center lg:items-start justify-center space-y-6 overflow-y-auto">
                        <div className="relative w-64 aspect-[2/3] rounded-xl overflow-hidden shadow-2xl border border-white/10 group">
                            {party.poster_path ? (
                                <Image
                                    src={getPosterUrl(party.poster_path) || ''}
                                    alt={party.title}
                                    fill
                                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                                />
                            ) : (
                                <div className="w-full h-full bg-gray-800 flex items-center justify-center text-gray-500">
                                    Sin Póster
                                </div>
                            )}
                        </div>
                        <div className="text-center lg:text-left space-y-2">
                            <h2 className="text-2xl font-bold text-white">{party.title}</h2>
                            <p className="text-gray-400 text-sm">Esperando a que el anfitrión inicie...</p>
                        </div>
                    </div>

                    {/* Right: Members Grid */}
                    <div className="lg:col-span-8 bg-black/20 backdrop-blur-md rounded-3xl border border-white/10 p-6 flex flex-col min-h-0">
                        <h3 className="text-lg font-medium text-white mb-6 flex items-center gap-2">
                            Participantes <span className="text-gray-500 text-sm font-normal">({members.filter(m => m.is_ready).length}/{members.length} listos)</span>
                        </h3>

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 overflow-y-auto pr-2 custom-scrollbar">
                            {members.map((member) => (
                                <div
                                    key={member.user_id}
                                    className={`relative group flex flex-col items-center p-4 rounded-xl border transition-all duration-300 ${member.is_host
                                        ? 'bg-yellow-500/10 border-yellow-500/30 shadow-[0_0_15px_-3px_rgba(234,179,8,0.1)]'
                                        : (member.is_ready
                                            ? 'bg-green-500/10 border-green-500/30 shadow-[0_0_15px_-3px_rgba(34,197,94,0.2)]'
                                            : 'bg-white/5 border-white/5 hover:bg-white/10')
                                        }`}
                                >
                                    <div className="relative mb-3">
                                        <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl overflow-hidden border-2 ${member.is_host ? 'border-yellow-500 shadow-[0_0_15px_-3px_rgba(234,179,8,0.3)]' : (member.is_ready ? 'border-green-500' : 'border-transparent')}`}>
                                            {member.avatar_url ? (
                                                <Image
                                                    src={member.avatar_url}
                                                    alt={member.username}
                                                    width={64}
                                                    height={64}
                                                />
                                            ) : (
                                                <div className="w-full h-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
                                                    {member.username.charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                        </div>
                                        {member.is_host && (
                                            <span className="absolute -top-2 -right-2 bg-yellow-500 text-black text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg border border-yellow-400 z-10">
                                                HOST
                                            </span>
                                        )}
                                        {member.is_ready && !member.is_host && (
                                            <div className="absolute -bottom-1 -right-1 bg-green-500 text-white p-1 rounded-full border-2 border-black z-10">
                                                <Check size={12} strokeWidth={3} />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1 max-w-full">
                                        <span className={`text-sm font-medium truncate text-center ${member.is_host ? 'text-yellow-400' : 'text-white'}`}>
                                            {member.username}
                                        </span>
                                        {member.user_id === currentUser.id && (
                                            <span className="text-[10px] font-bold bg-white/20 text-white px-1.5 py-0.5 rounded-md shrink-0">
                                                Tú
                                            </span>
                                        )}
                                    </div>
                                    <span className={`text-xs mt-1 font-medium ${member.is_ready ? 'text-green-400' : 'text-gray-500'}`}>
                                        {member.is_ready ? 'Listo' : 'Esperando'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer Controls */}
                <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 shrink-0">
                    <button
                        onClick={() => onToggleReady(!isReady)}
                        className={`w-full sm:w-auto px-8 py-4 rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-3 ${isReady
                            ? 'bg-white/10 text-gray-300 hover:bg-red-500/20 hover:text-red-400 border border-white/10'
                            : 'bg-primary text-white hover:bg-primary/90 hover:scale-105 shadow-lg shadow-primary/25'
                            }`}
                    >
                        {isReady ? (
                            <>
                                <X size={20} /> Cancelar
                            </>
                        ) : (
                            <>
                                <Check size={20} /> ¡Estoy Listo!
                            </>
                        )}
                    </button>

                    {isHost && (
                        <button
                            onClick={onStartParty}
                            disabled={!allReady}
                            className={`w-full sm:w-auto px-8 py-4 rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-3 ${allReady
                                ? 'bg-green-500 text-white hover:bg-green-600 hover:scale-105 shadow-lg shadow-green-500/25'
                                : 'bg-white/5 text-gray-500 cursor-not-allowed border border-white/5'
                                }`}
                        >
                            <Play size={20} fill="currentColor" /> Iniciar Función
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
