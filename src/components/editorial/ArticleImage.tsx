'use client';

import { useState } from 'react';

// Imágenes de fallback curadas por categoría (Unsplash, libres de uso)
const CATEGORY_FALLBACKS: Record<string, string> = {
    peliculas:  'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=1200&auto=format&fit=crop',
    series:     'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?q=80&w=1200&auto=format&fit=crop',
    streaming:  'https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=1200&auto=format&fit=crop',
    noticias:   'https://images.unsplash.com/photo-1585951237318-9ea5e175b891?q=80&w=1200&auto=format&fit=crop',
    premios:    'https://images.unsplash.com/photo-1567593810070-7a3d471af022?q=80&w=1200&auto=format&fit=crop',
    guias:      'https://images.unsplash.com/photo-1485846234645-a62644f84728?q=80&w=1200&auto=format&fit=crop',
    consejos:   'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=1200&auto=format&fit=crop',
    general:    'https://images.unsplash.com/photo-1478720568477-152d9b164e26?q=80&w=1200&auto=format&fit=crop',
};

const DEFAULT_FALLBACK = 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?q=80&w=1200&auto=format&fit=crop';

interface ArticleImageProps {
    src: string | null;
    alt: string;
    category?: string;
    /** When true, renders as position:absolute fill (parent must be position:relative) */
    fill?: boolean;
    width?: number;
    height?: number;
    className?: string;
    sizes?: string;
    priority?: boolean;
}

export default function ArticleImage({
    src,
    alt,
    category = 'general',
    fill,
    className = '',
    priority,
}: ArticleImageProps) {
    const fallback = CATEGORY_FALLBACKS[category] ?? DEFAULT_FALLBACK;
    const [imgSrc, setImgSrc] = useState<string>(src || fallback);

    const handleError = () => {
        if (imgSrc !== fallback) {
            setImgSrc(fallback);
        }
    };

    const fillStyles: React.CSSProperties = fill
        ? { position: 'absolute', inset: 0, width: '100%', height: '100%' }
        : {};

    return (
        <img
            src={imgSrc}
            alt={alt}
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
            onError={handleError}
            className={className}
            style={fillStyles}
        />
    );
}
