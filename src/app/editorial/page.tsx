import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import {
    BookOpen, Clock, ArrowRight, Sparkles,
    ExternalLink, Newspaper, Rss, Film,
} from 'lucide-react';
import { getPublishedArticles, getFeaturedArticle, getLatestNews, CATEGORIES } from '@/lib/editorial';

export const metadata: Metadata = {
    title: 'FilmiFy Editorial — Guías, reseñas y noticias de cine',
    description: 'Guías de streaming, reseñas de películas y las últimas noticias del mundo del cine y las series, con fuentes verificadas.',
    keywords: ['noticias cine', 'guías streaming', 'reseñas películas', 'dónde ver películas', 'series streaming'],
    openGraph: {
        title: 'FilmiFy Editorial',
        description: 'Guías, reseñas y noticias de cine y streaming.',
        type: 'website',
    },
};

export const revalidate = 1800; // 30 min

// ── Sub-components ────────────────────────────────────────────────────────────

function FeaturedCard({ article }: { article: any }) {
    const date = article.published_at
        ? new Date(article.published_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
        : '';
    return (
        <Link href={`/editorial/${article.slug}`} className="group block">
            <article className="relative rounded-3xl overflow-hidden bg-surface-container border border-outline-variant hover:border-primary/50 transition-all duration-300 hover:shadow-[0_0_40px_rgba(0,194,255,0.08)]">
                <div className="relative h-80 sm:h-[420px]">
                    {article.cover_url ? (
                        <Image
                            src={article.cover_url}
                            alt={article.title}
                            fill
                            className="object-cover transition-transform duration-700 group-hover:scale-105"
                            sizes="(max-width: 768px) 100vw, 800px"
                            priority
                        />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary/20 via-surface-container-high to-accent/10 flex items-center justify-center">
                            <Film className="w-20 h-20 text-primary/20" />
                        </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

                    {/* Badges */}
                    <div className="absolute top-4 left-4 flex items-center gap-2">
                        <span className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-on-primary rounded-full text-xs font-bold shadow-lg">
                            <Sparkles className="w-3 h-3" />
                            Destacado
                        </span>
                        <span className="px-2.5 py-1.5 bg-black/60 backdrop-blur-sm text-white/80 rounded-full text-xs font-medium border border-white/10">
                            {CATEGORIES[article.category] ?? article.category}
                        </span>
                    </div>

                    {/* Content overlay */}
                    <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
                        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2 leading-tight group-hover:text-primary transition-colors">
                            {article.title}
                        </h2>
                        <p className="text-white/60 text-sm line-clamp-2 mb-4 max-w-2xl">
                            {article.excerpt}
                        </p>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs text-white/50">
                                <div className="w-5 h-5 rounded-full bg-primary/30 flex items-center justify-center">
                                    <span className="text-[9px] font-bold text-primary">F</span>
                                </div>
                                <span>{article.author_name}</span>
                                {date && <><span>·</span><span>{date}</span></>}
                                <span>·</span>
                                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{article.read_time} min</span>
                            </div>
                            <span className="flex items-center gap-1.5 text-primary text-sm font-semibold group-hover:gap-2.5 transition-all">
                                Leer <ArrowRight className="w-4 h-4" />
                            </span>
                        </div>
                    </div>
                </div>
            </article>
        </Link>
    );
}

function OwnArticleCard({ article }: { article: any }) {
    const date = article.published_at
        ? new Date(article.published_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
        : '';
    return (
        <Link href={`/editorial/${article.slug}`} className="group block h-full">
            <article className="h-full flex flex-col rounded-2xl overflow-hidden bg-surface-container border border-outline-variant hover:border-primary/40 transition-all duration-200 hover:shadow-[var(--shadow-3)] hover:-translate-y-0.5">
                {/* Image */}
                <div className="relative h-44 flex-shrink-0 bg-gradient-to-br from-primary/15 to-accent/10">
                    {article.cover_url ? (
                        <Image
                            src={article.cover_url}
                            alt={article.title}
                            fill
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                            sizes="(max-width: 768px) 100vw, 400px"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <BookOpen className="w-10 h-10 text-primary/20" />
                        </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-surface-container/80 to-transparent" />
                    <span className="absolute top-3 left-3 px-2 py-1 bg-black/60 backdrop-blur-sm text-white/70 rounded-full text-[10px] font-medium border border-white/10">
                        {CATEGORIES[article.category] ?? article.category}
                    </span>
                </div>

                {/* Content */}
                <div className="flex-1 flex flex-col p-4">
                    <h3 className="font-bold text-on-surface group-hover:text-primary transition-colors line-clamp-2 leading-snug mb-2 text-sm">
                        {article.title}
                    </h3>
                    <p className="text-xs text-on-surface-variant line-clamp-2 leading-relaxed flex-1">
                        {article.excerpt}
                    </p>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-outline-variant">
                        <span className="text-[10px] text-on-surface-variant flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />{article.read_time} min
                            {date && <><span className="mx-1">·</span>{date}</>}
                        </span>
                        <span className="text-primary text-[10px] font-semibold flex items-center gap-1 group-hover:gap-1.5 transition-all">
                            Leer <ArrowRight className="w-3 h-3" />
                        </span>
                    </div>
                </div>
            </article>
        </Link>
    );
}

function NewsCard({ item }: { item: any }) {
    const date = item.published_at
        ? new Date(item.published_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
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
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
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

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function EditorialPage() {
    const [featured, articles, news] = await Promise.all([
        getFeaturedArticle(),
        getPublishedArticles(20),
        getLatestNews(40),
    ]);

    const ownArticles = articles.filter(a => a.id !== featured?.id);

    // Split news by source for variety
    const newsBySource: Record<string, typeof news> = {};
    for (const item of news) {
        if (!newsBySource[item.source_name]) newsBySource[item.source_name] = [];
        newsBySource[item.source_name].push(item);
    }
    const sources = Object.keys(newsBySource);

    return (
        <div className="min-h-screen">
            {/* ── Hero header ─────────────────────────────────────────────── */}
            <div className="border-b border-outline-variant bg-surface-container-low/50">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
                    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
                        <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-full text-primary text-xs font-medium mb-4">
                                <BookOpen className="w-3.5 h-3.5" />
                                FilmiFy Editorial
                            </div>
                            <h1 className="text-4xl sm:text-5xl font-bold text-on-surface leading-tight">
                                Cine &amp; Streaming
                            </h1>
                            <p className="text-on-surface-variant mt-2 text-base max-w-lg">
                                Guías propias, reseñas y las últimas noticias del mundo del entretenimiento — con fuentes verificadas y créditos a los autores originales.
                            </p>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                            <Rss className="w-3.5 h-3.5 text-primary" />
                            <span>Actualizado cada 6 horas</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">

                    {/* ── Left: own content ─────────────────────────────── */}
                    <div className="xl:col-span-2 space-y-10">

                        {/* Featured */}
                        {featured && (
                            <section>
                                <FeaturedCard article={featured} />
                            </section>
                        )}

                        {/* Own articles grid */}
                        {ownArticles.length > 0 && (
                            <section>
                                <div className="flex items-center justify-between mb-5">
                                    <h2 className="text-lg font-bold text-on-surface flex items-center gap-2">
                                        <BookOpen className="w-4 h-4 text-primary" />
                                        Guías y análisis
                                    </h2>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {ownArticles.slice(0, 6).map(article => (
                                        <OwnArticleCard key={article.id} article={article} />
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* News feed — main block */}
                        {news.length > 0 && (
                            <section>
                                <div className="flex items-center justify-between mb-5">
                                    <h2 className="text-lg font-bold text-on-surface flex items-center gap-2">
                                        <Newspaper className="w-4 h-4 text-primary" />
                                        Últimas noticias
                                    </h2>
                                    <span className="text-xs text-on-surface-variant">
                                        Fuentes externas — créditos a los autores originales
                                    </span>
                                </div>

                                {/* Attribution notice */}
                                <div className="flex items-start gap-2.5 p-3 mb-5 bg-surface-container rounded-xl border border-outline-variant text-xs text-on-surface-variant">
                                    <ExternalLink className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
                                    <span>
                                        Las noticias a continuación son extractos de fuentes externas. Cada artículo enlaza directamente al sitio original. FilmiFy no reclama autoría sobre este contenido.
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                                    {news.slice(0, 20).map(item => (
                                        <NewsCard key={item.id} item={item} />
                                    ))}
                                </div>
                            </section>
                        )}

                        {news.length === 0 && ownArticles.length === 0 && !featured && (
                            <div className="text-center py-20 text-on-surface-variant">
                                <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                <p>El contenido se está cargando. Vuelve pronto.</p>
                            </div>
                        )}
                    </div>

                    {/* ── Right: sidebar ────────────────────────────────── */}
                    <aside className="space-y-6">

                        {/* CTA */}
                        <div className="rounded-2xl overflow-hidden border border-primary/20 bg-gradient-to-br from-primary/10 via-surface-container to-accent/5 p-5">
                            <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center mb-3">
                                <Film className="w-5 h-5 text-primary" />
                            </div>
                            <h3 className="font-bold text-on-surface mb-1.5">¿Buscas dónde ver una película?</h3>
                            <p className="text-sm text-on-surface-variant mb-4 leading-relaxed">
                                FilmiFy te muestra en qué plataformas está disponible cualquier película o serie en tu región.
                            </p>
                            <Link
                                href="/browse"
                                className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-primary text-on-primary rounded-xl text-sm font-semibold hover:bg-primary-hover transition-colors"
                            >
                                Explorar catálogo
                                <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>

                        {/* News by source */}
                        {sources.slice(0, 3).map(sourceName => (
                            <div key={sourceName} className="bg-surface-container border border-outline-variant rounded-2xl overflow-hidden">
                                <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant">
                                    <h3 className="text-sm font-bold text-on-surface">{sourceName}</h3>
                                    <a
                                        href={newsBySource[sourceName][0]?.source_url}
                                        target="_blank"
                                        rel="noopener noreferrer nofollow"
                                        className="text-[10px] text-primary hover:underline flex items-center gap-1"
                                    >
                                        Ver sitio <ExternalLink className="w-2.5 h-2.5" />
                                    </a>
                                </div>
                                <div className="divide-y divide-outline-variant/50">
                                    {newsBySource[sourceName].slice(0, 4).map(item => (
                                        <a
                                            key={item.id}
                                            href={item.original_url}
                                            target="_blank"
                                            rel="noopener noreferrer nofollow"
                                            className="group flex items-start gap-3 px-4 py-3 hover:bg-surface-container-high transition-colors"
                                        >
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-medium text-on-surface group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                                                    {item.title}
                                                </p>
                                                {item.author && (
                                                    <p className="text-[10px] text-on-surface-variant mt-1">{item.author}</p>
                                                )}
                                            </div>
                                            <ExternalLink className="w-3 h-3 text-on-surface-variant/40 group-hover:text-primary flex-shrink-0 mt-0.5 transition-colors" />
                                        </a>
                                    ))}
                                </div>
                            </div>
                        ))}

                        {/* Sources list */}
                        {sources.length > 0 && (
                            <div className="bg-surface-container border border-outline-variant rounded-2xl p-4">
                                <h3 className="text-sm font-bold text-on-surface mb-3 flex items-center gap-2">
                                    <Rss className="w-3.5 h-3.5 text-primary" />
                                    Fuentes de noticias
                                </h3>
                                <div className="space-y-2">
                                    {sources.map(name => {
                                        const item = newsBySource[name][0];
                                        return (
                                            <a
                                                key={name}
                                                href={item?.source_url}
                                                target="_blank"
                                                rel="noopener noreferrer nofollow"
                                                className="flex items-center justify-between text-xs text-on-surface-variant hover:text-primary transition-colors group"
                                            >
                                                <span className="font-medium">{name}</span>
                                                <span className="flex items-center gap-1 opacity-50 group-hover:opacity-100">
                                                    {newsBySource[name].length} artículos
                                                    <ExternalLink className="w-2.5 h-2.5" />
                                                </span>
                                            </a>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </aside>
                </div>
            </div>
        </div>
    );
}
