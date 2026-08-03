import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Heart } from 'lucide-react';
import DonateMethods from './DonateMethods';
import { AdSlot } from '@/components/ads';

export const metadata: Metadata = {
    title: { absolute: 'Apoya FilmiFy · Donaciones' },
    description: 'FilmiFy es un proyecto gratuito. Apóyanos con una donación por Bre-B para mantener los servidores y seguir mejorando.',
    alternates: { canonical: '/donar' },
    robots: { index: false, follow: true },
};

export default function DonatePage() {
    return (
        <div className="min-h-screen bg-background flex justify-center px-4 py-10 sm:py-14">
            <div className="w-full max-w-lg">
                {/* Volver */}
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-white transition-colors mb-8"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Volver al inicio
                </Link>

                {/* Cabecera */}
                <div className="mb-8">
                    <h1 className="text-2xl sm:text-3xl font-bold text-white mb-3">
                        Apoya FilmiFy
                    </h1>
                    <p className="text-text-secondary leading-relaxed">
                        FilmiFy es <strong className="text-white">completamente gratuito</strong> y queremos
                        que siga así. Tu aporte, por pequeño que sea, nos ayuda a mantener los servidores
                        y a seguir mejorando la plataforma.
                    </p>
                </div>

                {/* Métodos (cliente: botón copiar) */}
                <DonateMethods />

                {/* Nota de cierre */}
                <div className="mt-6 flex items-start gap-3 rounded-[var(--radius-lg)] bg-surface-container border border-outline-variant p-4">
                    <Heart className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <p className="text-sm text-text-secondary leading-relaxed">
                        No hay monto mínimo ni obligación. Si no puedes aportar, también nos ayudas
                        compartiendo <strong className="text-white">FilmiFy</strong> con tus amigos.
                    </p>
                </div>

                {/* 📢 Banner publicitario */}
                <AdSlot />
            </div>
        </div>
    );
}
