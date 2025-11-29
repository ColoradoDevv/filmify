'use client';

import { useIsSidebarCollapsed } from '@/lib/store/useStore';

export default function PlatformContent({
    children,
}: {
    children: React.ReactNode;
}) {
    const isCollapsed = useIsSidebarCollapsed();

    return (
        <div
            className={`transition-all duration-300 ${isCollapsed ? 'lg:pl-20' : 'lg:pl-64'
                }`}
        >
            {children}
        </div>
    );
}
