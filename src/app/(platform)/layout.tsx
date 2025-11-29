import Sidebar from '@/components/layout/Sidebar';
import SearchInput from '@/components/features/SearchInput';
import PlatformContent from '@/components/layout/PlatformContent';

export default function PlatformLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-background">
            {/* Sidebar - Fixed on desktop, hidden on mobile */}
            <Sidebar />

            {/* Main Content Area */}
            <PlatformContent>
                {/* Top Navbar for Mobile & Desktop Search */}
                <div className="sticky top-0 z-40 bg-surface border-b border-surface-light px-4 py-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2 lg:hidden">
                        <span className="text-2xl font-bold text-gradient">FilmiFy</span>
                    </div>

                    <div className="flex-1 max-w-xl ml-auto">
                        <SearchInput className="w-full" placeholder="Buscar películas, series..." />
                    </div>
                </div>

                {/* Page Content */}
                <main className="p-4 sm:p-6 lg:p-8">
                    {children}
                </main>
            </PlatformContent>
        </div>
    );
}
