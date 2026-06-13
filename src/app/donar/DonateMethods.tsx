'use client';

import { useState } from 'react';
import { Copy, Check, Zap, Building2, ExternalLink } from 'lucide-react';

/**
 * Llave Bre-B para recibir donaciones. Configurable por env var para no dejar
 * el dato solo enterrado en el código; cae al valor por defecto si no se define.
 * Bre-B (sistema de pagos inmediatos del Banco de la República de Colombia)
 * funciona entre TODOS los bancos y billeteras: Nequi, Daviplata, Bancolombia,
 * etc. Una sola llave cubre a cualquier donante en Colombia.
 */
const BREB_KEY = process.env.NEXT_PUBLIC_BREB_KEY || '3126886357';
const BREB_TYPE = 'Llave tipo celular'; // así la reconoce el donante en su app

export default function DonateMethods() {
    const [copied, setCopied] = useState(false);

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(BREB_KEY);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            /* clipboard bloqueado — el usuario puede copiar manualmente */
        }
    };

    return (
        <div className="space-y-5">
            {/* Tarjeta principal: Bre-B */}
            <div className="rounded-[var(--radius-xl)] border border-primary/30 bg-gradient-to-br from-primary/10 via-surface-container to-accent/5 p-5 sm:p-6">
                <div className="flex items-center gap-2 mb-4">
                    <Zap className="w-5 h-5 text-primary" />
                    <span className="text-lg font-bold text-white">Donar con Bre-B</span>
                </div>

                <p className="text-sm text-text-secondary mb-4 leading-relaxed">
                    Copia esta llave y pégala en tu app bancaria (Nequi, Daviplata, Bancolombia
                    o cualquier banco) en la opción <strong className="text-white">&ldquo;Enviar con
                    llave Bre-B&rdquo;</strong>. El envío es inmediato y sin costo.
                </p>

                {/* Llave + botón copiar */}
                <div className="flex items-center gap-2 rounded-[var(--radius-lg)] bg-background/60 border border-outline-variant p-2 pl-4">
                    <div className="flex-1 min-w-0">
                        <p className="text-[11px] uppercase tracking-wide text-text-muted">{BREB_TYPE}</p>
                        <p className="text-xl font-bold text-white font-mono tracking-wider">{BREB_KEY}</p>
                    </div>
                    <button
                        onClick={copy}
                        className={`flex items-center gap-2 h-11 px-4 rounded-[var(--radius-md)] font-semibold text-sm transition-colors shrink-0 ${
                            copied
                                ? 'bg-[#10b981]/15 text-[#10b981]'
                                : 'bg-primary text-on-primary hover:bg-primary-hover'
                        }`}
                        aria-label="Copiar llave Bre-B"
                    >
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        {copied ? 'Copiado' : 'Copiar'}
                    </button>
                </div>
            </div>

            {/* Aceptado por */}
            <div className="rounded-[var(--radius-lg)] bg-surface-container border border-outline-variant p-4">
                <div className="flex items-center gap-2 mb-2">
                    <Building2 className="w-4 h-4 text-text-secondary" />
                    <span className="text-sm font-medium text-white">Funciona con cualquier banco</span>
                </div>
                <p className="text-xs text-text-secondary leading-relaxed">
                    Bre-B es el sistema de pagos inmediatos de Colombia. Puedes enviar desde Nequi,
                    Daviplata, Bancolombia, Davivienda, BBVA, Banco de Bogotá y prácticamente cualquier
                    entidad — todo llega al instante.
                </p>
            </div>

            {/* PayPal */}
            <div className="rounded-[var(--radius-xl)] border border-outline-variant bg-surface-container p-5 sm:p-6">
                <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg font-bold text-white">Donar con PayPal</span>
                </div>
                <p className="text-sm text-text-secondary mb-4 leading-relaxed">
                    Paga con tu cuenta PayPal o con tarjeta de crédito/débito. El proceso es seguro y no requiere cuenta PayPal.
                </p>
                <a
                    href="https://www.paypal.com/donate/?hosted_button_id=W325PT3WBLS3S"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 h-11 px-5 rounded-[var(--radius-md)] bg-[#0070ba] hover:bg-[#005ea6] text-white font-semibold text-sm transition-colors"
                >
                    Donar por PayPal
                    <ExternalLink className="w-4 h-4" />
                </a>
            </div>
        </div>
    );
}
