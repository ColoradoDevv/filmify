'use client';

/**
 * Buscador de títulos para Watch Party (y otros flujos de selección).
 * Usa la server action `searchTitles`, que aplica EXACTAMENTE los mismos
 * filtros de disponibilidad que el catálogo: solo aparecen títulos
 * reproducibles en el proveedor — nunca se ofrece algo que no se pueda ver.
 */
import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Search, Loader2, Film, Check, Tv } from 'lucide-react';
import { searchTitles, type SearchResultItem } from '@/app/actions/search';

export type PickedTitle = {
    id: number;
    title: string;
    poster_path: string | null;
    media_type: 'movie' | 'tv';
    year: string;
};

function toPicked(item: SearchResultItem): PickedTitle {
    const anyItem = item as SearchResultItem & {
        title?: string; name?: string; release_date?: string; first_air_date?: string;
    };
    return {
        id: item.id,
        title: anyItem.title || anyItem.name || 'Sin título',
        poster_path: item.poster_path ?? null,
        media_type: item.media_type,
        year: (anyItem.release_date || anyItem.first_air_date || '').slice(0, 4),
    };
}

export default function TitleSearchPicker({
    selectedId,
    onSelect,
    autoFocus = true,
}: {
    selectedId?: number | null;
    onSelect: (item: PickedTitle) => void;
    autoFocus?: boolean;
}) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<PickedTitle[]>([]);
    const [searching, setSearching] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const seqRef = useRef(0);

    useEffect(() => {
        if (!query.trim()) { setResults([]); setSearching(false); return; }
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(async () => {
            const seq = ++seqRef.current;
            setSearching(true);
            try {
                const items = await searchTitles(query);
                if (seq !== seqRef.current) return; // respuesta obsoleta
                setResults(items.map(toPicked));
            } catch {
                if (seq === seqRef.current) setResults([]);
            } finally {
                if (seq === seqRef.current) setSearching(false);
            }
        }, 400);
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    }, [query]);

    return (
        <div className="flex flex-col gap-4">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant pointer-events-none" />
                <input
                    autoFocus={autoFocus}
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Buscar película o serie..."
                    className="w-full h-10 pl-9 pr-9 rounded-full bg-surface-container-high border border-outline-variant md3-body-medium text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
                />
                {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-primary" />}
            </div>

            {results.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-64 overflow-y-auto pr-1 scrollbar-hide">
                    {results.map(m => {
                        const isSelected = selectedId === m.id;
                        return (
                            <button
                                key={`${m.media_type}-${m.id}`}
                                onClick={() => onSelect(m)}
                                className={`relative rounded-[var(--radius-md)] overflow-hidden border-2 transition-all ${isSelected ? 'border-primary' : 'border-transparent hover:border-primary/40'}`}
                            >
                                {m.poster_path ? (
                                    <Image
                                        src={`https://image.tmdb.org/t/p/w185${m.poster_path}`}
                                        alt={m.title}
                                        width={185}
                                        height={278}
                                        className="w-full aspect-[2/3] object-cover"
                                    />
                                ) : (
                                    <div className="w-full aspect-[2/3] bg-surface-container-high flex items-center justify-center">
                                        <Film className="w-6 h-6 text-on-surface-variant/40" />
                                    </div>
                                )}
                                {m.media_type === 'tv' && (
                                    <span className="absolute top-1 right-1 px-1.5 py-0.5 rounded bg-black/70 text-white text-[9px] font-bold flex items-center gap-0.5">
                                        <Tv className="w-2.5 h-2.5" /> Serie
                                    </span>
                                )}
                                {isSelected && (
                                    <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                                        <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                                            <Check className="w-3.5 h-3.5 text-on-primary" />
                                        </div>
                                    </div>
                                )}
                                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-1.5">
                                    <p className="text-white text-[10px] font-medium leading-tight line-clamp-2">{m.title}</p>
                                    {m.year && <p className="text-white/50 text-[9px]">{m.year}</p>}
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}

            {!searching && query.trim() && results.length === 0 && (
                <p className="text-center md3-body-small text-on-surface-variant py-4">
                    Sin resultados disponibles para &ldquo;{query}&rdquo;
                </p>
            )}
            {!query.trim() && (
                <p className="text-center md3-body-small text-on-surface-variant/60 py-4">
                    Escribe para buscar — solo se muestran títulos disponibles para reproducir
                </p>
            )}
        </div>
    );
}
