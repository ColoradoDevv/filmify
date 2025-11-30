import Link from 'next/link';
import {
    LayoutDashboard,
    Users,
    ShieldAlert,
    Activity,
    Settings,
    LogOut
} from 'lucide-react';

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans">
            {/* Sidebar */}
            <aside className="w-64 border-r border-slate-800 bg-slate-900/50 backdrop-blur-xl flex flex-col fixed h-full z-10">
                <div className="p-6 border-b border-slate-800">
                    <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                        Filmify Admin
                    </h1>
                    <p className="text-xs text-slate-500 mt-1">God Mode</p>
                </div>

                <nav className="flex-1 p-4 space-y-2">
                    <NavLink href="/admin" icon={<LayoutDashboard size={20} />} label="Dashboard" />
                    <NavLink href="/admin/users" icon={<Users size={20} />} label="Users" />
                    <NavLink href="/admin/moderation" icon={<ShieldAlert size={20} />} label="Moderation" />
                    <NavLink href="/admin/live-ops" icon={<Activity size={20} />} label="Live Ops" />
                    <NavLink href="/admin/settings" icon={<Settings size={20} />} label="Settings" />
                </nav>

                <div className="p-4 border-t border-slate-800">
                    <Link
                        href="/browse"
                        className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                    >
                        <LogOut size={20} />
                        <span>Exit God Mode</span>
                    </Link>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 ml-64 p-8">
                <div className="max-w-7xl mx-auto">
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
            className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all duration-200 group"
        >
            <span className="group-hover:text-emerald-400 transition-colors">{icon}</span>
            <span>{label}</span>
        </Link>
    );
}
