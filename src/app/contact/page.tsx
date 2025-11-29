'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Send, Mail, User, MessageSquare } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';

export default function ContactPage() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        message: '',
    });
    const [submitted, setSubmitted] = useState(false);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
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
            setTimeout(() => setSubmitted(false), 5000);
        } catch (err: any) {
            setError(err.message || 'Hubo un error al enviar tu mensaje. Por favor intenta de nuevo.');
        } finally {
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
        <div className="min-h-screen bg-background">
            <Navbar />

            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl sm:text-5xl font-bold mb-4">
                        <span className="text-gradient">Contáctanos</span>
                    </h1>
                    <p className="text-xl text-text-secondary">
                        ¿Tienes alguna pregunta? Estamos aquí para ayudarte.
                    </p>
                </div>

                {/* Contact Form */}
                <div className="card p-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Name Field */}
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium mb-2">
                                Nombre
                            </label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                                <input
                                    type="text"
                                    id="name"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    required
                                    className="w-full pl-10 pr-4 py-3 bg-surface-light border border-surface-light rounded-lg focus:outline-none focus:border-primary transition-colors"
                                    placeholder="Tu nombre"
                                />
                            </div>
                        </div>

                        {/* Email Field */}
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium mb-2">
                                Email
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    required
                                    className="w-full pl-10 pr-4 py-3 bg-surface-light border border-surface-light rounded-lg focus:outline-none focus:border-primary transition-colors"
                                    placeholder="tu@email.com"
                                />
                            </div>
                        </div>

                        {/* Message Field */}
                        <div>
                            <label htmlFor="message" className="block text-sm font-medium mb-2">
                                Mensaje
                            </label>
                            <div className="relative">
                                <MessageSquare className="absolute left-3 top-3 w-5 h-5 text-text-muted" />
                                <textarea
                                    id="message"
                                    name="message"
                                    value={formData.message}
                                    onChange={handleChange}
                                    required
                                    rows={6}
                                    className="w-full pl-10 pr-4 py-3 bg-surface-light border border-surface-light rounded-lg focus:outline-none focus:border-primary transition-colors resize-none"
                                    placeholder="¿En qué podemos ayudarte?"
                                />
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <Send className="w-5 h-5" />
                            )}
                            {loading ? 'Enviando...' : 'Enviar Mensaje'}
                        </button>

                        {/* Error Message */}
                        {error && (
                            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-500 text-center">
                                {error}
                            </div>
                        )}

                        {/* Success Message */}
                        {submitted && (
                            <div className="p-4 bg-success/10 border border-success/30 rounded-lg text-success text-center">
                                ¡Mensaje enviado! Te responderemos pronto.
                            </div>
                        )}
                    </form>
                </div>

                {/* Back Link */}
                <div className="text-center mt-8">
                    <Link href="/" className="text-primary hover:text-primary-hover transition-colors">
                        ← Volver al inicio
                    </Link>
                </div>
            </div>
        </div>
    );
}
