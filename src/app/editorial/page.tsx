import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { BookOpen, Clock, Tag, ArrowRight, Sparkles } from 'lucide-react';
import { getPublishedArticles, getFeaturedArticle, CATEGORIES } from '@/lib/editorial';

export const metadata: Metadata = {
    title: 'FilmiFy Editorial — Guías, reseñas y noticias de cine',
    description: 'Descubre guías de streaming, reseñas de películas, noticias de cine y consejos para disfrutar mejor el entretenimiento en casa.',
    keywords: ['guías streaming', 'reseñas películas', 'noticias cine', 'dónde ver películas', 'plataformas streaming'],
    openGraph: {
        title: 'FilmiFy Editorial',
        description: 'Guías, reseñas y noticias de cine y streaming.',
        type: 'website',
    },
};

export const revalidate = 3600; // ISR: revalidate every hour

function ArticleCard({ article, featured = false }: { article: any; featured?: boolean }) {
    const date = article.published_at
        ? new Date(article.published_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
        : '';

    if (featured) {
        return (
            <Link href={`/editorial/${article.slug}`} className="group block">
                <article className="relative rounded-3xl overflow-hidden bg-surface-container border border-outline-variant hover:border-primary/40 transition-all duration-300 hover:shadow-[var(--shadow-4)]">
                    {/* Cover */}
                    <div className="relative h-72 sm:h-96 bg-gradient-to-br from-primary/20 via-surface-container-high to-accent/10">
                        {article.cover_url ? (
                            <Image src={article.cover_url} alt={article.title} fill className="object-cover opacity-60 group-hover:opacity-70 transition-opacity" />
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <BookOpen className="w-24 h-24 text-primary/20" />
                            </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-surface-container via-surface-container/60 to-transparent" />

                        {/* Featured badge */}
                        <div className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 bg-primary text-on-primary rounded-full text-xs font-bold">
                            <Sparkles className="w-3 h-3" />
                            Destacado
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-6 sm:p-8">
                        <div className="flex items-center gap-3 mb-3">
                            <span className="px-2.5 py-1 bg-primary/10 text-primary border border-primary/20 rounded-full text-xs font-medium">
                                {CATEGORIES[article.category] ?? article.category}
                            </span>
                            <span className="flex items-center gap-1 text-xs text-on-surface-variant">
                                <Clock className="w-3 h-3" />
                                {article.read_time} min de lectura
                            </span>
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-bold text-on-surface mb-3 group-hover:text-primary transition-colors leading-tight">
                            {article.title}
                        </h2>
                        <p className="text-on-surface-variant leading-relaxed mb-4 line-clamp-2">
                            {article.excerpt}
                        </p>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm text-on-surface-variant">
                                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                                    <span className="text-[10px] font-bold text-primary">F</span>
                                </div>
                                <span>{article.author_name}</span>
                                {date && <><span>·</span><span>{date}</span></>}
                            </div>
                            <span className="flex items-center gap-1 text-primary text-sm font-medium group-hover:gap-2 transition-all">
                                Leer más <ArrowRight className="w-4 h-4" />
                            </span>
                        </div>
                    </div>
                </article>
            </Link>
        );
    }

    return (
        <Link href={`/editorial/${article.slug}`} className="group block">
            <article className="flex gap-4 p-4 rounded-2xl bg-surface-container border border-outline-variant hover:border-primary/30 transition-all duration-200 hover:bg-surface-container-high">
                {/* Mini cover */}
                <div className="w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 rounded-xl overflow-hidden bg-gradient-to-br from-primary/15 to-accent/10 flex items-center justify-center">
                    {article.cover_url ? (
                        <Image src={article.cover_url} alt={article.title} width={96} height={96} className="object-cover w-full h-full" />
                    ) : (
                        <BookOpen className="w-8 h-8 text-primary/30" />
                    )}
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                        <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-[10px] font-medium">
                            {CATEGORIES[article.category] ?? article.category}
                        </span>
                        <span className="flex items-center gap-1 text-[10px] text-on-surface-variant">
                            <Clock className="w-2.5 h-2.5" />
                            {article.read_time} min
                        </span>
                    </div>
                    <h3 className="font-semibold text-on-surface group-hover:text-primary transition-colors line-clamp-2 leading-snug mb-1">
                        {article.title}
                    </h3>
                    <p className="text-xs text-on-surface-variant line-clamp-2 leading-relaxed">
                        {article.excerpt}
                    </p>
                    {date && (
                        <p className="text-[10px] text-on-surface-variant mt-1.5">{date}</p>
                    )}
                </div>
            </article>
        </Link>
    );
}

export default async function EditorialPage() {
    const [featured, articles] = await Promise.all([
        getFeaturedArticle(),
        getPublishedArticles(20),
    ]);

    const rest = articles.filter(a => a.id !== featured?.id);

    // Group by category for the sidebar
    const categories = [...new Set(articles.map(a => a.category))];

    return (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
            {/* Header */}
            <div className="mb-10 sm:mb-14">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-full text-primary text-xs font-medium mb-4">
                    <BookOpen className="w-3.5 h-3.5" />
                    FilmiFy Editorial
                </div>
                <h1 className="text-4xl sm:text-5xl font-bold text-on-surface mb-3 leading-tight">
                    Guías, reseñas y<br />
                    <span className="text-primary">noticias de cine</span>
                </h1>
                <p className="text-on-surface-variant text-lg max-w-xl">
                    Todo lo que necesitas saber sobre streaming, películas y series para disfrutar mejor el entretenimiento en casa.
                </p>
            </div>

            {/* Featured article */}
            {featured && (
                <div className="mb-10">
                    <ArticleCard article={featured} featured />
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Article list */}
                <div className="lg:col-span-2 space-y-4">
                    <h2 className="text-lg font-bold text-on-surface mb-4">Últimos artículos</h2>
                    {rest.length > 0 ? (
                        rest.map(article => (
                            <ArticleCard key={article.id} article={article} />
                        ))
                    ) : (
                        <p className="text-on-surface-variant text-sm">No hay artículos publicados aún.</p>
                    )}
                </div>

                {/* Sidebar */}
                <aside className="space-y-6">
                    {/* Categories */}
                    <div className="bg-surface-container border border-outline-variant rounded-2xl p-5">
                        <h3 className="font-bold text-on-surface mb-4 flex items-center gap-2">
                            <Tag className="w-4 h-4 text-primary" />
                            Categorías
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {categories.map(cat => (
                                <span key={cat} className="px-3 py-1.5 bg-surface-container-high border border-outline-variant rounded-full text-xs font-medium text-on-surface-variant hover:text-primary hover:border-primary/30 transition-colors cursor-default">
                                    {CATEGORIES[cat] ?? cat}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* CTA */}
                    <div className="bg-gradient-to-br from-primary/10 to-accent/5 border border-primary/20 rounded-2xl p-5">
                        <h3 className="font-bold text-on-surface mb-2">¿Buscas dónde ver una película?</h3>
                        <p className="text-sm text-on-surface-variant mb-4">
                            FilmiFy te muestra en qué plataformas está disponible cualquier película o serie.
                        </p>
                        <Link
                            href="/browse"
                            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-primary text-on-primary rounded-xl text-sm font-semibold hover:bg-primary-hover transition-colors"
                        >
                            Explorar catálogo
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                </aside>
            </div>
        </div>
    );
}
