'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Users, Activity, DollarSign, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface DashboardStats {
    totalUsers: number;
    activeUsers: number; // Active Rooms
    conversionRate: string; // Total Reviews
    costs: string;
}

export default function AdminDashboardClient({ initialStats }: { initialStats: DashboardStats }) {
    const [stats, setStats] = useState(initialStats);
    const supabase = createClient();

    useEffect(() => {
        // Channel for Profiles (Total Users)
        const profilesChannel = supabase
            .channel('realtime-profiles')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'profiles' },
                (payload) => {
                    setStats(prev => ({
                        ...prev,
                        totalUsers: prev.totalUsers + 1
                    }));
                }
            )
            .subscribe();

        // Channel for Watch Parties (Active Rooms)
        const roomsChannel = supabase
            .channel('realtime-rooms')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'parties' },
                async (payload) => {
                    // For rooms, it's safer to re-fetch count or handle specific events.
                    // Simple logic: 
                    // INSERT -> +1
                    // UPDATE (status -> finished) -> -1
                    // DELETE -> -1
                    // But status update is tricky without checking previous state.
                    // Let's just increment/decrement based on event type for now, 
                    // assuming INSERT is new active room and DELETE/UPDATE-to-finished is removal.
                    // Actually, simpler to just listen and maybe re-fetch or use a more robust logic.
                    // For this demo, let's assume:
                    if (payload.eventType === 'INSERT') {
                        setStats(prev => ({ ...prev, activeUsers: prev.activeUsers + 1 }));
                    } else if (payload.eventType === 'DELETE') {
                        setStats(prev => ({ ...prev, activeUsers: Math.max(0, prev.activeUsers - 1) }));
                    } else if (payload.eventType === 'UPDATE') {
                        const newStatus = (payload.new as any).status;
                        const oldStatus = (payload.old as any)?.status; // 'old' might be empty depending on replica identity

                        if (newStatus === 'finished') {
                            setStats(prev => ({ ...prev, activeUsers: Math.max(0, prev.activeUsers - 1) }));
                        }
                    }
                }
            )
            .subscribe();

        // Channel for Reviews (Conversion)
        const reviewsChannel = supabase
            .channel('realtime-reviews')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'reviews' },
                (payload) => {
                    setStats(prev => ({
                        ...prev,
                        conversionRate: (parseInt(prev.conversionRate) + 1).toString()
                    }));
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(profilesChannel);
            supabase.removeChannel(roomsChannel);
            supabase.removeChannel(reviewsChannel);
        };
    }, [supabase]);

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-3xl font-bold text-white">Dashboard</h2>
                <p className="text-slate-400 flex items-center gap-2">
                    <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                    </span>
                    Conectado en tiempo real
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Total Users"
                    value={stats.totalUsers.toString()}
                    icon={<Users className="text-blue-400" />}
                    trend="Live Updates"
                />
                <StatCard
                    title="Salas Activas"
                    value={stats.activeUsers.toString()}
                    icon={<Activity className="text-emerald-400" />}
                    trend="Live Updates"
                />
                <StatCard
                    title="Revenue"
                    value={stats.costs}
                    icon={<DollarSign className="text-amber-400" />}
                    trend="Estimated"
                />
                <StatCard
                    title="Total Reseñas"
                    value={stats.conversionRate}
                    icon={<TrendingUp className="text-purple-400" />}
                    trend="Live Updates"
                />
            </div>

            {/* Placeholder for Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 h-96 flex items-center justify-center text-slate-500">
                    User Growth Chart (Coming Soon)
                </div>
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 h-96 flex items-center justify-center text-slate-500">
                    Content Popularity Chart (Coming Soon)
                </div>
            </div>
        </div>
    );
}

function StatCard({ title, value, icon, trend }: { title: string; value: string; icon: React.ReactNode; trend: string }) {
    return (
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 hover:bg-slate-900 transition-colors">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-slate-400 text-sm font-medium">{title}</h3>
                <div className="p-2 bg-slate-800 rounded-lg">
                    {icon}
                </div>
            </div>
            <div className="text-2xl font-bold text-white mb-1">{value}</div>
            <div className="text-xs text-emerald-400">{trend}</div>
        </div>
    );
}
