'use client';

import Link from 'next/link';
import { ArrowLeft, ListChecks } from 'lucide-react';

export default function ListsPage() {
    return (
        <div className="min-h-screen pb-24 pt-24 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-3">
                    <div className="inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 text-sm text-text-secondary">
                        <ArrowLeft className="w-4 h-4" />
                        <Link href="/profile" className="hover:text-white transition-colors">
                            Volver a mi perfil
                        </Link>
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold">Listas</h1>
                        <p className="text-text-secondary">Organiza tus colecciones personalizadas de películas y series.</p>
                    </div>
                </div>
            </div>

            <section className="rounded-3xl border border-surface-light/30 bg-surface-light/10 p-8 shadow-lg shadow-black/10">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/10 text-primary">
                            <ListChecks className="w-8 h-8" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-semibold">Listas personales</h2>
                            <p className="text-text-secondary">Próximamente podrás guardar tus películas favoritas por colección y compartir tu estilo con amigos.</p>
                        </div>
                    </div>
                    <Link
                        href="/browse"
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-black transition hover:bg-primary-hover"
                    >
                        Explorar películas
                    </Link>
                </div>

                <div className="mt-10 rounded-3xl border border-dashed border-white/10 bg-background/60 p-8 text-center">
                    <p className="text-text-secondary text-lg font-medium">Funcionalidad en desarrollo</p>
                    <p className="mt-4 text-sm text-text-secondary/80">Estamos preparando una experiencia completa de listas para que puedas guardar, ordenar y compartir tus colecciones favoritas.</p>
                </div>
            </section>
        </div>
    );
}
