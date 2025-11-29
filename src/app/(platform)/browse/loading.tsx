import { Loader2 } from 'lucide-react';

export default function Loading() {
    return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="flex flex-col items-center gap-6">
                {/* Logo */}
                <img
                    src="/logo-full.svg"
                    alt="FilmiFy"
                    className="h-12 w-auto animate-pulse"
                />
                {/* Spinner */}
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="text-text-secondary text-sm">Cargando películas...</p>
            </div>
        </div>
    );
}
