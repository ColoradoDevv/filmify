import { Suspense } from 'react';
import type { Metadata } from 'next';
import { Loader2 } from 'lucide-react';

// Personal, auth-gated route — exclude from search engines.
// (page.tsx is a client component, so metadata lives here.)
export const metadata: Metadata = {
    robots: { index: false, follow: false },
};

/**
 * Suspense: la página lee la pestaña activa de `useSearchParams`, y sin un
 * límite alrededor Next no puede prerenderizar la ruta.
 */
export default function Layout({ children }: { children: React.ReactNode }) {
    return (
        <Suspense
            fallback={
                <div className="flex min-h-[50vh] items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" aria-label="Cargando ajustes" />
                </div>
            }
        >
            {children}
        </Suspense>
    );
}
