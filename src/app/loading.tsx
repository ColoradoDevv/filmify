import { Loader2 } from 'lucide-react';

export default function Loading() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-6">
                {/* Logo */}
                <img
                    src="/logo-full.svg"
                    alt="FilmiFy"
                    className="h-16 w-auto animate-pulse"
                />
                {/* Spinner */}
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        </div>
    );
}
