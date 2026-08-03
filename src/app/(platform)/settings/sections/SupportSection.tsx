'use client';

import { FileText, Shield, HelpCircle, AlertTriangle, ExternalLink, Mail } from 'lucide-react';

export function SupportSection() {
    const links = [
        { label: 'Términos de Uso', icon: FileText, href: '/legal/terms' },
        { label: 'Política de Cookies', icon: Shield, href: '/legal/cookies' },
        { label: 'Centro de Ayuda', icon: HelpCircle, href: 'mailto:soporte@filmify.app' },
        { label: 'Reportar un Error', icon: AlertTriangle, href: 'https://github.com/jmcol/filmify/issues' }
    ];

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="pb-4 border-b border-surface-light/30">
                <h2 className="text-xl font-bold mb-1 bg-gradient-to-r from-white to-text-secondary bg-clip-text text-transparent">Ayuda y Legal</h2>
                <p className="text-xs text-text-secondary">Recursos y contacto</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {links.map((link) => {
                    const Icon = link.icon;
                    return (
                        <a
                            key={link.label}
                            href={link.href}
                            target={link.href.startsWith('http') ? '_blank' : '_self'}
                            rel="noopener noreferrer"
                            className="p-4 bg-gradient-to-br from-surface-light/30 to-surface-light/10 backdrop-blur-sm rounded-2xl border border-surface-light/30 hover:border-primary/40 transition-all duration-300 flex items-center justify-between group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-surface-light/50 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                                    <Icon className="w-5 h-5 text-text-secondary group-hover:text-primary transition-colors" />
                                </div>
                                <span className="text-sm font-semibold text-white">{link.label}</span>
                            </div>
                            <ExternalLink className="w-4 h-4 text-text-muted group-hover:text-primary transition-colors" />
                        </a>
                    );
                })}
            </div>

            {/* Support Info */}
            <div className="p-6 bg-surface-light/30 backdrop-blur-sm rounded-2xl border border-surface-light/30 text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Mail className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">¿Necesitas ayuda personalizada?</h3>
                <p className="text-sm text-text-secondary mb-6 max-w-md mx-auto">
                    Nuestro equipo de soporte está disponible para ayudarte con cualquier problema técnico o duda sobre tu cuenta.
                </p>
                <a
                    href="mailto:soporte@filmify.app"
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-primary to-primary-hover text-white rounded-xl text-sm font-bold hover:shadow-lg hover:shadow-primary/30 transition-all duration-300 hover:scale-105"
                >
                    Contactar Soporte
                </a>
            </div>
        </div>
    );
}
