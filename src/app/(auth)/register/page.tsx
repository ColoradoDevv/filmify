'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, User, Film } from 'lucide-react';

export default function RegisterPage() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // TODO: Implement actual registration
        router.push('/browse');
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    return (
        <div className="card p-8">
            {/* Logo */}
            <div className="flex items-center justify-center gap-2 mb-8">
                <Film className="w-10 h-10 text-primary" />
                <span className="text-3xl font-bold text-gradient">FilmiFy</span>
            </div>

            {/* Header */}
            <div className="text-center mb-8">
                <h1 className="text-2xl font-bold mb-2">Crear cuenta</h1>
                <p className="text-text-secondary">Únete a la comunidad de FilmiFy</p>
            </div>

            {/* Form */}
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

                {/* Password Field */}
                <div>
                    <label htmlFor="password" className="block text-sm font-medium mb-2">
                        Contraseña
                    </label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                        <input
                            type="password"
                            id="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            required
                            minLength={6}
                            className="w-full pl-10 pr-4 py-3 bg-surface-light border border-surface-light rounded-lg focus:outline-none focus:border-primary transition-colors"
                            placeholder="••••••••"
                        />
                    </div>
                    <p className="text-xs text-text-muted mt-1">
                        Mínimo 6 caracteres
                    </p>
                </div>

                {/* Submit Button */}
                <button
                    type="submit"
                    className="w-full px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary-hover transition-colors"
                >
                    Crear Cuenta
                </button>
            </form>

            {/* Footer */}
            <div className="mt-6 text-center">
                <p className="text-text-secondary">
                    ¿Ya tienes cuenta?{' '}
                    <Link href="/login" className="text-primary hover:text-primary-hover font-medium">
                        Inicia sesión
                    </Link>
                </p>
            </div>

            {/* Back to Home */}
            <div className="mt-4 text-center">
                <Link href="/" className="text-text-muted hover:text-text-secondary text-sm">
                    ← Volver al inicio
                </Link>
            </div>
        </div>
    );
}
