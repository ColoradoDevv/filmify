import AuthBackground from '@/components/auth/AuthBackground';
import type { Metadata } from 'next';

// Auth pages must never appear in search results.
export const metadata: Metadata = {
    title: 'Acceso - FilmiFy',
    robots: { index: false, follow: false },
};

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
            <AuthBackground />
            <div className="w-full max-w-md relative z-10 p-4">
                {children}
            </div>
        </div>
    );
}
