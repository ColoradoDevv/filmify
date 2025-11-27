'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Film, LogOut, User } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { User as SupabaseUser } from '@supabase/supabase-js';

export default function Navbar() {
    const pathname = usePathname();
    const router = useRouter();
    const [user, setUser] = useState<SupabaseUser | null>(null);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    const isAuthPage = pathname?.startsWith('/login') || pathname?.startsWith('/register');

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
            setLoading(false);
        };

        getUser();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });

        return () => subscription.unsubscribe();
    }, [supabase]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.refresh();
        router.push('/');
    };

    return (
        <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-surface-light">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2 group">
                        <Film className="w-8 h-8 text-primary group-hover:text-primary-hover transition-colors" />
                        <span className="text-2xl font-bold">
                            <span className="text-gradient">FilmiFy</span>
                        </span>
                    </Link>

                    {/* Navigation Links */}
                    <div className="flex items-center gap-4">
                        {!loading && !isAuthPage && (
                            <>
                                {user ? (
                                    <div className="flex items-center gap-4">
                                        <Link
                                            href="/browse"
                                            className="text-text-secondary hover:text-text-primary transition-colors px-3 py-2 rounded-lg hover:bg-surface"
                                        >
                                            Explorar
                                        </Link>
                                        <div className="flex items-center gap-3 pl-4 border-l border-surface-light">
                                            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                                                <User className="w-4 h-4" />
                                            </div>
                                            <button
                                                onClick={handleLogout}
                                                className="p-2 text-text-secondary hover:text-red-500 transition-colors rounded-lg hover:bg-surface"
                                                title="Cerrar Sesión"
                                            >
                                                <LogOut className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <Link
                                            href="/login"
                                            className="text-text-secondary hover:text-text-primary transition-colors font-medium"
                                        >
                                            Iniciar Sesión
                                        </Link>
                                        <Link
                                            href="/register"
                                            className="px-4 py-2 rounded-lg bg-primary text-white font-medium hover:bg-primary-hover transition-colors"
                                        >
                                            Registrarse
                                        </Link>
                                    </>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
}
