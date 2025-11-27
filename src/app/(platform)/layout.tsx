import Sidebar from '@/components/layout/Sidebar';

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
            <div className="lg:pl-64">
                {/* Top Navbar for Mobile */}
                <div className="lg:hidden sticky top-0 z-40 bg-surface border-b border-surface-light px-4 py-4">
                    <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-gradient">FilmiFy</span>
                    </div>
                </div>

                {/* Page Content */}
                <main className="p-4 sm:p-6 lg:p-8">
                    {children}
                </main>
            </div>
        </div>
    );
}
