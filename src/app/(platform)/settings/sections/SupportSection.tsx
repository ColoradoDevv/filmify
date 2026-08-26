'use client';

import Link from 'next/link';
import { ArrowUpRight, Bug, FileText, LifeBuoy, Cookie, ShieldCheck } from 'lucide-react';
import { SettingsPanel, SettingRow, Button } from '../components/ui';

const HELP_LINKS = [
    {
        icon: LifeBuoy,
        label: 'Escríbenos',
        description: 'Dudas sobre tu cuenta o problemas de reproducción.',
        href: 'mailto:soporte@filmify.me',
        cta: 'Enviar correo',
    },
    {
        icon: Bug,
        label: 'Reportar un fallo',
        description: 'Si algo no funciona, cuéntanoslo con el mayor detalle posible.',
        href: 'https://github.com/ColoradoDevv/filmify/issues',
        cta: 'Abrir incidencia',
    },
];

const LEGAL_LINKS = [
    { icon: FileText, label: 'Términos de uso', href: '/legal/terms' },
    { icon: ShieldCheck, label: 'Política de privacidad', href: '/legal/privacy' },
    { icon: Cookie, label: 'Política de cookies', href: '/legal/cookies' },
];

export function SupportSection() {
    return (
        <div className="space-y-4">
            <SettingsPanel title="Ayuda" description="Estamos al otro lado.">
                {HELP_LINKS.map(({ icon, label, description, href, cta }) => (
                    <SettingRow
                        key={href}
                        icon={icon}
                        label={label}
                        description={description}
                        control={
                            <Button
                                onClick={() => window.open(href, href.startsWith('http') ? '_blank' : '_self', 'noopener,noreferrer')}
                            >
                                {cta}
                                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                            </Button>
                        }
                    />
                ))}
            </SettingsPanel>

            <SettingsPanel title="Legal" description="Las condiciones que aceptas al usar FilmiFy.">
                {LEGAL_LINKS.map(({ icon: Icon, label, href }) => (
                    <Link
                        key={href}
                        href={href}
                        className="flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-on-surface/5 focus:outline-none focus-visible:bg-on-surface/5 sm:px-5"
                    >
                        <span className="flex items-center gap-2.5">
                            <Icon className="h-4 w-4 text-on-surface-variant" aria-hidden />
                            <span className="text-sm font-medium text-on-surface">{label}</span>
                        </span>
                        <ArrowUpRight className="h-4 w-4 shrink-0 text-on-surface-variant" aria-hidden />
                    </Link>
                ))}
            </SettingsPanel>
        </div>
    );
}
