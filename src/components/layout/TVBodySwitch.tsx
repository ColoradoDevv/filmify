'use client';

import { useTVDetection } from '@/hooks/useTVDetection';
import TVSidebar from '@/components/layout/TVSidebar';

/**
 * Conmuta el CUERPO de una página de detalle entre la vista web (children) y la
 * vista TV (tvBody), según la detección de TV en cliente (cookie
 * filmify_tv_mode / heurística de UA).
 *
 * Antes esta decisión se tomaba en el servidor leyendo cookies()/headers() y
 * searchParams en cada página de detalle. Moverla a cliente elimina esas
 * lecturas de request del render del servidor (menos overhead por SSR) y deja
 * el cuerpo web como contenido estático del componente servidor.
 *
 * Hasta que el cliente monta, se muestra la vista web (sin parpadeo para el
 * 99% de usuarios; en una TV real hay un breve swap tras la hidratación, coste
 * aceptable).
 */
export default function TVBodySwitch({
    children,
    tvBody,
}: {
    children: React.ReactNode;
    tvBody: React.ReactNode;
}) {
    const { isTV } = useTVDetection();

    if (!isTV) return <>{children}</>;

    // Overlay a pantalla completa, escapando el layout normal (sidebar/header).
    return (
        <div className="fixed inset-0 z-[100] bg-background text-white overflow-y-auto overflow-x-hidden">
            <div className="flex min-h-screen">
                <TVSidebar />
                <main className="flex-1 ml-0 lg:ml-24 p-8 overflow-x-hidden">
                    {tvBody}
                </main>
            </div>
        </div>
    );
}
