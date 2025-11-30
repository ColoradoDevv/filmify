import { getDashboardStats } from "./actions";
import { Users, Activity, DollarSign, TrendingUp } from "lucide-react";

export default async function AdminDashboard() {
    const stats = await getDashboardStats();

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-3xl font-bold text-white">Dashboard</h2>
                <p className="text-slate-400">Overview of platform performance.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Total Users"
                    value={stats.totalUsers.toString()}
                    icon={<Users className="text-blue-400" />}
                    trend="+12% from last month"
                />
                <StatCard
                    title="Active Users"
                    value={stats.activeUsers.toString()}
                    icon={<Activity className="text-emerald-400" />}
                    trend="+5% from yesterday"
                />
                <StatCard
                    title="Revenue"
                    value={stats.costs}
                    icon={<DollarSign className="text-amber-400" />}
                    trend="+8% from last month"
                />
                <StatCard
                    title="Conversion"
                    value={stats.conversionRate}
                    icon={<TrendingUp className="text-purple-400" />}
                    trend="+2% from last month"
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
