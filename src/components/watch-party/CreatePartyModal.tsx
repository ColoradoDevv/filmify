'use client';

import { useState } from 'react';
import { X, Lock, Globe } from 'lucide-react';
import Modal from '@/components/ui/Modal';

interface CreatePartyModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreate: (data: { name: string; isPrivate: boolean; password?: string; imdbId?: string; mediaType?: 'movie' | 'tv'; language?: 'es' | 'en' }) => void;
    movieTitle: string;
    currentUser: any;
    imdbId?: string;
    mediaType?: 'movie' | 'tv';
}

import { checkAvailability } from '@/services/vidsrc';
import { isAnimeAvailable } from '@/services/streamingSources';
import { useEffect } from 'react';

export const CreatePartyModal = ({ isOpen, onClose, onCreate, movieTitle, currentUser, imdbId, mediaType = 'movie', tmdbId }: CreatePartyModalProps & { tmdbId?: number }) => {
    const [name, setName] = useState(`Sala de ${currentUser?.user_metadata?.full_name || 'Cine'}`);
    const [isPrivate, setIsPrivate] = useState(false);
    const [password, setPassword] = useState('');
    const [language, setLanguage] = useState<'es' | 'en'>('es');
    const [error, setError] = useState('');
    const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
    const [animeInfo, setAnimeInfo] = useState<{ isAnime: boolean; hasSubs: boolean } | null>(null);
    const [isChecking, setIsChecking] = useState(false);

    useEffect(() => {
        const check = async () => {
            if (isOpen && (imdbId || tmdbId)) {
                setIsChecking(true);

                // Parallel checks
                const [vidsrcAvailable, animeCheck] = await Promise.all([
                    imdbId ? checkAvailability(imdbId, mediaType) : Promise.resolve(false),
                    tmdbId && imdbId ? isAnimeAvailable(tmdbId, imdbId, mediaType === 'tv') : Promise.resolve({ available: false, hasSubs: false })
                ]);

                setIsAvailable(vidsrcAvailable);
                if (animeCheck.available) {
                    setAnimeInfo({ isAnime: true, hasSubs: animeCheck.hasSubs });
                } else {
                    setAnimeInfo(null);
                }

                setIsChecking(false);
            } else {
                setIsAvailable(null);
                setAnimeInfo(null);
            }
        };
        check();
    }, [isOpen, imdbId, tmdbId, mediaType]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!name.trim()) {
            setError('El nombre de la sala es obligatorio');
            return;
        }

        if (isPrivate) {
            if (!password) {
                setError('La contraseña es obligatoria para salas privadas');
                return;
            }
            if (!/^\d{6}$/.test(password)) {
                setError('La contraseña debe tener exactamente 6 números');
                return;
            }
        }

        onCreate({
            name,
            isPrivate,
            password: isPrivate ? password : undefined,
            imdbId,
            mediaType,
            language
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-md bg-surface border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
                    <h2 className="text-xl font-bold text-white">Crear Watch Party</h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">Película</label>
                        <div className="flex items-center gap-3">
                            <p className="text-white font-semibold text-lg truncate flex-1">{movieTitle}</p>
                            {isChecking ? (
                                <span className="px-2 py-1 rounded text-xs bg-gray-700 text-gray-300 animate-pulse">
                                    Verificando...
                                </span>
                            ) : animeInfo ? (
                                <span className="px-2 py-1 rounded text-xs bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold">
                                    {animeInfo.hasSubs ? 'Anime + Subs' : 'Anime'}
                                </span>
                            ) : isAvailable !== null ? (
                                isAvailable ? (
                                    <span className="px-2 py-1 rounded text-xs bg-green-500/20 text-green-400 border border-green-500/30 font-medium">
                                        Disponible en streaming
                                    </span>
                                ) : (
                                    <span className="px-2 py-1 rounded text-xs bg-gray-700 text-gray-400 border border-gray-600 font-medium">
                                        Solo tráiler
                                    </span>
                                )
                            ) : null}
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                                <Globe size={12} />
                                Audio: Español / Inglés (Según disponibilidad)
                            </span>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="name" className="text-sm font-medium text-gray-300">Nombre de la Sala</label>
                        <input
                            id="name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-black/20 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                            placeholder="Ej: Sala de Cine de Juan"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">Idioma de Audio</label>
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                type="button"
                                onClick={() => setLanguage('es')}
                                className={`p-3 rounded-xl border flex items-center justify-center gap-2 transition-all ${language === 'es'
                                    ? 'bg-primary/20 border-primary text-white'
                                    : 'bg-black/20 border-white/10 text-gray-400 hover:bg-white/5'
                                    }`}
                            >
                                <span className="font-medium">Español</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setLanguage('en')}
                                className={`p-3 rounded-xl border flex items-center justify-center gap-2 transition-all ${language === 'en'
                                    ? 'bg-primary/20 border-primary text-white'
                                    : 'bg-black/20 border-white/10 text-gray-400 hover:bg-white/5'
                                    }`}
                            >
                                <span className="font-medium">Inglés</span>
                            </button>
                        </div>
                    </div>

                    <div className="space-y-4 pt-2">
                        <label className="text-sm font-medium text-gray-300">Privacidad</label>
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                type="button"
                                onClick={() => setIsPrivate(false)}
                                className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${!isPrivate
                                    ? 'bg-primary/20 border-primary text-white'
                                    : 'bg-black/20 border-white/10 text-gray-400 hover:bg-white/5'
                                    }`}
                            >
                                <Globe size={24} />
                                <span className="font-medium">Pública</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsPrivate(true)}
                                className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${isPrivate
                                    ? 'bg-primary/20 border-primary text-white'
                                    : 'bg-black/20 border-white/10 text-gray-400 hover:bg-white/5'
                                    }`}
                            >
                                <Lock size={24} />
                                <span className="font-medium">Privada</span>
                            </button>
                        </div>
                    </div>

                    {isPrivate && (
                        <div className="space-y-2 animate-in slide-in-from-top-2">
                            <label htmlFor="password" className="text-sm font-medium text-gray-300">Contraseña (6 números)</label>
                            <input
                                id="password"
                                type="text"
                                maxLength={6}
                                value={password}
                                onChange={(e) => {
                                    const val = e.target.value.replace(/\D/g, '');
                                    setPassword(val);
                                }}
                                className="w-full px-4 py-3 rounded-xl bg-black/20 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all tracking-widest text-center font-mono text-lg"
                                placeholder="000000"
                            />
                        </div>
                    )}

                    {error && (
                        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
                            {error}
                        </div>
                    )}

                    <div className="pt-4">
                        <button
                            type="submit"
                            className="w-full py-4 rounded-xl bg-primary text-white font-bold hover:bg-primary/90 transition-all hover:scale-[1.02] shadow-lg shadow-primary/25"
                        >
                            Crear Sala
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
