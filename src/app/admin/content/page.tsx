'use client';

import { useState, useEffect } from 'react';
import { addToBlacklist, removeFromBlacklist, getBlacklist } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, ShieldBan, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ContentBlacklistPage() {
    const [blacklist, setBlacklist] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [tmdbId, setTmdbId] = useState('');
    const [mediaType, setMediaType] = useState<'movie' | 'tv'>('movie');
    const [reason, setReason] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        loadBlacklist();
    }, []);

    const loadBlacklist = async () => {
        const data = await getBlacklist();
        setBlacklist(data);
        setLoading(false);
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!tmdbId || !reason) return;

        setSubmitting(true);
        const res = await addToBlacklist(Number(tmdbId), mediaType, reason);

        if (res.success) {
            toast.success('Contenido agregado a la blacklist');
            setTmdbId('');
            setReason('');
            loadBlacklist();
        } else {
            toast.error(res.error || 'Error al agregar');
        }
        setSubmitting(false);
    };

    const handleRemove = async (id: string) => {
        if (!confirm('¿Quitar de la blacklist?')) return;

        const res = await removeFromBlacklist(id);
        if (res.success) {
            toast.success('Contenido removido');
            loadBlacklist();
        } else {
            toast.error('Error al remover');
        }
    };

    return (
        <div className="space-y-6 p-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Content Blacklist</h1>
                    <p className="text-muted-foreground">
                        Bloquea contenido específico por ID de TMDB (Kill Switch).
                    </p>
                </div>
                <ShieldBan className="h-10 w-10 text-muted-foreground" />
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Agregar a Blacklist</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleAdd} className="space-y-4">
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="text-sm font-medium mb-1 block">TMDB ID</label>
                                    <Input
                                        type="number"
                                        placeholder="ej. 12345"
                                        value={tmdbId}
                                        onChange={(e) => setTmdbId(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="w-32">
                                    <label className="text-sm font-medium mb-1 block">Tipo</label>
                                    <select
                                        className="flex h-10 w-full items-center justify-between rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:ring-offset-slate-950 dark:focus-visible:ring-slate-300"
                                        value={mediaType}
                                        onChange={(e) => setMediaType(e.target.value as 'movie' | 'tv')}
                                    >
                                        <option value="movie">Película</option>
                                        <option value="tv">Serie</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1 block">Razón</label>
                                <Input
                                    placeholder="ej. Copyright, Ofensivo..."
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    required
                                />
                            </div>
                            <Button type="submit" disabled={submitting} className="w-full">
                                {submitting ? <Loader2 className="animate-spin h-4 w-4" /> : 'Bloquear Contenido'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Contenido Bloqueado</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>
                        ) : (
                            <div className="max-h-[400px] overflow-y-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>ID</TableHead>
                                            <TableHead>Tipo</TableHead>
                                            <TableHead>Razón</TableHead>
                                            <TableHead></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {blacklist.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={4} className="text-center text-muted-foreground">
                                                    No hay contenido bloqueado.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            blacklist.map((item) => (
                                                <TableRow key={item.id}>
                                                    <TableCell className="font-mono">{item.tmdb_id}</TableCell>
                                                    <TableCell className="capitalize">{item.media_type}</TableCell>
                                                    <TableCell>{item.reason}</TableCell>
                                                    <TableCell>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleRemove(item.id)}
                                                            className="text-red-500 hover:text-red-700 hover:bg-red-900/20"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
