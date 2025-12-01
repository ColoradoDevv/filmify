import Sidebar from '@/components/layout/Sidebar';
import PlatformContent from '@/components/layout/PlatformContent';
import PlatformHeader from '@/components/layout/PlatformHeader';
import TVSidebar from '@/components/layout/TVSidebar';
import { isTVDevice } from '@/lib/device-detection';

export default async function PlatformLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const isTV = await isTVDevice();

    if (isTV) {
        return (
            <div className="flex min-h-screen bg-background text-white">
                <TVSidebar />
                <main className="flex-1 ml-0 lg:ml-24 p-8 overflow-x-hidden">
                    {children}
                </main>
            </div>
        );
    }

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
