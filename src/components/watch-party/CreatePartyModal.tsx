'use client';

import { useState } from 'react';
import { X, Lock, Globe } from 'lucide-react';
import Modal from '@/components/ui/Modal';

interface CreatePartyModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreate: (data: { name: string; isPrivate: boolean; password?: string }) => void;
    movieTitle: string;
    currentUser: any;
}

export const CreatePartyModal = ({ isOpen, onClose, onCreate, movieTitle, currentUser }: CreatePartyModalProps) => {
    const [name, setName] = useState(`Sala de ${currentUser?.user_metadata?.full_name || 'Cine'}`);
    const [isPrivate, setIsPrivate] = useState(false);
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

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
            password: isPrivate ? password : undefined
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
                        <p className="text-white font-semibold text-lg truncate">{movieTitle}</p>
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
