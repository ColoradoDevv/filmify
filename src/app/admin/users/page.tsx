import { getUsers } from "../actions"
import { columns } from "./columns"
import { DataTable } from "@/components/admin/DataTable"

export default async function UsersPage({
    searchParams,
}: {
    searchParams: Promise<{ page?: string; search?: string }>
}) {
    const resolvedSearchParams = await searchParams;
    const page = Number(resolvedSearchParams?.page) || 1
    const search = resolvedSearchParams?.search || ""

    const { data: users, count } = await getUsers(page, 10, search)

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-3xl font-bold text-white">Gestión de Usuarios</h2>
                <p className="text-slate-400">Administra roles, accesos y moderación.</p>
            </div>

            <DataTable columns={columns} data={users} searchKey="email" />
        </div>
    )
}
