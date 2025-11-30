'use client';

import { useEffect, useState } from 'react';
import { getRooms, terminateRoom } from '../actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Users, Clock, AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function LiveOpsPage() {
    const [rooms, setRooms] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        loadRooms();
    }, []);

    const loadRooms = async () => {
        setLoading(true);
        const data = await getRooms();
        setRooms(data);
        setLoading(false);
    };

    const handleTerminate = async (roomId: string) => {
        if (!confirm('¿Estás seguro de terminar esta sala? Todos los usuarios serán desconectados.')) return;

        const result = await terminateRoom(roomId);
        if (result.success) {
            loadRooms();
            router.refresh();
        } else {
            alert('Error al terminar la sala: ' + result.error);
        }
    };

    if (loading) {
        return <div className="text-slate-400">Cargando operaciones en vivo...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold text-white">Live Ops</h2>
                    <p className="text-slate-400">Monitoreo de salas en tiempo real</p>
                </div>
                <Button onClick={loadRooms} variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800">
                    Actualizar
                </Button>
            </div>

            {rooms.length === 0 ? (
                <Card className="bg-slate-900/50 border-slate-800">
                    <CardContent className="flex flex-col items-center justify-center py-12 text-slate-500">
                        <Play size={48} className="mb-4 opacity-20" />
                        <p>No hay salas activas en este momento.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {rooms.map((room) => (
                        <Card key={room.id} className="bg-slate-900 border-slate-800 overflow-hidden">
                            <div className="relative h-32 bg-slate-800">
                                {room.poster_path ? (
                                    <img
                                        src={`https://image.tmdb.org/t/p/w500${room.poster_path}`}
                                        alt={room.title}
                                        className="w-full h-full object-cover opacity-50"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-slate-800 text-slate-600">
                                        <Play size={32} />
                                    </div>
                                )}
                                <div className="absolute top-2 right-2">
                                    <Badge className={
                                        room.status === 'playing' ? 'bg-emerald-500' :
                                            room.status === 'waiting' ? 'bg-yellow-500' : 'bg-slate-500'
                                    }>
                                        {room.status.toUpperCase()}
                                    </Badge>
                                </div>
                            </div>
                            <CardHeader>
                                <CardTitle className="text-lg text-white truncate" title={room.title}>
                                    {room.title}
                                </CardTitle>
                                <p className="text-sm text-slate-400 truncate">{room.name}</p>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex justify-between text-sm text-slate-400">
                                    <div className="flex items-center gap-2">
                                        <Users size={16} />
                                        <span>{room.party_members?.length || 0} usuarios</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Clock size={16} />
                                        <span>{new Date(room.created_at).toLocaleTimeString()}</span>
                                    </div>
                                </div>

                                <Button
                                    variant="destructive"
                                    className="w-full bg-red-900/20 hover:bg-red-900/40 text-red-500 border border-red-900/50"
                                    onClick={() => handleTerminate(room.id)}
                                >
                                    <AlertTriangle size={16} className="mr-2" />
                                    Terminar Sala
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
