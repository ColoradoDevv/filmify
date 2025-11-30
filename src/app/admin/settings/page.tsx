"use client"

import { useState } from "react"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Save, Megaphone } from "lucide-react"

export default function SettingsPage() {
    const [flags, setFlags] = useState({
        enableAi: true,
        enableWatchParty: true,
        maintenanceMode: false,
        allowRegistration: true
    })

    const [announcement, setAnnouncement] = useState("")

    const handleToggle = (key: keyof typeof flags) => {
        setFlags(prev => ({ ...prev, [key]: !prev[key] }))
    }

    const handleSave = () => {
        // In real app: Save to DB/Redis
        alert("Configuración guardada")
    }

    const handleSendAnnouncement = () => {
        if (!announcement) return;
        // In real app: Create notification record
        alert(`Anuncio enviado: "${announcement}"`)
        setAnnouncement("")
    }

    return (
        <div className="space-y-8 max-w-4xl">
            <div>
                <h2 className="text-3xl font-bold text-white">Configuración del Sistema</h2>
                <p className="text-slate-400">Feature flags y anuncios globales.</p>
            </div>

            <div className="grid gap-6">
                {/* Feature Flags */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                    <h3 className="text-xl font-bold text-white mb-6">Feature Flags</h3>
                    <div className="space-y-6">
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
                    </div>
                    <div className="mt-6 pt-6 border-t border-slate-800 flex justify-end">
                        <Button onClick={handleSave} className="bg-white text-black hover:bg-slate-200">
                            <Save className="mr-2 h-4 w-4" /> Guardar Cambios
                        </Button>
                    </div>
                </div>

                {/* Global Announcements */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                        <Megaphone className="text-yellow-500" /> Anuncios Globales
                    </h3>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-slate-200">Mensaje del sistema</Label>
                            <Input
                                value={announcement}
                                onChange={(e) => setAnnouncement(e.target.value)}
                                placeholder="Ej: Mantenimiento programado en 10 minutos..."
                                className="bg-slate-950 border-slate-800 text-white"
                            />
                            <p className="text-xs text-slate-500">Este mensaje aparecerá como un banner a todos los usuarios conectados.</p>
                        </div>
                        <div className="flex justify-end">
                            <Button onClick={handleSendAnnouncement} className="bg-blue-600 hover:bg-blue-700 text-white">
                                Enviar Anuncio
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
