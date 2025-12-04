'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Megaphone, Send, Loader2, History, Radio } from 'lucide-react';
import { toast } from 'sonner';
import { logAdminAction } from '@/lib/admin-logger';
import { updateAnnouncement } from '../settings/actions';
import { getBroadcastHistory } from './actions';

export default function CommunicationPage() {
    const [message, setMessage] = useState('');
    const [title, setTitle] = useState('Anuncio del Sistema');
    const [type, setType] = useState<'info' | 'warning' | 'success'>('info');
    const [isGlobal, setIsGlobal] = useState(false);
    const [sending, setSending] = useState(false);
    const [history, setHistory] = useState<any[]>([]);
    const supabase = createClient();

    useEffect(() => {
        loadHistory();
    }, []);

    const loadHistory = async () => {
        const data = await getBroadcastHistory();
        setHistory(data);
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!message) return;

        setSending(true);
        try {
            // 1. Send Real-time Broadcast
            const channel = supabase.channel('system_broadcasts');

            await new Promise((resolve, reject) => {
                channel.subscribe(async (status: string) => {
                    if (status === 'SUBSCRIBED') {
                        await channel.send({
                            type: 'broadcast',
                            event: 'system_alert',
                            payload: { title, message, type },
                        });
                        resolve(null);
                    } else if (status === 'CHANNEL_ERROR') {
                        reject(new Error('Channel error'));
                    }
                });
            });

            supabase.removeChannel(channel);

            // 2. Log Action (which effectively adds to history)
            await logAdminAction('BROADCAST_MESSAGE', 'GLOBAL', { title, message, type, isGlobal });

            // 3. Set as Global Announcement if checked
            if (isGlobal) {
                const result = await updateAnnouncement(message, type);
                if (!result.success) {
                    toast.error('Broadcast enviado, pero falló al fijar como anuncio global');
                } else {
                    toast.success('Mensaje enviado y fijado como anuncio global');
                }
            } else {
                toast.success('Mensaje enviado a todos los usuarios conectados');
            }

            setMessage('');
            setIsGlobal(false);
            await loadHistory(); // Reload history
        } catch (error) {
            console.error(error);
            toast.error('Error al enviar mensaje');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="space-y-6 p-8 max-w-6xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Sistema de Broadcast</h1>
                    <p className="text-muted-foreground">
                        Envía alertas en tiempo real y gestiona anuncios globales.
                    </p>
                </div>
                <Megaphone className="h-10 w-10 text-muted-foreground" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Send Form */}
                <Card className="lg:col-span-1 h-fit">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Radio className="w-5 h-5 text-red-500 animate-pulse" />
                            Nueva Alerta
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSend} className="space-y-4">
                            <div>
                                <Label className="mb-1.5 block">Tipo de Mensaje</Label>
                                <div className="flex gap-2">
                                    {[
                                        { id: 'info', label: 'Info', color: 'bg-blue-500' },
                                        { id: 'warning', label: 'Alerta', color: 'bg-amber-500' },
                                        { id: 'success', label: 'Éxito', color: 'bg-emerald-500' }
                                    ].map((t) => (
                                        <button
                                            key={t.id}
                                            type="button"
                                            onClick={() => setType(t.id as any)}
                                            className={`flex-1 py-2 rounded-md text-xs font-medium transition-all ${type === t.id
                                                ? `${t.color} text-white shadow-md`
                                                : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                                                }`}
                                        >
                                            {t.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <Label htmlFor="title" className="mb-1.5 block">Título</Label>
                                <Input
                                    id="title"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Ej. Mantenimiento"
                                    required
                                />
                            </div>

                            <div>
                                <Label htmlFor="message" className="mb-1.5 block">Mensaje</Label>
                                <Textarea
                                    id="message"
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    placeholder="Escribe tu mensaje aquí..."
                                    rows={4}
                                    required
                                />
                            </div>

                            <div className="flex items-center space-x-2 bg-secondary/30 p-3 rounded-lg border border-border/50">
                                <Checkbox
                                    id="global"
                                    checked={isGlobal}
                                    onCheckedChange={(checked) => setIsGlobal(checked as boolean)}
                                />
                                <div className="grid gap-1.5 leading-none">
                                    <Label
                                        htmlFor="global"
                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                    >
                                        Fijar como Anuncio Global
                                    </Label>
                                    <p className="text-xs text-muted-foreground">
                                        Se mostrará como banner fijo en la parte superior.
                                    </p>
                                </div>
                            </div>

                            <Button type="submit" disabled={sending} className="w-full">
                                {sending ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                                Enviar Broadcast
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* History */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <History className="w-5 h-5" />
                            Historial de Broadcasts
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Estado</TableHead>
                                        <TableHead>Mensaje</TableHead>
                                        <TableHead className="text-right">Enviado</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {history.map((log) => (
                                        <TableRow key={log.id}>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-2 h-2 rounded-full ${log.details?.type === 'warning' ? 'bg-amber-500' :
                                                        log.details?.type === 'success' ? 'bg-emerald-500' :
                                                            'bg-blue-500'
                                                        }`} />
                                                    <span className="text-xs text-muted-foreground capitalize">
                                                        {log.details?.type || 'info'}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-1">
                                                    <span className="font-medium text-sm">{log.details?.title}</span>
                                                    <span className="text-xs text-muted-foreground line-clamp-1">{log.details?.message}</span>
                                                    {log.details?.isGlobal && (
                                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary w-fit">
                                                            Global
                                                        </span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right text-xs text-muted-foreground">
                                                <div className="flex flex-col items-end">
                                                    <span>{new Date(log.created_at).toLocaleDateString()}</span>
                                                    <span>{new Date(log.created_at).toLocaleTimeString()}</span>
                                                    <span className="text-[10px] opacity-70">{log.profiles?.email}</span>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {history.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                                                No hay historial de broadcasts.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
