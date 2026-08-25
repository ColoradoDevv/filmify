import Link from 'next/link';
import { Film, Tv, Swords, Drama, BookOpen, Users, Heart } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { isDoramasEnabled } from '@/lib/env';

interface QuickModule {
    name: string;
    href: string;
    icon: LucideIcon;
}

/**
 * Acceso rápido a todos los módulos, justo debajo del hero.
 *
 * La home tenía tres listados de películas encadenados y ninguna vía directa a
 * anime, doramas, editorial o watch party salvo la sidebar — que en móvil no
 * existe. Esta tira cubre el catálogo entero en una sola fila: enlaces planos,
 * sin imágenes ni JS, así que añade acceso sin añadir peso.
 *
 * El orden replica el de la sidebar (`SECTIONS`) para que la navegación sea
 * predecible entre ambas.
 */
function buildModules(): QuickModule[] {
    return [
        { name: 'Películas', href: '/browse?category=movie', icon: Film },
        { name: 'Series', href: '/browse?category=tv', icon: Tv },
        { name: 'Anime', href: '/anime', icon: Swords },
        // Doramas: solo cuando el módulo está abierto (ver `isDoramasEnabled`).
        ...(isDoramasEnabled()
            ? [{ name: 'Doramas', href: '/doramas', icon: Drama }]
            : []),
        { name: 'Editorial', href: '/editorial', icon: BookOpen },
        { name: 'Watch Party', href: '/watch-party', icon: Users },
        { name: 'Favoritos', href: '/favorites', icon: Heart },
    ];
}

export default function ModuleQuickAccess() {
    const modules = buildModules();

    return (
        <nav aria-label="Secciones de FilmiFy">
            <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary">
                Explora
            </p>

            {/*
             * Móvil: fila con scroll horizontal para que quepa siempre en una
             * línea. sm+: rejilla auto-fit, que se reparte sola tanto con 6
             * módulos como con 7 (doramas depende de un flag).
             */}
            <ul className="flex gap-2 overflow-x-auto scrollbar-hide px-1 -mx-1 pb-1 sm:mx-0 sm:grid sm:grid-cols-[repeat(auto-fit,minmax(112px,1fr))] sm:overflow-visible sm:px-0 sm:pb-0">
                {modules.map(({ name, href, icon: Icon }) => (
                    <li key={href} className="shrink-0 sm:shrink">
                        <Link
                            href={href}
                            className="group flex h-full w-[96px] flex-col items-center justify-center gap-2 rounded-2xl border border-outline-variant bg-surface-container-low px-2 py-3.5 transition-colors duration-200 hover:border-primary/40 hover:bg-surface-container focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:w-auto"
                        >
                            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary-container text-on-secondary-container transition-transform duration-200 group-hover:scale-110">
                                <Icon className="h-4 w-4" strokeWidth={2} aria-hidden />
                            </span>
                            <span className="text-center text-xs font-semibold leading-tight text-text-secondary transition-colors group-hover:text-white">
                                {name}
                            </span>
                        </Link>
                    </li>
                ))}
            </ul>
        </nav>
    );
}
