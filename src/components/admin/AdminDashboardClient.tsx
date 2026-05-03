'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Users, Activity, DollarSign, TrendingUp, Cpu, Server, Database, Globe, Loader2 } from "lucide-react";
import { getRecentAuditLogs } from '@/app/admin/actions';

interface DashboardStats {
    totalUsers: number;
    conversionRate: string; // Total Reviews
    costs: string;
}

export default function AdminDashboardClient({ initialStats }: { initialStats: DashboardStats }) {
    const [stats, setStats] = useState(initialStats);
    const [logs, setLogs] = useState<any[]>([]);
    const [serverLoad, setServerLoad] = useState({ cpu: 12, memory: 34, storage: 67 });
    const supabase = useMemo(() => createClient(), []);
    const channelsRef = useRef<any[]>([]);

    useEffect(() => {
        // Fetch initial logs
        getRecentAuditLogs().then(setLogs);

        // Channel for Profiles (Total Users)
        const profilesChannel = supabase
            .channel('realtime-profiles')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'profiles' },
                (payload: any) => {
                    setStats(prev => ({
                        ...prev,
                        totalUsers: prev.totalUsers + 1
                    }));
                }
            )
            .subscribe();
        channelsRef.current.push(profilesChannel);

        // Channel for Reviews (Conversion)
        const reviewsChannel = supabase
            .channel('realtime-reviews')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'reviews' },
                (payload: any) => {
                    setStats(prev => ({
                        ...prev,
                        conversionRate: (parseInt(prev.conversionRate) + 1).toString()
                    }));
                }
            )
            .subscribe();
        channelsRef.current.push(reviewsChannel);

        // Simulate Server Load Fluctuations
        const interval = setInterval(() => {
            setServerLoad(prev => ({
                cpu: Math.min(100, Math.max(5, prev.cpu + (Math.random() * 10 - 5))),
                memory: Math.min(100, Math.max(20, prev.memory + (Math.random() * 6 - 3))),
                storage: 67 // Storage usually stable
            }));
        }, 3000);

        return () => {
            channelsRef.current.forEach((channel) => {
                try {
                    channel.unsubscribe?.();
                } catch (err) {
                    console.warn('[AdminDashboardClient] channel unsubscribe failed:', err);
                }
                try {
                    supabase.removeChannel(channel);
                } catch (err) {
                    console.warn('[AdminDashboardClient] removeChannel failed:', err);
                }
            });
            channelsRef.current = [];
            clearInterval(interval);
        };
    }, []);

    return (
        <div className="space-y-8">
            <div className="flex items-end justify-between border-b border-white/5 pb-6">
                <div>
                    <h2 className="text-3xl font-bold text-white tracking-tight">Command Center</h2>
                    <p className="text-slate-500 mt-1 font-mono text-sm">System Overview & Real-time Metrics</p>
                </div>
                <div className="flex items-center gap-3 bg-emerald-500/5 border border-emerald-500/10 px-4 py-2 rounded-full">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span className="text-xs font-mono text-emerald-400 uppercase tracking-wider">Live Connection Established</span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Total Operatives"
                    value={stats.totalUsers.toString()}
                    icon={<Users className="w-5 h-5 text-blue-400" />}
                    trend="Live Updates"
                    color="blue"
                />
                <StatCard
                    title="System Revenue"
                    value={stats.costs}
                    icon={<DollarSign className="w-5 h-5 text-amber-400" />}
                    trend="Estimated"
                    color="amber"
                />
                <StatCard
                    title="Intel Gathered"
                    value={stats.conversionRate}
                    icon={<Database className="w-5 h-5 text-purple-400" />}
                    trend="Total Reviews"
                    color="purple"
                />
            </div>

            {/* System Status Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-black/40 border border-white/5 rounded-xl p-1 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-[url('https://upload.wikimedia.org/wikipedia/commons/e/ec/World_map_blank_without_borders.svg')] bg-cover bg-center opacity-10" />
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent" />

                    {/* Scanning Effect */}
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-500/10 to-transparent h-[20%] w-full animate-[scan_4s_ease-in-out_infinite]" />

                    <div className="h-80 flex flex-col items-center justify-center text-slate-600 space-y-4 relative z-10">
                        <div className="relative">
                            <Globe className="w-16 h-16 text-emerald-500/20 animate-pulse" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-24 h-24 border border-emerald-500/20 rounded-full animate-[spin_10s_linear_infinite]" />
                            </div>
                        </div>
                        <div className="text-center">
                            <p className="font-mono text-sm uppercase tracking-widest text-emerald-500/50">Global Surveillance Active</p>
                            <p className="text-[10px] text-slate-600 font-mono mt-1">Scanning for threats...</p>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-black/40 border border-white/5 rounded-xl p-6 relative overflow-hidden">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider font-mono">Server Load</h3>
                            <Server className="w-4 h-4 text-slate-600" />
                        </div>
                        <div className="space-y-4">
                            <div className="space-y-1">
                                <div className="flex justify-between text-xs text-slate-500 font-mono">
                                    <span>CPU Usage</span>
                                    <span className="text-emerald-400">{serverLoad.cpu.toFixed(1)}%</span>
                                </div>
                                <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-emerald-500 rounded-full transition-all duration-1000 ease-in-out"
                                        style={{ width: `${serverLoad.cpu}%` }}
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <div className="flex justify-between text-xs text-slate-500 font-mono">
                                    <span>Memory</span>
                                    <span className="text-blue-400">{serverLoad.memory.toFixed(1)}%</span>
                                </div>
                                <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-blue-500 rounded-full transition-all duration-1000 ease-in-out"
                                        style={{ width: `${serverLoad.memory}%` }}
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <div className="flex justify-between text-xs text-slate-500 font-mono">
                                    <span>Storage</span>
                                    <span className="text-amber-400">{serverLoad.storage}%</span>
                                </div>
                                <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-amber-500 rounded-full transition-all duration-1000 ease-in-out"
                                        style={{ width: `${serverLoad.storage}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-black/40 border border-white/5 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider font-mono">System Logs</h3>
                            <Cpu className="w-4 h-4 text-slate-600" />
                        </div>
                        <div className="space-y-3 font-mono text-xs max-h-[150px] overflow-hidden relative">
                            {logs.length > 0 ? (
                                logs.map((log, i) => (
                                    <div key={log.id || i} className="flex gap-3 text-slate-500 animate-fade-in">
                                        <span className="text-slate-700 whitespace-nowrap">{new Date(log.created_at).toLocaleTimeString()}</span>
                                        <span className="truncate text-slate-400">{log.action}</span>
                                    </div>
                                ))
                            ) : (
                                <div className="text-slate-600 italic">No recent logs...</div>
                            )}
                            {/* Fade out bottom */}
                            <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ title, value, icon, trend, color }: { title: string; value: string; icon: React.ReactNode; trend: string, color: string }) {
    const colorStyles = {
        blue: "group-hover:border-blue-500/30 group-hover:shadow-[0_0_20px_rgba(59,130,246,0.1)]",
        emerald: "group-hover:border-emerald-500/30 group-hover:shadow-[0_0_20px_rgba(16,185,129,0.1)]",
        amber: "group-hover:border-amber-500/30 group-hover:shadow-[0_0_20px_rgba(245,158,11,0.1)]",
        purple: "group-hover:border-purple-500/30 group-hover:shadow-[0_0_20px_rgba(168,85,247,0.1)]",
    };

    return (
        <div className={`bg-black/40 border border-white/5 rounded-xl p-6 transition-all duration-300 group ${colorStyles[color as keyof typeof colorStyles]}`}>
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider font-mono">{title}</h3>
                <div className="p-2 bg-white/5 rounded-lg border border-white/5 group-hover:border-white/10 transition-colors">
                    {icon}
                </div>
            </div>
            <div className="text-3xl font-bold text-white mb-1 tracking-tight font-mono">{value}</div>
            <div className="text-[10px] text-emerald-500/70 font-mono uppercase tracking-wider flex items-center gap-1">
                <div className="w-1 h-1 rounded-full bg-emerald-500" />
                {trend}
            </div>
        </div>
    );
}
