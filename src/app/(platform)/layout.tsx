import Sidebar from '@/components/layout/Sidebar';
import PlatformContent from '@/components/layout/PlatformContent';
import PlatformHeader from '@/components/layout/PlatformHeader';

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
                {/* Top Navbar with User Avatar */}
                <PlatformHeader />

                {/* Page Content */}
                <main className="p-4 sm:p-6 lg:p-8">
                    {children}
                </main>
            </PlatformContent>
        </div>
    );
}
