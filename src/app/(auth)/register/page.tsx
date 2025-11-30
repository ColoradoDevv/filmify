'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, User, AlertCircle, Loader2, ArrowLeft, Eye, EyeOff, Sparkles, Check, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import HCaptcha from '@hcaptcha/react-hcaptcha';

export default function RegisterPage() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        name: '',
        username: '',
        email: '',
        password: '',
    });
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [passwordFocused, setPasswordFocused] = useState(false);
    const [captchaToken, setCaptchaToken] = useState<string | null>(null);
    const [usernameStatus, setUsernameStatus] = useState<'default' | 'success' | 'error' | 'loading'>('default');
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [acceptedTerms, setAcceptedTerms] = useState(false);

    const captchaRef = useRef<HCaptcha>(null);
    const checkTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const supabase = createClient();

    // Check registration setting
    const [registrationAllowed, setRegistrationAllowed] = useState(true);
    const [checkingSettings, setCheckingSettings] = useState(true);

    useEffect(() => {
        import('@/app/admin/settings/actions').then(({ fetchSettings }) => {
            fetchSettings().then(settings => {
                setRegistrationAllowed(settings.allowRegistration);
                setCheckingSettings(false);
            });
        });
    }, []);

    if (!checkingSettings && !registrationAllowed) {
        return (
            <div className="relative flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
                <Link
                    href="/"
                    className="absolute top-0 left-0 inline-flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors mb-4 group"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    <span className="text-sm font-medium">Volver al inicio</span>
                </Link>
                <div className="bg-red-500/10 p-6 rounded-full mb-6">
                    <User className="w-16 h-16 text-red-500" />
                </div>
                <h1 className="text-3xl font-bold text-white mb-4">Registro Cerrado</h1>
                <p className="text-gray-400 max-w-md mb-8">
                    Lo sentimos, el registro de nuevos usuarios está temporalmente deshabilitado.
                    Por favor, intenta más tarde o contacta al administrador.
                </p>
                <Link href="/" className="px-6 py-3 bg-surface border border-surface-light rounded-xl hover:bg-surface-light transition-colors">
                    Volver al Inicio
                </Link>
            </div>
        );
    }

    // Blacklist validation
    const blacklist = useMemo(() => [
        // Roles & System
        'admin', 'administrator', 'root', 'sysadmin', 'system', 'support', 'help', 'mod', 'moderator',
        'staff', 'official', 'filmify', 'owner', 'ceo', 'webmaster', 'dev', 'developer',

        // Offensive (Spanish)
        'puto', 'puta', 'mierda', 'cabron', 'pendejo', 'verga', 'pito', 'culo', 'coño',
        'mamaguevo', 'zorra', 'perra', 'maricon', 'marica', 'idiota', 'estupido', 'imbecil',
        'bastardo', 'polla', 'semen', 'tetas', 'vagina', 'concha', 'chupala', 'gonorrea',
        'malparido', 'carechimba', 'pajero', 'pajera',

        // Offensive (English)
        'dick', 'ass', 'bitch', 'fuck', 'shit', 'bastard', 'cunt', 'whore', 'slut',
        'nigger', 'nigga', 'faggot', 'rape', 'sex', 'porn', 'cock', 'pussy', 'tit', 'boob',
        'anus', 'anal', 'penis', 'vagina', 'nazi', 'hitler', 'kkk'
    ], []);

    // Password validation rules
    const passwordValidation = useMemo(() => {
        const password = formData.password;
        return {
            minLength: password.length >= 8,
            hasUppercase: /[A-Z]/.test(password),
            hasLowercase: /[a-z]/.test(password),
            hasNumber: /[0-9]/.test(password),
            hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password),
        };
    }, [formData.password]);

    const isPasswordValid = Object.values(passwordValidation).every(Boolean);

    const checkUsernameUnique = async (username: string) => {
        const { data, error } = await supabase
            .from('profiles')
            .select('username')
            .eq('username', username)
            .single();

        return !data;
    };

    const generateSuggestions = async (baseName: string, isBlacklisted: boolean) => {
        const newSuggestions: string[] = [];
        const randomSuffix = () => Math.floor(Math.random() * 1000);

        if (isBlacklisted) {
            // Generate completely different thematic names
            const prefixes = ['Cinefilo', 'MovieBuff', 'FilmFan', 'Director', 'Actor', 'Viewer'];
            for (let i = 0; i < 3; i++) {
                const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
                newSuggestions.push(`${prefix}_${randomSuffix()}`);
            }
        } else {
            // Generate variations of the base name
            newSuggestions.push(`${baseName}_${randomSuffix()}`);
            newSuggestions.push(`${baseName}${randomSuffix()}`);
            newSuggestions.push(`The${baseName}`);
        }

        // Verify suggestions are unique
        const verifiedSuggestions: string[] = [];
        for (const suggestion of newSuggestions) {
            const isUnique = await checkUsernameUnique(suggestion);
            if (isUnique) verifiedSuggestions.push(suggestion);
            if (verifiedSuggestions.length >= 3) break;
        }

        return verifiedSuggestions;
    };

    const validateUsername = async (username: string) => {
        if (username.length < 3) {
            setUsernameStatus('error');
            setSuggestions([]);
            return;
        }

        setUsernameStatus('loading');
        setSuggestions([]);

        // Check blacklist
        const lowerVal = username.toLowerCase();
        const isBlacklisted = blacklist.some(word => lowerVal.includes(word));

        if (isBlacklisted) {
            setUsernameStatus('error');
            const newSuggestions = await generateSuggestions(username, true);
            setSuggestions(newSuggestions);
            return;
        }

        // Check uniqueness
        const isUnique = await checkUsernameUnique(username);
        if (!isUnique) {
            setUsernameStatus('error');
            const newSuggestions = await generateSuggestions(username, false);
            setSuggestions(newSuggestions);
        } else {
            setUsernameStatus('success');
            setSuggestions([]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!isPasswordValid) {
            setError('Por favor, cumple con todos los requisitos de seguridad de la contraseña.');
            return;
        }

        if (!captchaToken) {
            setError('Por favor, completa el captcha para continuar.');
            return;
        }

        if (usernameStatus !== 'success') {
            setError('Por favor, elige un nickname válido.');
            return;
        }

        if (!acceptedTerms) {
            setError('Debes aceptar los Términos y Condiciones para continuar.');
            return;
        }

        setLoading(true);

        try {
            // Final check just to be sure
            const isUnique = await checkUsernameUnique(formData.username);
            if (!isUnique) {
                setError('Este nickname ya está en uso. Por favor elige otro.');
                setUsernameStatus('error');
                setLoading(false);
                return;
            }

            const fullName = formData.name.trim() || formData.username;

            const { data, error } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    data: {
                        full_name: fullName,
                        username: formData.username,
                    },
                    captchaToken,
                    emailRedirectTo: `${window.location.origin}/auth/callback`,
                },
            });

            if (error) {
                console.error('Supabase signup error:', error);
                setError(error.message || 'Error al crear la cuenta. Intenta con otro email.');
                captchaRef.current?.resetCaptcha();
                setCaptchaToken(null);
                return;
            }

            if (data?.user && !data.session) {
                router.push(`/confirm-email?email=${encodeURIComponent(formData.email)}`);
                return;
            }

            router.push('/browse');
            router.refresh();
        } catch (err) {
            console.error('Unexpected error:', err);
            setError('Ocurrió un error inesperado');
            captchaRef.current?.resetCaptcha();
            setCaptchaToken(null);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value,
        }));

        if (name === 'username') {
            // Clear previous timeout
            if (checkTimeoutRef.current) {
                clearTimeout(checkTimeoutRef.current);
            }

            // Immediate feedback for length
            if (value.length > 0 && value.length < 3) {
                setUsernameStatus('error');
                setSuggestions([]);
            } else if (value.length === 0) {
                setUsernameStatus('default');
                setSuggestions([]);
            } else {
                // Debounce validation
                setUsernameStatus('loading');
                checkTimeoutRef.current = setTimeout(() => {
                    validateUsername(value);
                }, 500);
            }
        }
    };

    const applySuggestion = (suggestion: string) => {
        setFormData(prev => ({ ...prev, username: suggestion }));
        setUsernameStatus('success');
        setSuggestions([]);
    };

    return (
        <div className="relative">
            {/* Back to home button */}
            <Link
                href="/"
                className="inline-flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors mb-4 group"
            >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                <span className="text-sm font-medium">Volver al inicio</span>
            </Link>

            {/* Register Card */}
            <div className="card-premium p-6 sm:p-8 border border-surface-light/50 backdrop-blur-xl bg-surface/95">
                {/* Logo */}
                <div className="flex justify-center mb-4">
                    <Link href="/" className="group">
                        <img
                            src="/logo-full.svg"
                            alt="FilmiFy Logo"
                            className="h-10 w-auto group-hover:scale-105 transition-transform duration-300"
                        />
                    </Link>
                </div>

                {/* Header */}
                <div className="text-center mb-5">
                    <h1 className="text-2xl sm:text-3xl font-bold mb-2">
                        Únete a <span className="text-gradient-premium">FilmiFy</span>
                    </h1>
                    <p className="text-text-secondary">
                        Crea tu cuenta y comienza tu aventura cinematográfica
                    </p>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-2.5 rounded-xl mb-4 flex items-center gap-3 animate-fade-in-up">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        <span className="text-sm font-medium">{error}</span>
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Username Field (Nickname) */}
                    <div>
                        <label
                            htmlFor="username"
                            className="block text-sm font-semibold mb-1.5 text-text-primary"
                        >
                            Nickname (Usuario) <span className="text-red-400">*</span>
                        </label>
                        <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted pointer-events-none" />
                            <input
                                type="text"
                                id="username"
                                name="username"
                                value={formData.username}
                                onChange={handleChange}
                                required
                                minLength={3}
                                autoComplete="username"
                                className={`w-full pl-12 pr-4 py-3 bg-surface border rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 transition-all ${usernameStatus === 'error'
                                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                                    : usernameStatus === 'success'
                                        ? 'border-green-500 focus:border-green-500 focus:ring-green-500/20'
                                        : 'border-surface-light focus:border-primary focus:ring-primary/20'
                                    }`}
                                placeholder="Tu nickname único"
                            />
                            {usernameStatus === 'loading' && (
                                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                    <Loader2 className="w-4 h-4 animate-spin text-text-muted" />
                                </div>
                            )}
                        </div>

                        {/* Suggestions */}
                        {suggestions.length > 0 && (
                            <div className="mt-2 animate-fade-in-up">
                                <p className="text-xs text-text-secondary mb-1.5">Sugerencias disponibles:</p>
                                <div className="flex flex-wrap gap-2">
                                    {suggestions.map((suggestion) => (
                                        <button
                                            key={suggestion}
                                            type="button"
                                            onClick={() => applySuggestion(suggestion)}
                                            className="px-3 py-1 text-xs font-medium bg-surface-light/50 hover:bg-primary/20 hover:text-primary border border-surface-light hover:border-primary/30 rounded-full transition-all"
                                        >
                                            {suggestion}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Name Field (Display Name) */}
                    <div>
                        <label
                            htmlFor="name"
                            className="block text-sm font-semibold mb-1.5 text-text-primary"
                        >
                            Nombre para mostrar <span className="text-text-secondary font-normal text-xs">(Opcional)</span>
                        </label>
                        <div className="relative">
                            <Sparkles className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted pointer-events-none" />
                            <input
                                type="text"
                                id="name"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                autoComplete="name"
                                className="w-full pl-12 pr-4 py-3 bg-surface border border-surface-light rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                                placeholder={formData.username || "Tu nombre visible"}
                            />
                        </div>
                        <p className="text-xs text-text-secondary mt-1 ml-1">
                            Si lo dejas vacío, usaremos tu nickname.
                        </p>
                    </div>

                    {/* Email Field */}
                    <div>
                        <label
                            htmlFor="email"
                            className="block text-sm font-semibold mb-1.5 text-text-primary"
                        >
                            Correo Electrónico <span className="text-red-400">*</span>
                        </label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted pointer-events-none" />
                            <input
                                type="email"
                                id="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                required
                                autoComplete="email"
                                className="w-full pl-12 pr-4 py-3 bg-surface border border-surface-light rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                                placeholder="tu@email.com"
                            />
                        </div>
                    </div>

                    {/* Password Field */}
                    <div>
                        <label
                            htmlFor="password"
                            className="block text-sm font-semibold mb-1.5 text-text-primary"
                        >
                            Contraseña <span className="text-red-400">*</span>
                        </label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted pointer-events-none" />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                id="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                onFocus={() => setPasswordFocused(true)}
                                onBlur={() => setPasswordFocused(false)}
                                required
                                autoComplete="new-password"
                                className="w-full pl-12 pr-12 py-3 bg-surface border border-surface-light rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                                placeholder="••••••••"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
                                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                            >
                                {showPassword ? (
                                    <EyeOff className="w-5 h-5" />
                                ) : (
                                    <Eye className="w-5 h-5" />
                                )}
                            </button>
                        </div>

                        {/* Password Requirements Checklist */}
                        {(passwordFocused || formData.password.length > 0) && (
                            <div className="mt-3 p-3 bg-surface/50 border border-surface-light rounded-lg space-y-2 animate-fade-in-up">
                                <p className="text-xs font-semibold text-text-secondary mb-2">Requisitos de seguridad:</p>
                                <div className="space-y-1.5">
                                    <div className="flex items-center gap-2">
                                        {passwordValidation.minLength ? (
                                            <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                                        ) : (
                                            <X className="w-4 h-4 text-text-muted flex-shrink-0" />
                                        )}
                                        <span className={`text-xs ${passwordValidation.minLength ? 'text-green-500' : 'text-text-muted'}`}>
                                            Mínimo 8 caracteres
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {passwordValidation.hasUppercase ? (
                                            <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                                        ) : (
                                            <X className="w-4 h-4 text-text-muted flex-shrink-0" />
                                        )}
                                        <span className={`text-xs ${passwordValidation.hasUppercase ? 'text-green-500' : 'text-text-muted'}`}>
                                            Una mayúscula
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {passwordValidation.hasLowercase ? (
                                            <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                                        ) : (
                                            <X className="w-4 h-4 text-text-muted flex-shrink-0" />
                                        )}
                                        <span className={`text-xs ${passwordValidation.hasLowercase ? 'text-green-500' : 'text-text-muted'}`}>
                                            Una minúscula
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {passwordValidation.hasNumber ? (
                                            <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                                        ) : (
                                            <X className="w-4 h-4 text-text-muted flex-shrink-0" />
                                        )}
                                        <span className={`text-xs ${passwordValidation.hasNumber ? 'text-green-500' : 'text-text-muted'}`}>
                                            Un número
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {passwordValidation.hasSpecial ? (
                                            <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                                        ) : (
                                            <X className="w-4 h-4 text-text-muted flex-shrink-0" />
                                        )}
                                        <span className={`text-xs ${passwordValidation.hasSpecial ? 'text-green-500' : 'text-text-muted'}`}>
                                            Un carácter especial (!@#$...)
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* hCaptcha */}
                    <div className="flex justify-center py-2">
                        <HCaptcha
                            sitekey={process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY!}
                            onVerify={(token) => setCaptchaToken(token)}
                            ref={captchaRef}
                            theme="dark"
                        />
                    </div>

                    {/* Terms and Conditions Checkbox */}
                    <div className="flex items-start gap-3 p-4 bg-surface/50 border border-surface-light rounded-xl">
                        <input
                            type="checkbox"
                            id="acceptTerms"
                            checked={acceptedTerms}
                            onChange={(e) => setAcceptedTerms(e.target.checked)}
                            className="mt-0.5 w-4 h-4 rounded border-surface-light bg-surface text-primary focus:ring-2 focus:ring-primary/20 focus:ring-offset-0 cursor-pointer"
                        />
                        <label htmlFor="acceptTerms" className="text-sm text-text-secondary cursor-pointer select-none">
                            Acepto los{' '}
                            <Link
                                href="/legal/terms"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:text-accent font-semibold underline transition-colors"
                            >
                                Términos y Condiciones
                            </Link>
                            {' '}y la{' '}
                            <Link
                                href="/legal/privacy"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:text-accent font-semibold underline transition-colors"
                            >
                                Política de Privacidad
                            </Link>
                            {' '}de FilmiFy.
                        </label>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full px-6 py-3.5 bg-gradient-to-r from-primary to-accent text-white rounded-xl font-semibold hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2 shadow-lg shadow-primary/20 mt-5"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Creando cuenta...
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-4 h-4" />
                                Crear Cuenta
                            </>
                        )}
                    </button>
                </form>

                {/* Divider */}
                <div className="relative my-5">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-surface-light/50" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-4 bg-surface text-text-muted">o</span>
                    </div>
                </div>

                {/* Sign up link */}
                <div className="text-center">
                    <p className="text-text-secondary text-sm">
                        ¿Ya tienes cuenta?{' '}
                        <Link
                            href="/login"
                            className="text-primary hover:text-accent font-semibold transition-colors"
                        >
                            Inicia sesión aquí
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
