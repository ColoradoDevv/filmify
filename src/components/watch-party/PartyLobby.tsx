import { Party, PartyMember } from '@/types/watch-party';
import { Play, Check, X } from 'lucide-react';
import Image from 'next/image';

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
    const isHost = party.host_id === currentUser.id;
    const myMember = members.find((m) => m.user_id === currentUser.id);
    const isReady = myMember?.is_ready || false;
    const allReady = members.length > 0 && members.every((m) => m.is_ready);

    return (
        <div className="flex flex-col items-center justify-center h-full p-8 space-y-8 overflow-y-auto">
            <div className="text-center space-y-4">
                <h1 className="text-4xl font-bold text-white mb-2">Sala de Espera</h1>
                <div className="relative w-48 h-72 mx-auto rounded-xl overflow-hidden shadow-2xl border-4 border-white/10">
                    {party.poster_path ? (
                        <Image
                            src={`https://image.tmdb.org/t/p/w500${party.poster_path}`}
                            alt={party.title}
                            fill
                            className="object-cover"
                        />
                    ) : (
                        <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                            <span className="text-gray-500">Sin Póster</span>
                        </div>
                    )}
                </div>
                <h2 className="text-2xl font-semibold text-white">{party.title}</h2>
            </div>

            <div className="w-full max-w-2xl bg-white/5 rounded-2xl p-6 border border-white/10">
                <h3 className="text-lg font-medium text-gray-300 mb-4">
                    Miembros ({members.length})
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {members.map((member) => (
                        <div
                            key={member.user_id}
                            className={`flex flex-col items-center p-3 rounded-xl border transition-all ${member.is_ready
                                    ? 'bg-green-500/10 border-green-500/50'
                                    : 'bg-white/5 border-white/10'
                                }`}
                        >
                            <div className="relative">
                                <div className="w-12 h-12 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold text-lg overflow-hidden mb-2">
                                    {member.avatar_url ? (
                                        <Image
                                            src={member.avatar_url}
                                            alt={member.username}
                                            width={48}
                                            height={48}
                                        />
                                    ) : (
                                        member.username.charAt(0).toUpperCase()
                                    )}
                                </div>
                                {member.is_host && (
                                    <span className="absolute -top-1 -right-1 bg-yellow-500 text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                        HOST
                                    </span>
                                )}
                            </div>
                            <span className="text-sm text-white font-medium truncate w-full text-center">
                                {member.username}
                            </span>
                            <span
                                className={`text-xs mt-1 ${member.is_ready ? 'text-green-400' : 'text-gray-500'
                                    }`}
                            >
                                {member.is_ready ? 'Listo' : 'Esperando...'}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex gap-4">
                <button
                    onClick={() => onToggleReady(!isReady)}
                    className={`px-8 py-3 rounded-full font-bold text-lg transition-all flex items-center gap-2 ${isReady
                            ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                            : 'bg-green-600 text-white hover:bg-green-700 shadow-lg shadow-green-600/20'
                        }`}
                >
                    {isReady ? (
                        <>
                            <X size={20} /> No estoy listo
                        </>
                    ) : (
                        <>
                            <Check size={20} /> Estoy listo
                        </>
                    )}
                </button>

                {isHost && (
                    <button
                        onClick={onStartParty}
                        disabled={!allReady}
                        className={`px-8 py-3 rounded-full font-bold text-lg transition-all flex items-center gap-2 ${allReady
                                ? 'bg-purple-600 text-white hover:bg-purple-700 shadow-lg shadow-purple-600/20'
                                : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                            }`}
                    >
                        <Play size={20} fill="currentColor" /> Iniciar Función
                    </button>
                )}
            </div>
        </div>
    );
};
