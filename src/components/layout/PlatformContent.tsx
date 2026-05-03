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
            className={`transition-all duration-300 ${isCollapsed ? 'lg:pl-[72px]' : 'lg:pl-56'
                }`}
        >
            {children}
        </div>
    );
}
