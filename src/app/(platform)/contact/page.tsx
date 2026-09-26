'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, Mail, MessageSquare, Send, User } from 'lucide-react';

export default function ContactPage() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        message: '',
    });
    const [submitted, setSubmitted] = useState(false);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    // Ref síncrona: `loading` tarda un render en deshabilitar el botón y un
    // doble Enter/clic disparaba dos POST (el 2º chocaba con el rate-limit).
    const submittingRef = useRef(false);
    const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => () => {
        if (successTimerRef.current) clearTimeout(successTimerRef.current);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (submittingRef.current) return;
        submittingRef.current = true;
        setLoading(true);
        setError('');

        try {
            const response = await fetch('/api/contact', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (!response.ok) {
                const errorMessage = typeof data.error === 'string'
                    ? data.error
                    : data.error?.message || 'Error al enviar el mensaje';
                throw new Error(errorMessage);
            }

            setSubmitted(true);
            setFormData({ name: '', email: '', message: '' });
            if (successTimerRef.current) clearTimeout(successTimerRef.current);
            successTimerRef.current = setTimeout(() => setSubmitted(false), 5000);
        } catch (err) {
            const message = err instanceof Error ? err.message : undefined;
            setError(message || 'Hubo un error al enviar tu mensaje. Por favor intenta de nuevo.');
        } finally {
            submittingRef.current = false;
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    return (
        <div className="mx-auto max-w-xl">
            <div className="mb-6">
                <h1 className="text-xl font-semibold text-on-surface sm:text-2xl">Contáctanos</h1>
                <p className="mt-1 text-sm text-on-surface-variant">
                    ¿Tienes alguna pregunta o sugerencia? Te respondemos lo antes posible.
                </p>
            </div>

            <div className="rounded-xl border border-outline-variant bg-surface-container-low p-5 sm:p-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                        <label htmlFor="name" className="block text-xs font-medium text-on-surface-variant">
                            Nombre
                        </label>
                        <div className="relative">
                            <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" aria-hidden />
                            <input
                                type="text"
                                id="name"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                required
                                className="h-9 w-full rounded-lg border border-outline-variant bg-surface-container pl-9 pr-3 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40"
                                placeholder="Tu nombre"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label htmlFor="email" className="block text-xs font-medium text-on-surface-variant">
                            Email
                        </label>
                        <div className="relative">
                            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" aria-hidden />
                            <input
                                type="email"
                                id="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                required
                                className="h-9 w-full rounded-lg border border-outline-variant bg-surface-container pl-9 pr-3 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40"
                                placeholder="tu@email.com"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label htmlFor="message" className="block text-xs font-medium text-on-surface-variant">
                            Mensaje
                        </label>
                        <div className="relative">
                            <MessageSquare className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-on-surface-variant" aria-hidden />
                            <textarea
                                id="message"
                                name="message"
                                value={formData.message}
                                onChange={handleChange}
                                required
                                rows={5}
                                className="w-full resize-none rounded-lg border border-outline-variant bg-surface-container py-2 pl-9 pr-3 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40"
                                placeholder="¿En qué podemos ayudarte?"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {loading ? (
                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                        ) : (
                            <Send className="h-4 w-4" aria-hidden />
                        )}
                        {loading ? 'Enviando…' : 'Enviar mensaje'}
                    </button>

                    {error && (
                        <div role="status" aria-live="polite" className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                            <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
                            <span className="min-w-0">{error}</span>
                        </div>
                    )}

                    {submitted && (
                        <div role="status" aria-live="polite" className="flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
                            <CheckCircle2 className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
                            <span className="min-w-0">¡Mensaje enviado! Te responderemos pronto.</span>
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
}
