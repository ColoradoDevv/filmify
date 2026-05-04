'use client';

import { useState, useEffect, useTransition } from 'react';
import { BookOpen, Plus, Pencil, Trash2, Eye, Loader2, X, Check, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { getArticlesAction, saveArticleAction, deleteArticleAction } from './actions';
import { CATEGORIES } from '@/lib/editorial';
import type { Article } from '@/lib/editorial';
import Link from 'next/link';

const EMPTY: Partial<Article> = {
    slug: '', title: '', excerpt: '', content: '',
    category: 'general', tags: [], author_name: 'FilmiFy Editorial',
    status: 'draft', featured: false, cover_url: null,
};

export default function EditorialAdminPage() {
    const [articles, setArticles] = useState<Article[]>([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState<Partial<Article> | null>(null);
    const [isPending, startTransition] = useTransition();

    const load = async () => {
        setLoading(true);
        const data = await getArticlesAction();
        setArticles(data);
        setLoading(false);
    };

    useEffect(() => { load(); }, []);

    const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        if (editing?.id) fd.set('id', editing.id);
        fd.set('featured', editing?.featured ? 'true' : 'false');

        startTransition(async () => {
            const res = await saveArticleAction(fd);
            if (res.success) {
                toast.success('Artículo guardado');
                setEditing(null);
                load();
            } else {
                toast.error(res.error ?? 'Error al guardar');
            }
        });
    };

    const handleDelete = async (id: string, title: string) => {
        if (!confirm(`¿Eliminar "${title}"?`)) return;
        const res = await deleteArticleAction(id);
        if (res.success) { toast.success('Artículo eliminado'); load(); }
        else toast.error(res.error ?? 'Error al eliminar');
    };

    const statusBadge = (status: string) => (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${status === 'published' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' : 'bg-slate-500/15 text-slate-400 border border-slate-500/20'}`}>
            {status === 'published' ? 'Publicado' : 'Borrador'}
        </span>
    );

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                        <BookOpen className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-white">Editorial</h1>
                        <p className="text-xs text-slate-500">Gestión de artículos para AdSense</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Link href="/editorial" target="_blank">
                        <Button variant="outline" size="sm" className="gap-2 border-slate-700 text-slate-400 hover:text-white">
                            <ExternalLink className="w-3.5 h-3.5" />
                            Ver sitio
                        </Button>
                    </Link>
                    <Button size="sm" className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setEditing({ ...EMPTY })}>
                        <Plus className="w-4 h-4" />
                        Nuevo artículo
                    </Button>
                </div>
            </div>

            {/* Editor modal */}
            {editing && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto">
                    <Card className="w-full max-w-3xl bg-[#0d0d0d] border-slate-800 my-8">
                        <CardHeader className="flex flex-row items-center justify-between border-b border-slate-800 pb-4">
                            <CardTitle className="text-white text-base">
                                {editing.id ? 'Editar artículo' : 'Nuevo artículo'}
                            </CardTitle>
                            <button onClick={() => setEditing(null)} className="text-slate-500 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <form onSubmit={handleSave} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <label className="text-xs text-slate-400 mb-1 block">Título *</label>
                                        <Input name="title" defaultValue={editing.title} required placeholder="Título del artículo" className="bg-slate-900 border-slate-700 text-white" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-400 mb-1 block">Slug * (URL)</label>
                                        <Input name="slug" defaultValue={editing.slug} required placeholder="mi-articulo-url" className="bg-slate-900 border-slate-700 text-white font-mono text-sm" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-400 mb-1 block">Categoría</label>
                                        <select name="category" defaultValue={editing.category ?? 'general'} className="w-full h-9 px-3 rounded-md bg-slate-900 border border-slate-700 text-white text-sm">
                                            {Object.entries(CATEGORIES).map(([k, v]) => (
                                                <option key={k} value={k}>{v}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="col-span-2">
                                        <label className="text-xs text-slate-400 mb-1 block">Extracto * (descripción corta)</label>
                                        <Textarea name="excerpt" defaultValue={editing.excerpt} required rows={2} placeholder="Descripción breve del artículo..." className="bg-slate-900 border-slate-700 text-white resize-none" />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="text-xs text-slate-400 mb-1 block">Contenido * (soporta ## Títulos, **negrita**, - listas)</label>
                                        <Textarea name="content" defaultValue={editing.content} required rows={14} placeholder="## Introducción&#10;&#10;Escribe el contenido aquí..." className="bg-slate-900 border-slate-700 text-white font-mono text-sm resize-y" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-400 mb-1 block">Autor</label>
                                        <Input name="author_name" defaultValue={editing.author_name ?? 'FilmiFy Editorial'} className="bg-slate-900 border-slate-700 text-white" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-400 mb-1 block">Tags (separados por coma)</label>
                                        <Input name="tags" defaultValue={editing.tags?.join(', ')} placeholder="streaming, películas, 2025" className="bg-slate-900 border-slate-700 text-white" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-400 mb-1 block">URL de portada (opcional)</label>
                                        <Input name="cover_url" defaultValue={editing.cover_url ?? ''} placeholder="https://..." className="bg-slate-900 border-slate-700 text-white" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-400 mb-1 block">Estado</label>
                                        <select name="status" defaultValue={editing.status ?? 'draft'} className="w-full h-9 px-3 rounded-md bg-slate-900 border border-slate-700 text-white text-sm">
                                            <option value="draft">Borrador</option>
                                            <option value="published">Publicado</option>
                                        </select>
                                    </div>
                                    <div className="col-span-2 flex items-center gap-3">
                                        <input type="checkbox" id="featured" checked={editing.featured ?? false} onChange={e => setEditing(prev => prev ? { ...prev, featured: e.target.checked } : prev)} className="w-4 h-4 accent-emerald-500" />
                                        <label htmlFor="featured" className="text-sm text-slate-300">Marcar como artículo destacado (aparece primero en la portada)</label>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 pt-2 border-t border-slate-800">
                                    <Button type="button" variant="outline" onClick={() => setEditing(null)} className="border-slate-700 text-slate-400">
                                        Cancelar
                                    </Button>
                                    <Button type="submit" disabled={isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
                                        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                        Guardar
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Articles table */}
            <Card className="bg-[#0a0a0a] border-slate-800">
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
                        </div>
                    ) : articles.length === 0 ? (
                        <div className="text-center py-16 text-slate-500">
                            <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
                            <p>No hay artículos. Crea el primero.</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow className="border-slate-800 hover:bg-transparent">
                                    <TableHead className="text-slate-500 font-mono text-xs">TÍTULO</TableHead>
                                    <TableHead className="text-slate-500 font-mono text-xs">CATEGORÍA</TableHead>
                                    <TableHead className="text-slate-500 font-mono text-xs">ESTADO</TableHead>
                                    <TableHead className="text-slate-500 font-mono text-xs">LECTURA</TableHead>
                                    <TableHead className="text-slate-500 font-mono text-xs">FECHA</TableHead>
                                    <TableHead className="text-slate-500 font-mono text-xs text-right">ACCIONES</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {articles.map(article => (
                                    <TableRow key={article.id} className="border-slate-800/50 hover:bg-slate-900/30">
                                        <TableCell className="text-white font-medium max-w-xs">
                                            <div className="flex items-center gap-2">
                                                {article.featured && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" title="Destacado" />}
                                                <span className="truncate">{article.title}</span>
                                            </div>
                                            <p className="text-xs text-slate-500 font-mono mt-0.5">{article.slug}</p>
                                        </TableCell>
                                        <TableCell className="text-slate-400 text-sm">{CATEGORIES[article.category] ?? article.category}</TableCell>
                                        <TableCell>{statusBadge(article.status)}</TableCell>
                                        <TableCell className="text-slate-400 text-sm">{article.read_time} min</TableCell>
                                        <TableCell className="text-slate-500 text-xs">
                                            {article.published_at ? new Date(article.published_at).toLocaleDateString('es-ES') : '—'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <Link href={`/editorial/${article.slug}`} target="_blank">
                                                    <Button variant="ghost" size="icon" className="w-7 h-7 text-slate-500 hover:text-white">
                                                        <Eye className="w-3.5 h-3.5" />
                                                    </Button>
                                                </Link>
                                                <Button variant="ghost" size="icon" className="w-7 h-7 text-slate-500 hover:text-emerald-400" onClick={() => setEditing(article)}>
                                                    <Pencil className="w-3.5 h-3.5" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="w-7 h-7 text-slate-500 hover:text-red-400" onClick={() => handleDelete(article.id, article.title)}>
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
