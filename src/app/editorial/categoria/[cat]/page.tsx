import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Clock, ArrowRight, ExternalLink, Rss } from 'lucide-react';
import { getArticlesAndNewsByCategory, CATEGORIES } from '@/lib/editorial';
import type { Article, NewsItem } from '@/lib/editorial';
import NewsCard from '@/components/editorial/NewsCard';
import ArticleImage from '@/components/editorial/ArticleImage';

interface Props { params: Promise<{ cat: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { cat } = await params;
    const label = CATEGORIES[cat];
    if (!label) return { title: 'Categoría no encontrada' };
    return {
        title: `${label} — FilmiFy Editorial`,
        description: `Las últimas noticias, guías y análisis sobre ${label.toLowerCase()} en FilmiFy Editorial.`,
    };
}

export const revalidate = 1800;

function fmt(d: string | null) {
    if (!d) return '';
    return new Date(d).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}

const CATEGORIES_ORDER = ['noticias', 'streaming', 'peliculas', 'series', 'premios', 'guias'];

export default async function CategoryPage({ params }: Props) {
    const { cat } = await params;
    const label = CATEGORIES[cat];
    if (!label) notFound();

    const { articles, news } = await getArticlesAndNewsByCategory(cat);

    return (
        <>
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
                {/* Header */}
                <div className="mb-8">
                    <Link href="/editorial" className="inline-flex items-center gap-2 text-xs text-on-surface-variant hover:text-primary transition-colors mb-6">
                        <ArrowLeft className="w-3.5 h-3.5" />
                        Volver a portada
                    </Link>

                    <div className="flex items-center gap-3">
                        <div className="w-1.5 h-10 bg-primary rounded-full shadow-[0_0_12px_rgba(var(--color-primary-rgb),0.4)]" />
                        <div>
                            <h1 className="text-3xl sm:text-5xl font-black text-on-surface tracking-tight uppercase">
                                {label}
                            </h1>
                            <p className="text-on-surface-variant text-sm mt-1 font-medium flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                {articles.length + news.length} piezas de contenido actualizado hoy
                            </p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
                <div className="xl:col-span-3 space-y-10">
                    {/* Own articles */}
                    {articles.length > 0 && (
                        <section>
                            <div className="flex items-center gap-3 mb-5">
                                <div className="w-1 h-5 bg-primary rounded-full" />
                                <h2 className="text-sm font-bold text-on-surface uppercase tracking-wider">Artículos de FilmiFy Editorial</h2>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {articles.map((article: Article) => (
                                    <Link key={article.id} href={`/editorial/${article.slug}`} className="group block h-full">
                                        <article className="h-full flex flex-col rounded-xl overflow-hidden bg-surface-container border border-outline-variant hover:border-primary/30 transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-3)]">
                                            <div className="relative h-36 overflow-hidden bg-surface-container-high">
                                                <ArticleImage
                                                    src={article.cover_url}
                                                    alt={article.title}
                                                    category={article.category}
                                                    fill
                                                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                                                    sizes="350px"
                                                />
                                            </div>
                                            <div className="flex-1 flex flex-col p-4">
                                                <h3 className="font-bold text-sm text-on-surface group-hover:text-primary transition-colors line-clamp-3 leading-snug mb-2">{article.title}</h3>
                                                <p className="text-xs text-on-surface-variant line-clamp-2 flex-1">{article.excerpt}</p>
                                                <div className="flex items-center justify-between mt-3 pt-3 border-t border-outline-variant/60 text-[10px] text-on-surface-variant">
                                                    <span className="flex items-center gap-1"><Clock className="w-2.5 h-2.5" />{article.read_time} min · {fmt(article.published_at)}</span>
                                                    <ArrowRight className="w-3.5 h-3.5 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </div>
                                            </div>
                                        </article>
                                    </Link>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* External news */}
                    {news.length > 0 && (
                        <section>
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-1 h-5 bg-accent rounded-full" />
                                    <h2 className="text-sm font-bold text-on-surface uppercase tracking-wider">Noticias externas</h2>
                                </div>
                                <span className="text-[10px] text-on-surface-variant flex items-center gap-1">
                                    <Rss className="w-3 h-3 text-primary" />
                                    Con atribución a los autores originales
                                </span>
                            </div>
                            <div className="flex items-start gap-2 p-3 mb-4 bg-surface-container rounded-lg border border-outline-variant text-[10px] text-on-surface-variant">
                                <ExternalLink className="w-3 h-3 text-primary flex-shrink-0 mt-0.5" />
                                <span>Los artículos a continuación son extractos de fuentes externas. Cada uno enlaza al sitio original. FilmiFy no reclama autoría.</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-0.5">
                                {news.map((item: NewsItem) => <NewsCard key={item.id} item={item} />)}
                            </div>
                        </section>
                    )}

                    {articles.length === 0 && news.length === 0 && (
                        <div className="text-center py-20 text-on-surface-variant">
                            <p className="text-lg font-medium mb-2">Sin contenido aún</p>
                            <p className="text-sm">Esta categoría se actualizará pronto con las últimas noticias.</p>
                            <Link href="/editorial" className="inline-flex items-center gap-2 mt-6 text-primary text-sm hover:underline">
                                <ArrowLeft className="w-4 h-4" /> Volver a portada
                            </Link>
                        </div>
                    )}
                </div>

                {/* Sidebar */}
                <aside className="space-y-6">
                    <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/10 via-surface-container to-accent/5 p-5">
                        <h3 className="font-bold text-on-surface text-sm mb-2">¿Buscas dónde ver una película?</h3>
                        <p className="text-xs text-on-surface-variant mb-4 leading-relaxed">FilmiFy te muestra en qué plataformas está disponible cualquier título en tu región.</p>
                        <Link href="/browse" className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-primary text-on-primary rounded-lg text-xs font-bold hover:bg-primary-hover transition-colors">
                            Explorar catálogo <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                    </div>

                    <div>
                        <h3 className="text-xs font-black text-on-surface uppercase tracking-wider mb-3 pb-2 border-b border-outline-variant">Otras categorías</h3>
                        <div className="space-y-1">
                            {Object.entries(CATEGORIES).filter(([k]) => k !== cat && k !== 'general' && k !== 'consejos').map(([k, v]) => (
                                <Link key={k} href={`/editorial/categoria/${k}`} className="group flex items-center justify-between text-xs text-on-surface-variant hover:text-primary transition-colors py-1.5 border-b border-outline-variant/30 last:border-0">
                                    <span>{v}</span>
                                    <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </Link>
                            ))}
                        </div>
                    </div>
                </aside>
            </div>
            </div>
        </>
    );
}
