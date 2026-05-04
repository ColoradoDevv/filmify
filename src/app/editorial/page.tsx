import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import {
    BookOpen, Clock, ArrowRight, ExternalLink, Newspaper, Rss, Film, Flame,
} from 'lucide-react';
import { getPublishedArticles, getFeaturedArticle, getLatestNews, CATEGORIES } from '@/lib/editorial';
import NewsCard from '@/components/editorial/NewsCard';

export const metadata: Metadata = {
    title: 'FilmiFy Editorial — Noticias, guías y reseñas de cine',
    description: 'Las últimas noticias de cine y streaming: Mandalorian, Avengers Doomsday, Toy Story 5, mejores series de mayo 2026 y más.',
    keywords: ['noticias cine 2026', 'Mandalorian Grogu', 'Avengers Doomsday', 'streaming mayo 2026', 'Toy Story 5'],
    openGraph: {
        title: 'FilmiFy Editorial',
        description: 'Noticias, guías y reseñas de cine y streaming.',
        type: 'website',
    },
};

export const revalidate = 1800;

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(dateStr: string | null, style: 'short' | 'long' = 'short') {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('es-ES',
        style === 'long'
            ? { day: 'numeric', month: 'long', year: 'numeric' }
            : { day: 'numeric', month: 'short' }
    );
}

// ── Card components ───────────────────────────────────────────────────────────

/** Hero — full-width featured article */
function HeroCard({ article }: { article: any }) {
    return (
        <Link href={`/editorial/${article.slug}`} className="group block">
            <article className="relative rounded-2xl overflow-hidden bg-surface-container border border-outline-variant hover:border-primary/40 transition-all duration-300">
                <div className="relative h-[340px] sm:h-[460px]">
                    {article.cover_url ? (
                        <Image
                            src={article.cover_url}
                            alt={article.title}
                            fill
                            className="object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                            sizes="(max-width: 768px) 100vw, 900px"
                            priority
                        />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/10 flex items-center justify-center">
                            <Film className="w-20 h-20 text-primary/20" />
                        </div>
                    )}
                    {/* Gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />

                    {/* Content */}
                    <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="flex items-center gap-1.5 px-2.5 py-1 bg-primary text-on-primary rounded text-[10px] font-bold uppercase tracking-wider">
                                <Flame className="w-2.5 h-2.5" />
                                Destacado
                            </span>
                            <span className="px-2.5 py-1 bg-white/10 backdrop-blur-sm text-white/80 rounded text-[10px] font-medium uppercase tracking-wider border border-white/10">
                                {CATEGORIES[article.category] ?? article.category}
                            </span>
                        </div>
                        <h1 className="text-2xl sm:text-4xl font-black text-white leading-tight mb-3 group-hover:text-primary/90 transition-colors max-w-3xl">
                            {article.title}
                        </h1>
                        <p className="text-white/60 text-sm sm:text-base line-clamp-2 mb-4 max-w-2xl">
                            {article.excerpt}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-white/40">
                            <span className="font-medium text-white/60">{article.author_name}</span>
                            <span>·</span>
                            <span>{fmt(article.published_at, 'long')}</span>
                            <span>·</span>
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{article.read_time} min</span>
                            <span className="ml-auto flex items-center gap-1.5 text-primary font-semibold group-hover:gap-2.5 transition-all">
                                Leer artículo <ArrowRight className="w-4 h-4" />
                            </span>
                        </div>
                    </div>
                </div>
            </article>
        </Link>
    );
}

/** Medium card — image top, text bottom */
function MedCard({ article }: { article: any }) {
    return (
        <Link href={`/editorial/${article.slug}`} className="group block h-full">
            <article className="h-full flex flex-col rounded-xl overflow-hidden bg-surface-container border border-outline-variant hover:border-primary/30 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-3)]">
                <div className="relative h-40 flex-shrink-0 overflow-hidden bg-surface-container-high">
                    {article.cover_url ? (
                        <Image
                            src={article.cover_url}
                            alt={article.title}
                            fill
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                            sizes="(max-width: 768px) 100vw, 350px"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <BookOpen className="w-8 h-8 text-primary/20" />
                        </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-surface-container/70 to-transparent" />
                    <span className="absolute top-2 left-2 px-2 py-0.5 bg-black/60 backdrop-blur-sm text-white/70 rounded text-[9px] font-bold uppercase tracking-wider border border-white/10">
                        {CATEGORIES[article.category] ?? article.category}
                    </span>
                </div>
                <div className="flex-1 flex flex-col p-4 min-w-0">
                    <h3 className="font-bold text-on-surface group-hover:text-primary transition-colors line-clamp-3 leading-snug text-sm mb-2 break-words">
                        {article.title}
                    </h3>
                    <p className="text-xs text-on-surface-variant line-clamp-2 leading-relaxed flex-1">
                        {article.excerpt}
                    </p>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-outline-variant/60">
                        <span className="text-[10px] text-on-surface-variant flex items-center gap-1.5">
                            <Clock className="w-2.5 h-2.5 flex-shrink-0" />
                            {article.read_time} min · {fmt(article.published_at)}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                </div>
            </article>
        </Link>
    );
}

/** Compact list item — horizontal */
function ListCard({ article, index }: { article: any; index: number }) {
    return (
        <Link href={`/editorial/${article.slug}`} className="group flex items-start gap-3 py-3 border-b border-outline-variant/50 last:border-0 hover:bg-surface-container-high/50 -mx-3 px-3 rounded-lg transition-colors">
            <span className="text-2xl font-black text-outline-variant/60 leading-none w-6 flex-shrink-0 mt-0.5 group-hover:text-primary/40 transition-colors">
                {String(index + 1).padStart(2, '0')}
            </span>
            <div className="flex-1 min-w-0">
                <span className="text-[9px] font-bold text-primary uppercase tracking-wider">
                    {CATEGORIES[article.category] ?? article.category}
                </span>
                <h4 className="text-sm font-semibold text-on-surface group-hover:text-primary transition-colors line-clamp-2 leading-snug mt-0.5">
                    {article.title}
                </h4>
                <span className="text-[10px] text-on-surface-variant mt-1 block">
                    {fmt(article.published_at, 'long')}
                </span>
            </div>
            {article.cover_url && (
                <div className="w-14 h-14 flex-shrink-0 rounded-lg overflow-hidden">
                    <Image
                        src={article.cover_url}
                        alt={article.title}
                        width={56}
                        height={56}
                        className="object-cover w-full h-full"
                    />
                </div>
            )}
        </Link>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function EditorialPage() {
    const [featured, articles, news] = await Promise.all([
        getFeaturedArticle(),
        getPublishedArticles(20),
        getLatestNews(40),
    ]);

    const rest = articles.filter(a => a.id !== featured?.id);
    const topGrid = rest.slice(0, 3);       // 3 medium cards below hero
    const listItems = rest.slice(3, 8);     // numbered list
    const moreGrid = rest.slice(8, 12);     // bottom grid

    // News grouped by source
    const newsBySource: Record<string, typeof news> = {};
    for (const item of news) {
        if (!newsBySource[item.source_name]) newsBySource[item.source_name] = [];
        newsBySource[item.source_name].push(item);
    }
    const sources = Object.keys(newsBySource);

    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">

                {/* ── Main column (3/4) ──────────────────────────────────── */}
                <div className="xl:col-span-3 space-y-10">

                    {/* Hero */}
                    {featured && <HeroCard article={featured} />}

                    {/* 3-column grid */}
                    {topGrid.length > 0 && (
                        <section>
                            <div className="flex items-center gap-3 mb-5">
                                <div className="w-1 h-5 bg-primary rounded-full" />
                                <h2 className="text-sm font-bold text-on-surface uppercase tracking-wider">Últimas noticias</h2>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                {topGrid.map(a => <MedCard key={a.id} article={a} />)}
                            </div>
                        </section>
                    )}

                    {/* Divider */}
                    <div className="border-t-2 border-outline-variant" />

                    {/* News feed */}
                    {news.length > 0 && (
                        <section>
                            <div className="flex items-center justify-between mb-5">
                                <div className="flex items-center gap-3">
                                    <div className="w-1 h-5 bg-accent rounded-full" />
                                    <h2 className="text-sm font-bold text-on-surface uppercase tracking-wider">Noticias del sector</h2>
                                </div>
                                <span className="text-[10px] text-on-surface-variant flex items-center gap-1">
                                    <Rss className="w-3 h-3 text-primary" />
                                    Fuentes externas — créditos a los autores
                                </span>
                            </div>

                            {/* Attribution */}
                            <div className="flex items-start gap-2 p-3 mb-4 bg-surface-container rounded-lg border border-outline-variant text-[10px] text-on-surface-variant">
                                <ExternalLink className="w-3 h-3 text-primary flex-shrink-0 mt-0.5" />
                                <span>Los artículos a continuación son extractos de fuentes externas. Cada uno enlaza directamente al sitio original. FilmiFy no reclama autoría sobre este contenido.</span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-0.5">
                                {news.slice(0, 20).map(item => (
                                    <NewsCard key={item.id} item={item} />
                                ))}
                            </div>
                        </section>
                    )}

                    {/* More articles grid */}
                    {moreGrid.length > 0 && (
                        <section>
                            <div className="flex items-center gap-3 mb-5">
                                <div className="w-1 h-5 bg-primary rounded-full" />
                                <h2 className="text-sm font-bold text-on-surface uppercase tracking-wider">Guías y análisis</h2>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {moreGrid.map(a => <MedCard key={a.id} article={a} />)}
                            </div>
                        </section>
                    )}
                </div>

                {/* ── Sidebar (1/4) ──────────────────────────────────────── */}
                <aside className="space-y-8">

                    {/* Most read */}
                    {listItems.length > 0 && (
                        <div>
                            <div className="flex items-center gap-2 mb-4 pb-2 border-b-2 border-on-surface">
                                <h3 className="text-xs font-black text-on-surface uppercase tracking-wider">Lo más leído</h3>
                            </div>
                            <div>
                                {listItems.map((a, i) => (
                                    <ListCard key={a.id} article={a} index={i} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* CTA */}
                    <div className="rounded-xl overflow-hidden border border-primary/20 bg-gradient-to-br from-primary/10 via-surface-container to-accent/5 p-5">
                        <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center mb-3">
                            <Film className="w-4 h-4 text-primary" />
                        </div>
                        <h3 className="font-bold text-on-surface text-sm mb-1.5">¿Buscas dónde ver una película?</h3>
                        <p className="text-xs text-on-surface-variant mb-4 leading-relaxed">
                            FilmiFy te muestra en qué plataformas está disponible cualquier película o serie en tu región, gratis.
                        </p>
                        <Link
                            href="/browse"
                            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-primary text-on-primary rounded-lg text-xs font-bold hover:bg-primary-hover transition-colors"
                        >
                            Explorar catálogo <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                        <Link
                            href="/register"
                            className="flex items-center justify-center gap-2 w-full px-4 py-2 mt-2 border border-outline-variant text-on-surface-variant rounded-lg text-xs font-medium hover:border-primary/30 hover:text-on-surface transition-colors"
                        >
                            Crear cuenta gratis
                        </Link>
                    </div>

                    {/* News by source */}
                    {sources.slice(0, 2).map(sourceName => (
                        <div key={sourceName}>
                            <div className="flex items-center justify-between mb-3 pb-2 border-b border-outline-variant">
                                <h3 className="text-xs font-black text-on-surface uppercase tracking-wider">{sourceName}</h3>
                                <a
                                    href={newsBySource[sourceName][0]?.source_url}
                                    target="_blank"
                                    rel="noopener noreferrer nofollow"
                                    className="text-[10px] text-primary hover:underline flex items-center gap-1"
                                >
                                    Ver sitio <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                            </div>
                            <div className="space-y-3">
                                {newsBySource[sourceName].slice(0, 4).map(item => (
                                    <a
                                        key={item.id}
                                        href={item.original_url}
                                        target="_blank"
                                        rel="noopener noreferrer nofollow"
                                        className="group flex items-start gap-2 hover:bg-surface-container-high -mx-2 px-2 py-1.5 rounded-lg transition-colors"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-medium text-on-surface group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                                                {item.title}
                                            </p>
                                            {item.author && (
                                                <p className="text-[10px] text-on-surface-variant mt-0.5">{item.author}</p>
                                            )}
                                        </div>
                                        <ExternalLink className="w-3 h-3 text-on-surface-variant/30 group-hover:text-primary flex-shrink-0 mt-0.5 transition-colors" />
                                    </a>
                                ))}
                            </div>
                        </div>
                    ))}

                    {/* Sources */}
                    {sources.length > 0 && (
                        <div>
                            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-outline-variant">
                                <Rss className="w-3 h-3 text-primary" />
                                <h3 className="text-xs font-black text-on-surface uppercase tracking-wider">Fuentes</h3>
                            </div>
                            <div className="space-y-1.5">
                                {sources.map(name => (
                                    <a
                                        key={name}
                                        href={newsBySource[name][0]?.source_url}
                                        target="_blank"
                                        rel="noopener noreferrer nofollow"
                                        className="flex items-center justify-between text-xs text-on-surface-variant hover:text-primary transition-colors group py-0.5"
                                    >
                                        <span className="font-medium">{name}</span>
                                        <span className="text-[10px] opacity-50 group-hover:opacity-100 flex items-center gap-1">
                                            {newsBySource[name].length} art. <ExternalLink className="w-2.5 h-2.5" />
                                        </span>
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}
                </aside>
            </div>
        </div>
    );
}
