import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { ArrowLeft, Clock, Tag, Calendar, ArrowRight, BookOpen } from 'lucide-react';
import { getArticleBySlug, getPublishedArticles, CATEGORIES } from '@/lib/editorial';

interface Props {
    params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params;
    const article = await getArticleBySlug(slug);
    if (!article) return { title: 'Artículo no encontrado' };

    return {
        title: article.title,
        description: article.excerpt,
        keywords: article.tags,
        openGraph: {
            title: article.title,
            description: article.excerpt,
            type: 'article',
            publishedTime: article.published_at ?? undefined,
            authors: [article.author_name],
            images: article.cover_url ? [{ url: article.cover_url }] : [],
        },
        twitter: {
            card: 'summary_large_image',
            title: article.title,
            description: article.excerpt,
        },
    };
}

export const revalidate = 3600;

/** Convert markdown-like content to HTML paragraphs */
function renderContent(content: string) {
    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];
    let key = 0;

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) { elements.push(<br key={key++} />); continue; }

        if (trimmed.startsWith('### ')) {
            elements.push(<h3 key={key++} className="text-xl font-bold text-on-surface mt-8 mb-3">{trimmed.slice(4)}</h3>);
        } else if (trimmed.startsWith('## ')) {
            elements.push(<h2 key={key++} className="text-2xl font-bold text-on-surface mt-10 mb-4">{trimmed.slice(3)}</h2>);
        } else if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
            elements.push(<p key={key++} className="font-bold text-on-surface mb-2">{trimmed.slice(2, -2)}</p>);
        } else if (trimmed.startsWith('- ')) {
            elements.push(
                <li key={key++} className="flex items-start gap-2 text-on-surface-variant mb-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                    <span dangerouslySetInnerHTML={{ __html: trimmed.slice(2).replace(/\*\*(.*?)\*\*/g, '<strong class="text-on-surface">$1</strong>') }} />
                </li>
            );
        } else if (/^\d+\./.test(trimmed)) {
            const num = trimmed.match(/^(\d+)\./)?.[1];
            const text = trimmed.replace(/^\d+\.\s*/, '');
            elements.push(
                <li key={key++} className="flex items-start gap-3 text-on-surface-variant mb-2">
                    <span className="w-6 h-6 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{num}</span>
                    <span dangerouslySetInnerHTML={{ __html: text.replace(/\*\*(.*?)\*\*/g, '<strong class="text-on-surface">$1</strong>') }} />
                </li>
            );
        } else {
            elements.push(
                <p key={key++} className="text-on-surface-variant leading-relaxed mb-4"
                    dangerouslySetInnerHTML={{ __html: trimmed.replace(/\*\*(.*?)\*\*/g, '<strong class="text-on-surface">$1</strong>') }}
                />
            );
        }
    }
    return elements;
}

export default async function ArticlePage({ params }: Props) {
    const { slug } = await params;
    const [article, related] = await Promise.all([
        getArticleBySlug(slug),
        getPublishedArticles(4),
    ]);

    if (!article) notFound();

    const relatedArticles = related.filter(a => a.slug !== slug).slice(0, 3);
    const date = article.published_at
        ? new Date(article.published_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
        : '';

    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: article.title,
        description: article.excerpt,
        author: { '@type': 'Organization', name: article.author_name },
        publisher: { '@type': 'Organization', name: 'FilmiFy', logo: { '@type': 'ImageObject', url: '/logo-icon.svg' } },
        datePublished: article.published_at,
        dateModified: article.updated_at,
        image: article.cover_url ?? undefined,
        keywords: article.tags.join(', '),
    };

    return (
        <>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
                {/* Back */}
                <Link href="/editorial" className="inline-flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors mb-8 text-sm">
                    <ArrowLeft className="w-4 h-4" />
                    Volver al editorial
                </Link>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                    {/* Article */}
                    <article className="lg:col-span-2">
                        {/* Category + meta */}
                        <div className="flex flex-wrap items-center gap-3 mb-5">
                            <Link href={`/editorial/categoria/${article.category}`} className="px-3 py-1 bg-primary/10 text-primary border border-primary/20 rounded-full text-xs font-medium hover:bg-primary/20 transition-colors">
                                {CATEGORIES[article.category] ?? article.category}
                            </Link>
                            <span className="flex items-center gap-1 text-xs text-on-surface-variant">
                                <Clock className="w-3 h-3" />
                                {article.read_time} min de lectura
                            </span>
                            {date && (
                                <span className="flex items-center gap-1 text-xs text-on-surface-variant">
                                    <Calendar className="w-3 h-3" />
                                    {date}
                                </span>
                            )}
                        </div>

                        {/* Title */}
                        <h1 className="text-3xl sm:text-4xl font-bold text-on-surface leading-tight mb-4">
                            {article.title}
                        </h1>

                        {/* Excerpt */}
                        <p className="text-lg text-on-surface-variant leading-relaxed mb-6 border-l-2 border-primary pl-4">
                            {article.excerpt}
                        </p>

                        {/* Author */}
                        <div className="flex items-center gap-3 mb-8 pb-8 border-b border-outline-variant">
                            <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center">
                                <span className="text-sm font-bold text-primary">F</span>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-on-surface">{article.author_name}</p>
                                <p className="text-xs text-on-surface-variant">FilmiFy Editorial</p>
                            </div>
                        </div>

                        {/* Cover image */}
                        {article.cover_url && (
                            <div className="relative h-64 sm:h-80 rounded-2xl overflow-hidden mb-8">
                                <Image src={article.cover_url} alt={article.title} fill className="object-cover" />
                            </div>
                        )}

                        {/* Content */}
                        <div className="prose-editorial">
                            {renderContent(article.content)}
                        </div>

                        {/* Tags */}
                        {article.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-10 pt-8 border-t border-outline-variant">
                                <Tag className="w-4 h-4 text-on-surface-variant mt-0.5" />
                                {article.tags.map(tag => (
                                    <span key={tag} className="px-2.5 py-1 bg-surface-container-high border border-outline-variant rounded-full text-xs text-on-surface-variant">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        )}
                    </article>

                    {/* Sidebar */}
                    <aside className="space-y-6">
                        {/* CTA */}
                        <div className="bg-gradient-to-br from-primary/10 to-accent/5 border border-primary/20 rounded-2xl p-5 sticky top-24">
                            <h3 className="font-bold text-on-surface mb-2">¿Buscas dónde ver una película?</h3>
                            <p className="text-sm text-on-surface-variant mb-4">
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

                        {/* Related */}
                        {relatedArticles.length > 0 && (
                            <div className="bg-surface-container border border-outline-variant rounded-2xl p-5">
                                <h3 className="font-bold text-on-surface mb-4 flex items-center gap-2">
                                    <BookOpen className="w-4 h-4 text-primary" />
                                    Más artículos
                                </h3>
                                <div className="space-y-4">
                                    {relatedArticles.map(rel => (
                                        <Link key={rel.id} href={`/editorial/${rel.slug}`} className="group block">
                                            <p className="text-sm font-medium text-on-surface group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                                                {rel.title}
                                            </p>
                                            <p className="text-xs text-on-surface-variant mt-1 flex items-center gap-1">
                                                <Clock className="w-2.5 h-2.5" />
                                                {rel.read_time} min
                                            </p>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}
                    </aside>
                </div>
            </div>
        </>
    );
}
