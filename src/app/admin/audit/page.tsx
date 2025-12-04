'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Loader2, ShieldAlert } from 'lucide-react';

interface AdminLog {
    id: string;
    admin_id: string;
    action: string;
    target_id: string;
    details: any;
    ip_address: string;
    created_at: string;
    admin_email?: string; // We'll fetch this
}

export default function AuditLogsPage() {
    const [logs, setLogs] = useState<AdminLog[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        try {
            const { data, error } = await supabase
                .from('admin_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(100);

            if (error) throw error;

            // Fetch admin emails manually since we might not have a relation set up or want to join profiles
            // For now, let's just display the ID or try to fetch profiles if possible.
            // Assuming we can fetch profiles:
            const adminIds = [...new Set(data.map((log: AdminLog) => log.admin_id))];
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, email') // Assuming profiles has email, or we use auth.users which we can't select from client easily.
                // Actually, profiles usually has username or full_name. Let's use what we have.
                .in('id', adminIds);

            const logsWithDetails = data.map((log: AdminLog) => ({
                ...log,
                admin_email: profiles?.find((p: { id: string; email: string }) => p.id === log.admin_id)?.email || log.admin_id,
            }));

            setLogs(logsWithDetails);
        } catch (error) {
            console.error('Error fetching logs:', error);
        } finally {
            setLoading(false);
        }
    };

    const getActionColor = (action: string) => {
        if (action.includes('BAN')) return 'destructive';
        if (action.includes('DELETE')) return 'destructive';
        if (action.includes('UPDATE')) return 'default';
        return 'secondary';
    };

    if (loading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6 p-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
                    <p className="text-muted-foreground">
                        Registro de todas las acciones administrativas (La Caja Negra).
                    </p>
                </div>
                <ShieldAlert className="h-10 w-10 text-muted-foreground" />
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Historial de Acciones</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Fecha</TableHead>
                                <TableHead>Admin</TableHead>
                                <TableHead>Acción</TableHead>
                                <TableHead>Target ID</TableHead>
                                <TableHead>Detalles</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {logs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                        No hay registros de auditoría.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                logs.map((log) => (
                                    <TableRow key={log.id}>
                                        <TableCell className="whitespace-nowrap">
                                            {format(new Date(log.created_at), "d MMM yyyy, HH:mm:ss", { locale: es })}
                                        </TableCell>
                                        <TableCell className="font-medium">{log.admin_email}</TableCell>
                                        <TableCell>
                                            <Badge variant={getActionColor(log.action) as any}>
                                                {log.action}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="font-mono text-xs">{log.target_id || '-'}</TableCell>
                                        <TableCell className="max-w-md truncate text-xs text-muted-foreground">
                                            {JSON.stringify(log.details)}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
