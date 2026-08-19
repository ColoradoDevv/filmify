import type { LucideIcon } from 'lucide-react';
import HeroPosterCollage from './HeroPosterCollage';

interface ModuleHeroProps {
    /** Pósters del contenido del módulo (poster_path de TMDB o URL absoluta) para el mosaico de fondo. */
    posters: (string | null | undefined)[];
    icon: LucideIcon;
    iconClassName?: string;
    badgeLabel: string;
    /** Texto plano antes del nombre del módulo, ej. "Explora " */
    titlePrefix?: string;
    /** Nombre del módulo, resaltado con degradado */
    titleHighlight: string;
    description: string;
    maxWidthClassName?: string;
}

/**
 * Hero estilo Netflix compartido por los módulos de catálogo (películas,
 * series, anime, doramas, géneros): mosaico de pósters del propio módulo de
 * fondo + badge/título/descripción encima. Cada módulo aporta su contenido
 * (pósters, ícono, textos) pero comparte el mismo lenguaje visual.
 */
export default function ModuleHero({
    posters,
    icon: Icon,
    iconClassName = 'text-primary',
    badgeLabel,
    titlePrefix,
    titleHighlight,
    description,
    maxWidthClassName = 'max-w-2xl',
}: ModuleHeroProps) {
    return (
        <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden border border-white/5 shadow-2xl min-h-[200px] sm:min-h-[260px] flex items-center">
            <HeroPosterCollage posters={posters} />

            <div className={`relative z-10 p-5 sm:p-12 ${maxWidthClassName}`}>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-full border border-white/10 mb-3 sm:mb-4">
                    <Icon className={`w-4 h-4 ${iconClassName}`} />
                    <span className="text-xs font-medium text-white/90">{badgeLabel}</span>
                </div>

                <h1 className="text-2xl sm:text-5xl font-bold text-white tracking-tight mb-2 sm:mb-3 drop-shadow-lg">
                    {titlePrefix}
                    <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                        {titleHighlight}
                    </span>
                </h1>
                <p className="text-white/80 text-sm sm:text-lg leading-relaxed drop-shadow">
                    {description}
                </p>
            </div>
        </div>
    );
}
