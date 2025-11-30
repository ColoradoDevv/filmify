"use client"

import {
    LineChart,
    Line,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts"

interface DashboardChartsProps {
    userGrowthData: { date: string; users: number }[];
    popularMoviesData: { name: string; views: number }[];
}

export function DashboardCharts({ userGrowthData, popularMoviesData }: DashboardChartsProps) {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* User Growth Chart */}
            <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 h-96">
                <h3 className="text-slate-400 text-sm font-medium mb-6">Crecimiento de Usuarios</h3>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={userGrowthData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc' }}
                            itemStyle={{ color: '#f8fafc' }}
                        />
                        <Line type="monotone" dataKey="users" stroke="#ef4444" strokeWidth={2} dot={false} />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* Popular Movies Chart */}
            <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 h-96">
                <h3 className="text-slate-400 text-sm font-medium mb-6">Películas Populares</h3>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={popularMoviesData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                        <XAxis type="number" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} width={100} />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc' }}
                            itemStyle={{ color: '#f8fafc' }}
                            cursor={{ fill: '#1e293b' }}
                        />
                        <Bar dataKey="views" fill="#10b981" radius={[0, 4, 4, 0]} barSize={32} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}
