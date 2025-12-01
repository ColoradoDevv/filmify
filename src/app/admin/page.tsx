import { getDashboardStats } from "./actions";
import AdminDashboardClient from "@/components/admin/AdminDashboardClient";

// Force dynamic rendering since this page uses cookies for auth
export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
    const stats = await getDashboardStats();

    return <AdminDashboardClient initialStats={stats} />;
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
