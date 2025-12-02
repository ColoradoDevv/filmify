"use client"

import { useState, useEffect } from "react"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Save, Megaphone, CheckCircle, AlertCircle, Trash2, Clock, History, Settings, Shield, Activity, Users } from "lucide-react"
import { fetchSettings, updateSettings, updateAnnouncement, getAnnouncementHistory, deactivateAnnouncement } from "./actions"
import Modal from "@/components/ui/Modal"
import { Badge } from "@/components/ui/badge"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

export default function SettingsPage() {
    const [flags, setFlags] = useState({
        enableAi: true,
        enableWatchParty: true,
        maintenanceMode: false,
        allowRegistration: true,
        activeAnnouncement: ""
    })
    const [history, setHistory] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [publishing, setPublishing] = useState(false)
    const [newAnnouncement, setNewAnnouncement] = useState("")
    const [newType, setNewType] = useState<'info' | 'warning' | 'success'>('info')
    const [modalOpen, setModalOpen] = useState(false)
    const [modalContent, setModalContent] = useState({ title: "", message: "", type: "success" })

    const [deleteModalOpen, setDeleteModalOpen] = useState(false)
    const [itemToDelete, setItemToDelete] = useState<string | null>(null)

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        setLoading(true)
        const [settings, historyData] = await Promise.all([
            fetchSettings(),
            getAnnouncementHistory()
        ])
        setFlags(settings)
        setHistory(historyData)
        setLoading(false)
    }

    const handleToggle = (key: keyof typeof flags) => {
        setFlags(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }))
    }

    const handleSaveFlags = async () => {
        setSaving(true)
        const result = await updateSettings(flags)
        setSaving(false)

        if (result.success) {
            showModal("Configuración Guardada", "Los cambios se han aplicado correctamente.", "success")
        } else {
            showModal("Error", "No se pudieron guardar los cambios: " + result.error, "error")
        }
    }

    const handlePublish = async () => {
        if (!newAnnouncement.trim()) return;
        setPublishing(true)
        const result = await updateAnnouncement(newAnnouncement, newType)

        if (result.success) {
            setNewAnnouncement("")
            await loadData() // Reload to show new active and history
            showModal("Anuncio Publicado", "El anuncio global está activo.", "success")
        } else {
            showModal("Error", "No se pudo publicar: " + result.error, "error")
        }
        setPublishing(false)
    }

    const confirmDeactivate = (id: string) => {
        setItemToDelete(id)
        setDeleteModalOpen(true)
    }

    const handleDeactivate = async () => {
        if (!itemToDelete) return;

        const result = await deactivateAnnouncement(itemToDelete)
        setDeleteModalOpen(false)
        setItemToDelete(null)

        if (result.success) {
            await loadData()
            showModal("Anuncio Desactivado", "El anuncio global ha sido desactivado correctamente.", "success")
        } else {
            showModal("Error", "No se pudo desactivar: " + result.error, "error")
        }
    }

    const showModal = (title: string, message: string, type: "success" | "error") => {
        setModalContent({ title, message, type })
        setModalOpen(true)
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <p className="text-slate-400 text-sm">Cargando configuración...</p>
                </div>
            </div>
        )
    }

    const activeAnnouncementRecord = history.find(h => h.is_active);

    return (
        <div className="space-y-8 max-w-6xl mx-auto pb-20">
            {/* Success/Error Modal */}
            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={modalContent.title}>
                <div className="flex flex-col items-center text-center space-y-4">
                    {modalContent.type === "success" ? (
                        <CheckCircle className="w-16 h-16 text-emerald-500" />
                    ) : (
                        <AlertCircle className="w-16 h-16 text-red-500" />
                    )}
                    <p className="text-slate-300">{modalContent.message}</p>
                    <Button onClick={() => setModalOpen(false)} className="w-full bg-slate-800 hover:bg-slate-700">
                        Entendido
                    </Button>
                </div>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="¿Desactivar anuncio?">
                <div className="flex flex-col items-center text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-2">
                        <Trash2 className="w-8 h-8 text-red-500" />
                    </div>
                    <p className="text-slate-300">
                        ¿Estás seguro de que quieres desactivar este anuncio global? Dejará de ser visible para todos los usuarios.
                    </p>
                    <div className="flex gap-3 w-full mt-4">
                        <Button
                            onClick={() => setDeleteModalOpen(false)}
                            variant="outline"
                            className="flex-1 border-slate-700 hover:bg-slate-800 text-slate-300"
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleDeactivate}
                            className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                        >
                            Desactivar
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-6">
                <div>
                    <h2 className="text-2xl font-bold text-white tracking-tight">Configuración del Sistema</h2>
                    <p className="text-slate-400 mt-1">Administra las características globales y la comunicación.</p>
                </div>
                <Button
                    onClick={handleSaveFlags}
                    disabled={saving}
                    className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20"
                >
                    {saving ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                            Guardando...
                        </>
                    ) : (
                        <>
                            <Save className="w-4 h-4 mr-2" />
                            Guardar Cambios
                        </>
                    )}
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Feature Flags */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
                        <div className="p-4 border-b border-slate-800 bg-slate-900 flex items-center gap-2">
                            <Settings className="w-4 h-4 text-primary" />
                            <h3 className="font-semibold text-white">Control de Funciones</h3>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label className="text-sm font-medium text-slate-200">Inteligencia Artificial</Label>
                                    <p className="text-xs text-slate-500">Recomendaciones y chat Gemini.</p>
                                </div>
                                <Switch checked={flags.enableAi} onCheckedChange={() => handleToggle('enableAi')} />
                            </div>
                            <div className="h-px bg-slate-800/50" />
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label className="text-sm font-medium text-slate-200">Watch Party</Label>
                                    <p className="text-xs text-slate-500">Salas de visualización compartida.</p>
                                </div>
                                <Switch checked={flags.enableWatchParty} onCheckedChange={() => handleToggle('enableWatchParty')} />
                            </div>
                            <div className="h-px bg-slate-800/50" />
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label className="text-sm font-medium text-slate-200">Registro de Usuarios</Label>
                                    <p className="text-xs text-slate-500">Permitir nuevas cuentas.</p>
                                </div>
                                <Switch checked={flags.allowRegistration} onCheckedChange={() => handleToggle('allowRegistration')} />
                            </div>
                            <div className="h-px bg-slate-800/50" />
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label className="text-sm font-medium text-red-400">Modo Mantenimiento</Label>
                                    <p className="text-xs text-slate-500">Bloquear acceso público.</p>
                                </div>
                                <Switch checked={flags.maintenanceMode} onCheckedChange={() => handleToggle('maintenanceMode')} />
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
                        <div className="p-4 border-b border-slate-800 bg-slate-900 flex items-center gap-2">
                            <Shield className="w-4 h-4 text-emerald-500" />
                            <h3 className="font-semibold text-white">Estado del Sistema</h3>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-400">Versión</span>
                                <span className="text-white font-mono">v1.2.0</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-400">Estado</span>
                                <Badge variant="outline" className="text-emerald-400 border-emerald-500/20 bg-emerald-500/10">Operativo</Badge>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-400">Último Audit</span>
                                <span className="text-slate-300">Hace 2h</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Announcements */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
                        <div className="p-4 border-b border-slate-800 bg-slate-900 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Megaphone className="w-4 h-4 text-amber-500" />
                                <h3 className="font-semibold text-white">Anuncios Globales</h3>
                            </div>
                            {activeAnnouncementRecord && (
                                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/20 animate-pulse">
                                    Anuncio Activo
                                </Badge>
                            )}
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Active Announcement Display */}
                            {activeAnnouncementRecord ? (
                                <div className={`border rounded-lg p-5 relative overflow-hidden ${activeAnnouncementRecord.type === 'warning' ? 'bg-amber-950/20 border-amber-500/20' :
                                    activeAnnouncementRecord.type === 'success' ? 'bg-emerald-950/20 border-emerald-500/20' :
                                        'bg-blue-950/20 border-blue-500/20'
                                    }`}>
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className={`text-sm font-semibold uppercase tracking-wider ${activeAnnouncementRecord.type === 'warning' ? 'text-amber-500' :
                                            activeAnnouncementRecord.type === 'success' ? 'text-emerald-500' :
                                                'text-blue-500'
                                            }`}>
                                            Mensaje Actual
                                        </h4>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => confirmDeactivate(activeAnnouncementRecord.id)}
                                            className="h-6 text-xs text-slate-400 hover:text-red-400 hover:bg-red-500/10 -mt-1 -mr-2"
                                        >
                                            Desactivar
                                        </Button>
                                    </div>
                                    <p className="text-lg text-white font-medium leading-relaxed">
                                        {activeAnnouncementRecord.message}
                                    </p>
                                    <div className="mt-4 flex items-center gap-3 text-xs text-slate-500">
                                        <span className="flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {new Date(activeAnnouncementRecord.created_at).toLocaleString()}
                                        </span>
                                        <span>•</span>
                                        <span>Por: {activeAnnouncementRecord.profiles?.email || 'Admin'}</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-slate-950/50 border border-slate-800 border-dashed rounded-lg p-8 text-center">
                                    <div className="w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <Megaphone className="w-5 h-5 text-slate-600" />
                                    </div>
                                    <p className="text-slate-400 text-sm">No hay anuncios activos actualmente.</p>
                                </div>
                            )}

                            {/* Create New */}
                            <div className="space-y-4 pt-4 border-t border-slate-800/50">
                                <Label className="text-sm font-medium text-slate-300">Publicar Nuevo Mensaje</Label>
                                <div className="flex flex-col gap-4">
                                    <div className="flex gap-2">
                                        {[
                                            { id: 'info', label: 'Información', color: 'bg-blue-600' },
                                            { id: 'warning', label: 'Alerta', color: 'bg-amber-600' },
                                            { id: 'success', label: 'Éxito', color: 'bg-emerald-600' }
                                        ].map((type) => (
                                            <button
                                                key={type.id}
                                                onClick={() => setNewType(type.id as any)}
                                                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${newType === type.id
                                                    ? `${type.color} text-white shadow-lg`
                                                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                                    }`}
                                            >
                                                {type.label}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="flex gap-3">
                                        <Input
                                            value={newAnnouncement}
                                            onChange={(e) => setNewAnnouncement(e.target.value)}
                                            placeholder="Escribe el contenido del anuncio..."
                                            className="bg-slate-950 border-slate-800 text-white flex-1 focus:ring-primary/20"
                                        />
                                        <Button
                                            onClick={handlePublish}
                                            disabled={publishing || !newAnnouncement.trim()}
                                            className="bg-white text-black hover:bg-slate-200 font-medium min-w-[100px]"
                                        >
                                            {publishing ? <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : "Publicar"}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* History */}
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
                        <div className="p-4 border-b border-slate-800 bg-slate-900 flex items-center gap-2">
                            <History className="w-4 h-4 text-slate-400" />
                            <h3 className="font-semibold text-white">Historial</h3>
                        </div>
                        <div className="max-h-[300px] overflow-y-auto">
                            <Table>
                                <TableHeader className="bg-slate-950 sticky top-0 z-10">
                                    <TableRow className="hover:bg-transparent border-slate-800">
                                        <TableHead className="text-slate-500 h-9 text-xs font-medium">ESTADO</TableHead>
                                        <TableHead className="text-slate-500 h-9 text-xs font-medium">MENSAJE</TableHead>
                                        <TableHead className="text-slate-500 h-9 text-xs font-medium text-right">FECHA</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {history.map((item) => (
                                        <TableRow key={item.id} className="border-slate-800 hover:bg-slate-800/50">
                                            <TableCell className="py-3">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-1.5 h-1.5 rounded-full ${item.type === 'warning' ? 'bg-amber-500' :
                                                        item.type === 'success' ? 'bg-emerald-500' :
                                                            'bg-blue-500'
                                                        }`} />
                                                    <span className={`text-xs ${item.is_active ? 'text-emerald-400' : 'text-slate-500'}`}>
                                                        {item.is_active ? 'Activo' : 'Inactivo'}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-3 font-medium text-slate-300 text-sm truncate max-w-[200px]" title={item.message}>
                                                {item.message}
                                            </TableCell>
                                            <TableCell className="py-3 text-slate-500 text-xs text-right font-mono">
                                                {new Date(item.created_at).toLocaleDateString()}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {history.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={3} className="text-center py-8 text-slate-500 text-sm">
                                                Sin historial registrado.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
