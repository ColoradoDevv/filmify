'use client';

import { useEffect, useState } from 'react';
import { getLatestReviews, deleteReview } from '../actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, Trash2, MessageSquare, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

export default function ModerationPage() {
    const [reviews, setReviews] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const loadReviews = async () => {
        setLoading(true);
        const data = await getLatestReviews();
        setReviews(data);
        setLoading(false);
    };

    useEffect(() => {
        loadReviews();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleDelete = async (reviewId: string) => {
        if (!confirm('¿Estás seguro de eliminar esta reseña? Esta acción no se puede deshacer.')) return;

        const result = await deleteReview(reviewId);
        if (result.success) {
            loadReviews();
            router.refresh();
        } else {
            alert('Error al eliminar la reseña: ' + result.error);
        }
    };

    if (loading) {
        return <div className="text-slate-400">Cargando reseñas...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold text-white">Moderación de Contenido</h2>
                    <p className="text-slate-400">Gestión de reseñas y comentarios</p>
                </div>
                <Button onClick={loadReviews} variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800">
                    Actualizar
                </Button>
            </div>

            <Card className="bg-slate-900 border-slate-800">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <MessageSquare className="text-emerald-400" />
                        Últimas Reseñas
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {reviews.length === 0 ? (
                        <div className="text-center py-8 text-slate-500">
                            <ShieldCheck size={48} className="mx-auto mb-4 opacity-20" />
                            <p>No hay reseñas recientes para moderar.</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow className="border-slate-800 hover:bg-transparent">
                                    <TableHead className="text-slate-400">Usuario</TableHead>
                                    <TableHead className="text-slate-400">Calificación</TableHead>
                                    <TableHead className="text-slate-400">Comentario</TableHead>
                                    <TableHead className="text-slate-400">Fecha</TableHead>
                                    <TableHead className="text-right text-slate-400">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {reviews.map((review) => (
                                    <TableRow key={review.id} className="border-slate-800 hover:bg-slate-800/50">
                                        <TableCell className="font-medium text-slate-200">
                                            <div>
                                                {review.profiles?.full_name || 'Usuario Anónimo'}
                                                <div className="text-xs text-slate-500">{review.profiles?.email}</div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center text-yellow-500">
                                                <span className="font-bold mr-1">{review.rating}</span>
                                                <Star size={14} fill="currentColor" />
                                            </div>
                                        </TableCell>
                                        <TableCell className="max-w-md truncate text-slate-300" title={review.comment}>
                                            {review.comment}
                                        </TableCell>
                                        <TableCell className="text-slate-400 text-sm">
                                            {new Date(review.created_at).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                                                onClick={() => handleDelete(review.id)}
                                            >
                                                <Trash2 size={16} />
                                            </Button>
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
