'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, Hash, Lock, ArrowRight } from 'lucide-react';
import { getRoomByCode, verifyRoomPassword } from '@/app/(platform)/rooms/actions';

interface JoinByCodeModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const JoinByCodeModal = ({ isOpen, onClose }: JoinByCodeModalProps) => {
    const router = useRouter();
    const [step, setStep] = useState<'code' | 'password'>('code');
    const [code, setCode] = useState('');
    const [password, setPassword] = useState('');
    const [partyId, setPartyId] = useState<string | null>(null);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleCodeSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!code.trim()) return;

        setIsLoading(true);
        setError('');

        try {
            const result = await getRoomByCode(code);
            if (result.success && result.party) {
                if (result.party.is_private) {
                    setPartyId(result.party.id);
                    setStep('password');
                } else {
                    router.push(`/party/${result.party.id}`);
                }
            } else {
                setError(result.error || 'Código inválido');
            }
        } catch (err) {
            setError('Error al buscar la sala');
        } finally {
            setIsLoading(false);
        }
    };

    const handlePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!partyId || !password) return;

        setIsLoading(true);
        setError('');

        try {
            const result = await verifyRoomPassword(partyId, password);
            if (result.success) {
                router.push(`/party/${partyId}`);
            } else {
                setError(result.error || 'Contraseña incorrecta');
            }
        } catch (err) {
            setError('Error al verificar la contraseña');
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        setStep('code');
        setCode('');
        setPassword('');
        setError('');
        setPartyId(null);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-md bg-surface border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
                    <h2 className="text-xl font-bold text-white">Unirse con Código</h2>
                    <button
                        onClick={handleClose}
                        className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Form */}
                <div className="p-6">
                    {step === 'code' ? (
                        <form onSubmit={handleCodeSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label htmlFor="code" className="text-sm font-medium text-gray-300">Código de la Sala</label>
                                <div className="relative">
                                    <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                                    <input
                                        id="code"
                                        type="text"
                                        maxLength={6}
                                        value={code}
                                        onChange={(e) => setCode(e.target.value.toUpperCase())}
                                        className="w-full pl-12 pr-4 py-3 rounded-xl bg-black/20 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-mono tracking-widest uppercase"
                                        placeholder="ABC123"
                                        autoFocus
                                    />
                                </div>
                            </div>

                            {error && (
                                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isLoading || code.length < 6}
                                className="w-full py-4 rounded-xl bg-primary text-white font-bold hover:bg-primary/90 transition-all hover:scale-[1.02] shadow-lg shadow-primary/25 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading ? 'Buscando...' : (
                                    <>
                                        Continuar <ArrowRight size={20} />
                                    </>
                                )}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handlePasswordSubmit} className="space-y-6 animate-in slide-in-from-right-4">
                            <div className="space-y-2">
                                <label htmlFor="password" className="text-sm font-medium text-gray-300">Contraseña de la Sala</label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                                    <input
                                        id="password"
                                        type="text"
                                        maxLength={6}
                                        value={password}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/\D/g, '');
                                            setPassword(val);
                                        }}
                                        className="w-full pl-12 pr-4 py-3 rounded-xl bg-black/20 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-mono tracking-widest text-center text-lg"
                                        placeholder="000000"
                                        autoFocus
                                    />
                                </div>
                            </div>

                            {error && (
                                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isLoading || password.length !== 6}
                                className="w-full py-4 rounded-xl bg-primary text-white font-bold hover:bg-primary/90 transition-all hover:scale-[1.02] shadow-lg shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading ? 'Verificando...' : 'Unirse a la Sala'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};
