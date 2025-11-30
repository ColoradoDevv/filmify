"use client"

import { useState, useEffect } from "react"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Save, Megaphone, CheckCircle, AlertCircle, Trash2, Clock, History, Settings } from "lucide-react"
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

    const handleDeactivate = async (id: string) => {
        if (!confirm("¿Estás seguro de desactivar este anuncio?")) return;

        const result = await deactivateAnnouncement(id)
        if (result.success) {
            await loadData()
        } else {
            showModal("Error", "No se pudo desactivar: " + result.error, "error")
        }
    }

    const showModal = (title: string, message: string, type: "success" | "error") => {
        setModalContent({ title, message, type })
        setModalOpen(true)
    }

    if (loading) {
        return <div className="text-slate-400 animate-pulse">Cargando panel de control...</div>
    }

    const activeAnnouncementRecord = history.find(h => h.is_active);

    return (
        <div className="space-y-8 max-w-5xl pb-10">
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

            <div>
                <h2 className="text-3xl font-bold text-white">Configuración del Sistema</h2>
                <p className="text-slate-400">Control de características y comunicaciones.</p>
            </div>

            <div className="grid gap-8">
                {/* Global Announcements Section */}
                <div className="space-y-6">
                    <div className="flex items-center gap-2 text-xl font-bold text-white border-b border-slate-800 pb-2">
                        <Megaphone className="text-yellow-500" />
                        <h3>Gestión de Anuncios</h3>
                    </div>

                    {/* Active Announcement Card */}
                    {activeAnnouncementRecord ? (
                        <div className={`border rounded-xl p-6 relative overflow-hidden ${activeAnnouncementRecord.type === 'warning' ? 'bg-amber-500/10 border-amber-500/20' :
                                activeAnnouncementRecord.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20' :
                                    'bg-blue-500/10 border-blue-500/20'
                            }`}>
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                <Megaphone className={`w-24 h-24 ${activeAnnouncementRecord.type === 'warning' ? 'text-amber-500' :
                                        activeAnnouncementRecord.type === 'success' ? 'text-emerald-500' :
                                            'text-blue-500'
                                    }`} />
                            </div>
                            <div className="relative z-10">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <Badge className={`mb-2 text-black ${activeAnnouncementRecord.type === 'warning' ? 'bg-amber-500 hover:bg-amber-400' :
                                                activeAnnouncementRecord.type === 'success' ? 'bg-emerald-500 hover:bg-emerald-400' :
                                                    'bg-blue-500 hover:bg-blue-400'
                                            }`}>En Vivo</Badge>
                                        <h4 className={`text-lg font-medium ${activeAnnouncementRecord.type === 'warning' ? 'text-amber-200' :
                                                activeAnnouncementRecord.type === 'success' ? 'text-emerald-200' :
                                                    'text-blue-200'
                                            }`}>Anuncio Activo</h4>
                                    </div>
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => handleDeactivate(activeAnnouncementRecord.id)}
                                        className="bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/20"
                                    >
                                        <Trash2 className="w-4 h-4 mr-2" /> Retirar Anuncio
                                    </Button>
                                </div>
                                <p className="text-2xl font-bold text-white mb-2">{activeAnnouncementRecord.message}</p>
                                <div className="flex items-center gap-4 text-sm text-slate-400">
                                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Publicado: {new Date(activeAnnouncementRecord.created_at).toLocaleString()}</span>
                                    <span>Por: {activeAnnouncementRecord.profiles?.email || 'Admin'}</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-slate-900/50 border border-slate-800 border-dashed rounded-xl p-8 text-center">
                            <p className="text-slate-500">No hay ningún anuncio activo en este momento.</p>
                        </div>
                    )}

                    {/* New Announcement Input */}
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                        <Label className="text-slate-200 mb-2 block">Publicar Nuevo Anuncio</Label>
                        <div className="flex flex-col gap-4">
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setNewType('info')}
                                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${newType === 'info' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                                >
                                    Info (Azul)
                                </button>
                                <button
                                    onClick={() => setNewType('warning')}
                                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${newType === 'warning' ? 'bg-amber-500 text-black' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                                >
                                    Alerta (Amarillo)
                                </button>
                                <button
                                    onClick={() => setNewType('success')}
                                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${newType === 'success' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                                >
                                    Éxito (Verde)
                                </button>
                            </div>
                            <div className="flex gap-4">
                                <Input
                                    value={newAnnouncement}
                                    onChange={(e) => setNewAnnouncement(e.target.value)}
                                    placeholder="Escribe un mensaje importante para todos los usuarios..."
                                    className="bg-slate-950 border-slate-800 text-white flex-1"
                                />
                                <Button
                                    onClick={handlePublish}
                                    disabled={publishing || !newAnnouncement.trim()}
                                    className="bg-white text-black hover:bg-slate-200 font-semibold min-w-[120px]"
                                >
                                    {publishing ? "Publicando..." : "Publicar"}
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* History Table */}
                    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                        <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex items-center gap-2">
                            <History className="w-4 h-4 text-slate-400" />
                            <h4 className="font-medium text-slate-200">Historial Reciente</h4>
                        </div>
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent border-slate-800">
                                    <TableHead className="text-slate-400 w-[50px]">Tipo</TableHead>
                                    <TableHead className="text-slate-400">Mensaje</TableHead>
                                    <TableHead className="text-slate-400 w-[200px]">Fecha</TableHead>
                                    <TableHead className="text-slate-400 w-[100px]">Estado</TableHead>
                                    <TableHead className="text-slate-400 w-[100px] text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {history.map((item) => (
                                    <TableRow key={item.id} className="border-slate-800 hover:bg-slate-800/50">
                                        <TableCell>
                                            <div className={`w-3 h-3 rounded-full ${item.type === 'warning' ? 'bg-amber-500' :
                                                    item.type === 'success' ? 'bg-emerald-500' :
                                                        'bg-blue-500'
                                                }`} title={item.type} />
                                        </TableCell>
                                        <TableCell className="font-medium text-slate-300">{item.message}</TableCell>
                                        <TableCell className="text-slate-500 text-xs">
                                            {new Date(item.created_at).toLocaleString()}
                                        </TableCell>
                                        <TableCell>
                                            {item.is_active ? (
                                                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/20">Activo</Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-slate-500 border-slate-700">Inactivo</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {item.is_active && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleDeactivate(item.id)}
                                                    className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {history.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                                            Sin historial de anuncios.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>

                {/* Feature Flags Section */}
                <div className="space-y-6 pt-8 border-t border-slate-800">
                    <div className="flex items-center gap-2 text-xl font-bold text-white">
                        <Settings className="text-blue-500" />
                        <h3>Feature Flags</h3>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label className="text-base text-slate-200">Inteligencia Artificial (Gemini)</Label>
                                <p className="text-sm text-slate-500">Habilitar recomendaciones y chat con IA.</p>
                            </div>
                            <Switch checked={flags.enableAi} onCheckedChange={() => handleToggle('enableAi')} />
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label className="text-base text-slate-200">Watch Party</Label>
                                <p className="text-sm text-slate-500">Permitir crear y unirse a salas.</p>
                            </div>
                            <Switch checked={flags.enableWatchParty} onCheckedChange={() => handleToggle('enableWatchParty')} />
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label className="text-base text-slate-200">Registro de Usuarios</Label>
                                <p className="text-sm text-slate-500">Permitir nuevos registros.</p>
                            </div>
                            <Switch checked={flags.allowRegistration} onCheckedChange={() => handleToggle('allowRegistration')} />
                        </div>
                        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                            <div className="space-y-0.5">
                                <Label className="text-base text-red-400">Modo Mantenimiento</Label>
                                <p className="text-sm text-slate-500">Bloquear acceso a usuarios no administradores.</p>
                            </div>
                            <Switch checked={flags.maintenanceMode} onCheckedChange={() => handleToggle('maintenanceMode')} />
                        </div>

                        <div className="flex justify-end pt-4">
                            <Button
                                onClick={handleSaveFlags}
                                disabled={saving}
                                className="bg-blue-600 text-white hover:bg-blue-500 min-w-[150px]"
                            >
                                {saving ? "Guardando..." : "Guardar Flags"}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
