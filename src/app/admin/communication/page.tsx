'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Megaphone, Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { logAdminAction } from '@/lib/admin-logger';

export default function CommunicationPage() {
    const [message, setMessage] = useState('');
    const [title, setTitle] = useState('Anuncio del Sistema');
    const [sending, setSending] = useState(false);
    const supabase = createClient();

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!message) return;

        setSending(true);
        try {
            const channel = supabase.channel('system_broadcasts');

            // We need to subscribe before sending? 
            // Actually, for broadcast, we just need to publish.
            // But usually we need to be joined.

            await new Promise((resolve, reject) => {
                channel.subscribe(async (status) => {
                    if (status === 'SUBSCRIBED') {
                        await channel.send({
                            type: 'broadcast',
                            event: 'system_alert',
                            payload: { title, message, type: 'warning' },
                        });
                        resolve(null);
                    } else if (status === 'CHANNEL_ERROR') {
                        reject(new Error('Channel error'));
                    }
                });
            });

            // Clean up
            supabase.removeChannel(channel);

            await logAdminAction('BROADCAST_MESSAGE', 'GLOBAL', { title, message });
            toast.success('Mensaje enviado a todos los usuarios conectados');
            setMessage('');
        } catch (error) {
            console.error(error);
            toast.error('Error al enviar mensaje');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="space-y-6 p-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Sistema de Broadcast</h1>
                    <p className="text-muted-foreground">
                        Envía alertas globales en tiempo real (Megáfono).
                    </p>
                </div>
                <Megaphone className="h-10 w-10 text-muted-foreground" />
            </div>

            <Card className="max-w-2xl">
                <CardHeader>
                    <CardTitle>Enviar Alerta Global</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSend} className="space-y-4">
                        <div>
                            <label className="text-sm font-medium mb-1 block">Título</label>
                            <Input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Ej. Mantenimiento Programado"
                                required
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1 block">Mensaje</label>
                            <Textarea
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="Escribe tu mensaje aquí..."
                                rows={4}
                                required
                            />
                        </div>
                        <Button type="submit" disabled={sending} className="w-full">
                            {sending ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                            Enviar Broadcast
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
