"use client"

import { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal, Shield, Ban, UserCog } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    DropdownMenuSubContent,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu"
import { updateUserRole, banUser } from "../actions"
import { useState } from "react"
import { useRouter } from "next/navigation"

// Define the shape of our data
export type User = {
    id: string
    email: string
    full_name: string | null
    role: 'admin' | 'user' | 'moderator' | 'beta'
    updated_at: string
    is_banned: boolean
}

export const columns: ColumnDef<User>[] = [
    {
        accessorKey: "email",
        header: "Email",
    },
    {
        accessorKey: "full_name",
        header: "Nombre",
        cell: ({ row }) => {
            return row.getValue("full_name") || <span className="text-slate-500 italic">Sin nombre</span>
        }
    },
    {
        accessorKey: "role",
        header: "Rol",
        cell: ({ row }) => {
            const role = row.getValue("role") as string
            let color = "bg-slate-800 text-slate-300"

            if (role === 'admin') color = "bg-red-900/50 text-red-200 border-red-800"
            if (role === 'moderator') color = "bg-purple-900/50 text-purple-200 border-purple-800"
            if (role === 'beta') color = "bg-emerald-900/50 text-emerald-200 border-emerald-800"

            return (
                <span className={`px-2 py-1 rounded-full text-xs font-medium border ${color}`}>
                    {role.toUpperCase()}
                </span>
            )
        },
    },
    {
        accessorKey: "updated_at",
        header: "Última Actividad",
        cell: ({ row }) => {
            return new Date(row.getValue("updated_at")).toLocaleDateString()
        }
    },
    {
        accessorKey: "is_banned",
        header: "Estado",
        cell: ({ row }) => {
            const isBanned = row.getValue("is_banned")
            return isBanned ? (
                <span className="text-red-500 font-bold flex items-center gap-1"><Ban size={14} /> BANEADO</span>
            ) : (
                <span className="text-emerald-500 font-medium">Activo</span>
            )
        }
    },
    {
        id: "actions",
        cell: ({ row }) => {
            const user = row.original
            const router = useRouter()
            const [loading, setLoading] = useState(false)

            const handleRoleChange = async (newRole: string) => {
                setLoading(true)
                try {
                    await updateUserRole(user.id, newRole)
                    router.refresh()
                } catch (error) {
                    console.error(error)
                    alert("Error al actualizar rol")
                } finally {
                    setLoading(false)
                }
            }

            const handleBan = async () => {
                if (!confirm("¿Estás seguro de banear a este usuario?")) return;
                setLoading(true)
                try {
                    await banUser(user.id)
                    router.refresh()
                } catch (error) {
                    console.error(error)
                    alert("Error al banear usuario")
                } finally {
                    setLoading(false)
                }
            }

            return (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-slate-800 text-slate-400">
                            <span className="sr-only">Abrir menú</span>
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-slate-900 border-slate-800 text-slate-200">
                        <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                        <DropdownMenuItem
                            onClick={() => navigator.clipboard.writeText(user.id)}
                            className="hover:bg-slate-800 focus:bg-slate-800 cursor-pointer"
                        >
                            Copiar ID
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-slate-800" />

                        <DropdownMenuSub>
                            <DropdownMenuSubTrigger className="hover:bg-slate-800 focus:bg-slate-800 cursor-pointer">
                                <UserCog className="mr-2 h-4 w-4" />
                                <span>Cambiar Rol</span>
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent className="bg-slate-900 border-slate-800 text-slate-200">
                                <DropdownMenuRadioGroup value={user.role} onValueChange={handleRoleChange}>
                                    <DropdownMenuRadioItem value="user" className="hover:bg-slate-800 focus:bg-slate-800 cursor-pointer">User</DropdownMenuRadioItem>
                                    <DropdownMenuRadioItem value="beta" className="hover:bg-slate-800 focus:bg-slate-800 cursor-pointer">Beta Tester</DropdownMenuRadioItem>
                                    <DropdownMenuRadioItem value="moderator" className="hover:bg-slate-800 focus:bg-slate-800 cursor-pointer">Moderator</DropdownMenuRadioItem>
                                    <DropdownMenuRadioItem value="admin" className="hover:bg-slate-800 focus:bg-slate-800 cursor-pointer text-red-400">Admin</DropdownMenuRadioItem>
                                </DropdownMenuRadioGroup>
                            </DropdownMenuSubContent>
                        </DropdownMenuSub>

                        <DropdownMenuSeparator className="bg-slate-800" />
                        <DropdownMenuItem onClick={handleBan} className="text-red-500 hover:bg-red-900/20 focus:bg-red-900/20 cursor-pointer">
                            <Shield className="mr-2 h-4 w-4" />
                            Banear Usuario
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            )
        },
    },
]
