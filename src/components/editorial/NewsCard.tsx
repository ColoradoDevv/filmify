'use client';

import { ExternalLink, Newspaper } from 'lucide-react';

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

    return (
        <a
            href={item.original_url}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="group flex gap-3 p-3 rounded-xl hover:bg-surface-container-high transition-all duration-150 border border-transparent hover:border-outline-variant"
        >
            {/* Thumbnail */}
            <div className="w-20 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-surface-container-high">
                {item.image_url ? (
                    <img
                        src={item.image_url}
                        alt={item.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) => {
                            (e.currentTarget as HTMLImageElement).style.display = 'none';
                        }}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <Newspaper className="w-5 h-5 text-on-surface-variant/30" />
                    </div>
                )}
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
