'use client';

import { ExternalLink } from 'lucide-react';

// Fallbacks por fuente de noticias y genérico
const SOURCE_FALLBACKS: Record<string, string> = {
    'Variety':                  'https://images.unsplash.com/photo-1585951237318-9ea5e175b891?q=80&w=400&auto=format&fit=crop',
    'The Hollywood Reporter':   'https://images.unsplash.com/photo-1478720568477-152d9b164e26?q=80&w=400&auto=format&fit=crop',
    'Deadline':                 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=400&auto=format&fit=crop',
    'IndieWire':                'https://images.unsplash.com/photo-1485846234645-a62644f84728?q=80&w=400&auto=format&fit=crop',
    'Screen Rant':              'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?q=80&w=400&auto=format&fit=crop',
};
const NEWS_FALLBACK = 'https://images.unsplash.com/photo-1585951237318-9ea5e175b891?q=80&w=400&auto=format&fit=crop';

interface NewsItem {
    id: string;
    title: string;
    excerpt: string;
    image_url: string | null;
    source_name: string;
    source_url: string;
    author: string | null;
    original_url: string;
    published_at: string | null;
}

export default function NewsCard({ item }: { item: NewsItem }) {
    const date = item.published_at
        ? new Date(item.published_at).toLocaleDateString('es-ES', {
              day: 'numeric', month: 'short', year: 'numeric',
          })
        : '';

    const fallback = SOURCE_FALLBACKS[item.source_name] ?? NEWS_FALLBACK;
    const imgSrc = item.image_url || fallback;

    return (
        <a
            href={item.original_url}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="group flex gap-3 p-3 rounded-xl hover:bg-surface-container-high transition-all duration-150 border border-transparent hover:border-outline-variant"
        >
            {/* Thumbnail */}
            <div className="w-20 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-surface-container-high">
                <img
                    src={imgSrc}
                    alt={item.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                        const img = e.currentTarget as HTMLImageElement;
                        if (img.src !== fallback) img.src = fallback;
                    }}
                />
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
                <h4 className="text-xs font-semibold text-on-surface group-hover:text-primary transition-colors line-clamp-2 leading-snug mb-1">
                    {item.title}
                </h4>
                <div className="flex items-center gap-1.5 text-[10px] text-on-surface-variant">
                    <span className="font-medium text-primary/70">{item.source_name}</span>
                    {item.author && <><span>·</span><span>{item.author}</span></>}
                    {date && <><span>·</span><span>{date}</span></>}
                    <ExternalLink className="w-2.5 h-2.5 ml-auto flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
            </div>
        </a>
    );
}
