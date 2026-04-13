import Link from 'next/link';
import { AlertCircle } from 'lucide-react';

export default function AuthCodeErrorPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <div className="w-full max-w-md card-premium p-8 border border-surface-light/50 text-center">
                <div className="flex justify-center mb-4">
                    <AlertCircle className="w-14 h-14 text-amber-500" aria-hidden />
                </div>
                <h1 className="text-2xl font-bold text-text-primary mb-2">No pudimos completar el acceso</h1>
                <p className="text-text-secondary text-sm mb-8">
                    El enlace de confirmación caducó o ya fue usado. Solicita un nuevo correo desde la página de
                    confirmación o inicia sesión si tu cuenta ya está activa.
                </p>
                <div className="flex flex-col gap-3">
                    <Link
                        href="/login"
                        className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-primary to-accent text-white font-semibold text-center"
                    >
                        Ir a iniciar sesión
                    </Link>
                    <Link
                        href="/confirm-email"
                        className="w-full px-4 py-3 rounded-xl border border-surface-light text-text-primary font-medium text-center hover:bg-surface-light/30 transition-colors"
                    >
                        Confirmar correo
                    </Link>
                </div>
            </div>
        </div>
    );
}
