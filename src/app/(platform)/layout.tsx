import { Suspense } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import PlatformContent from '@/components/layout/PlatformContent';
import PlatformHeader from '@/components/layout/PlatformHeader';
import TVSidebar from '@/components/layout/TVSidebar';
import MobileTabBar from '@/components/layout/MobileTabBar';
import AdBanner1 from '@/components/ads/AdBanner1';
import AdBanner2 from '@/components/ads/AdBanner2';
import { isTVDevice } from '@/lib/device-detection';


export default async function PlatformLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const isTV = await isTVDevice();

    if (isTV) {
        return (
            <div className="min-h-screen bg-background text-white">
                <TVSidebar />
                <main className="ml-16 lg:ml-24 p-4 lg:p-8 overflow-x-hidden">
                    {children}
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Sidebar - Fixed on desktop, hidden on mobile.
                Suspense: Sidebar uses useSearchParams (active-state detection). */}
            <Suspense fallback={null}>
                <Sidebar />
            </Suspense>

            {/* Main Content Area */}
            <PlatformContent>
                {/* Top Navbar with User Avatar */}
                <PlatformHeader />

                {/* Page Content — padding móvil reducido, generoso en desktop */}
                <main className="px-3 py-4 sm:px-6 sm:py-6 lg:p-8">
                    {children}

                    {/* Publicidad — al pie del contenido en TODAS las vistas
                        de plataforma (browse, search, género, live-tv, movie,
                        tv, favoritos, listas, perfil, ajustes, watch-party).
                        Una sola unidad: AdBanner1 usa un id de contenedor fijo
                        y no admite duplicados en la misma página. */}
                    <div className="mt-10 pt-6 border-t border-white/5" role="complementary" aria-label="Publicidad">
                        <p className="text-[10px] uppercase tracking-widest text-text-muted/50 text-center mb-2 select-none">
                            Publicidad
                        </p>
                        <AdBanner1 />
                        <AdBanner2 />
                    </div>
                </main>
            </PlatformContent>

            {/* Navegación inferior — solo móvil/tablet.
                Suspense: MobileTabBar usa useSearchParams (active-state detection). */}
            <Suspense fallback={null}>
                <MobileTabBar />
            </Suspense>
        </div>
    );
}
