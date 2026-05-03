import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
    LayoutDashboard,
    Users,
    ShieldAlert,
    Activity,
    Settings,
    LogOut,
    FileText,
    Terminal
} from 'lucide-react';
import { createClient } from '@/lib/supabase/server';

// Force dynamic rendering for all admin routes since they use cookies for auth
export const dynamic = 'force-dynamic';

async function verifyAdminAccess() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return false;
    }

    const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (error || !profile) {
        return false;
    }

    return profile.role === 'admin' || profile.role === 'super_admin';
}

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const isAdmin = await verifyAdminAccess();
    if (!isAdmin) {
        redirect('/browse');
    }

    return (
        <div className="flex min-h-screen bg-[#050505] text-slate-300 font-sans selection:bg-emerald-500/30">
            {/* Sidebar */}
            <aside className="w-72 border-r border-white/5 bg-[#0a0a0a] flex flex-col fixed h-full z-10 shadow-2xl shadow-black">
                <div className="p-6 border-b border-white/5">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                            <Terminal className="w-4 h-4 text-emerald-500" />
                        </div>
                        <h1 className="text-lg font-bold text-white tracking-wide">
                            NEXUS <span className="text-emerald-500">CORE</span>
                        </h1>
                    </div>
                    <div className="flex items-center gap-2 px-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <p className="text-[10px] text-emerald-500/70 font-mono uppercase tracking-wider">System Online</p>
                    </div>
                </div>

                <nav className="flex-1 p-4 space-y-1">
                    <div className="px-3 py-2 text-[10px] font-bold text-slate-600 uppercase tracking-widest font-mono">Operations</div>
                    <NavLink href="/admin" icon={<LayoutDashboard size={18} />} label="Command Center" />

                    <div className="px-3 py-2 mt-6 text-[10px] font-bold text-slate-600 uppercase tracking-widest font-mono">Security</div>
                    <NavLink href="/admin/users" icon={<Users size={18} />} label="User Database" />
                    <NavLink href="/admin/moderation" icon={<ShieldAlert size={18} />} label="Threat Mitigation" />
                    <NavLink href="/admin/audit" icon={<FileText size={18} />} label="Audit Logs" />

                    <div className="px-3 py-2 mt-6 text-[10px] font-bold text-slate-600 uppercase tracking-widest font-mono">System</div>
                    <NavLink href="/admin/settings" icon={<Settings size={18} />} label="Configuration" />
                </nav>

                <div className="p-4 border-t border-white/5 bg-black/20">
                    <Link
                        href="/browse"
                        className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:text-white hover:bg-white/5 rounded-lg transition-all duration-200 group border border-transparent hover:border-white/5"
                    >
                        <LogOut size={18} className="group-hover:text-red-400 transition-colors" />
                        <span className="text-sm font-medium">Disconnect</span>
                    </Link>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 ml-72 p-8 relative overflow-hidden">
                {/* Background Grid Effect */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_800px_at_100%_200px,#10b9810a,transparent)] pointer-events-none" />

                <div className="max-w-7xl mx-auto relative z-10">
                    {children}
                </div>
            </main>
        </div>
    );
}

function NavLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
    return (
        <Link
            href={href}
            className="flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-all duration-200 group border border-transparent hover:border-white/5"
        >
            <span className="group-hover:text-emerald-400 transition-colors opacity-70 group-hover:opacity-100">{icon}</span>
            <span className="text-sm font-medium tracking-wide">{label}</span>
        </Link>
    );
}
