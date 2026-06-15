'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Bolt, Shield, Sparkles } from 'lucide-react';
import Modal from '@/components/ui/Modal';

const STORAGE_KEY = 'filmify_adblock_suggestion_dismissed_v1';

function detectDevice() {
  if (typeof navigator === 'undefined') {
    return { isMobile: false, platform: 'other' as const };
  }

  const ua = navigator.userAgent.toLowerCase();
  const isAndroid = ua.includes('android');
  const isiPhone = ua.includes('iphone') || ua.includes('ipod');
  const isiPad = ua.includes('ipad');
  const isIOS = isiPhone || isiPad;

  const isMobile = isAndroid || isIOS;
  if (!isMobile) return { isMobile: false, platform: 'other' as const };

  return {
    isMobile: true,
    platform: isIOS ? ('ios' as const) : ('android' as const),
  };
}

/**
 * Heurística: muchos bloqueadores inyectan estilos/plantillas.
 * No es 100% fiable, pero reduce falsos positivos.
 */
function estimateHasAdBlock() {
  if (typeof window === 'undefined') return false;

  try {
    // 1) Elementos típicos que cambian con bloqueadores (heurística)
    const blockedBySelectors = [
      'ins.adsbygoogle',
      '[data-ad-client]',
      '.adsbygoogle',
      '#ad, .ad, [id*="ad"], [class*="ad"]',
    ];

    const anyMatch = blockedBySelectors.some((sel) => {
      try {
        return document.querySelector(sel);
      } catch {
        return false;
      }
    });

    // 2) Si la web no renderiza anuncios inline todavía, este selector no sirve.
    // Aun así, algunos bloqueadores marcan sus propios atributos/estilos.
    const hasBlockerSignals = [
      '[class*="adblock" i]',
      '[id*="adblock" i]',
      'meta[name="robots"][content*="nofollow"]',
    ];

    const hasSignals = hasBlockerSignals.some((sel) => {
      try {
        return !!document.querySelector(sel);
      } catch {
        return false;
      }
    });

    return anyMatch || hasSignals;
  } catch {
    return false;
  }
}

export default function AdblockSuggestionModal() {
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [hasAdBlock, setHasAdBlock] = useState<boolean>(false);

  const device = useMemo(() => detectDevice(), []);

  useEffect(() => {
    setMounted(true);

    const run = () => {
      // Mostrar en todos los dispositivos, solo si NO detectamos bloqueador.
      const blocker = estimateHasAdBlock();
      setHasAdBlock(blocker);

      if (!blocker) {
        // Delay suave
        window.setTimeout(() => setIsOpen(true), 900);
      }
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [device.isMobile]);

  const close = () => {
    setIsOpen(false);
    // No persistimos el cierre: si no hay adblock activo, se mostrará
    // nuevamente en visitas futuras.
  };

  const content = (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="p-2.5 bg-white/5 border border-white/10 rounded-xl">
          <Shield className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-white text-lg">Mejora la reproducción</h4>
            <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
              Recomendado
            </span>
          </div>
          <p className="text-sm text-gray-400 mt-1 leading-relaxed">
            Para que la página cargue bien (sobre todo en el reproductor),
            te recomendamos desactivar bloqueadores de anuncios o usar un
            bloqueador compatible.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2">
        {device.platform === 'android' && (
          <>
            {/* Recomendación simple y conocida */}
            <Link
              href="https://chromewebstore.google.com/detail/ublock-origin/cjpalhdlnbpafiamejdnhcphjbkeiagm"
              target="_blank"
              rel="noreferrer"
              onClick={close}
              className="inline-flex items-center justify-center gap-2 h-11 px-4 rounded-xl bg-primary text-white font-semibold hover:bg-primary-hover active:scale-[0.99] transition-transform"
            >
              <Shield className="w-4 h-4" />
              Instalar uBlock Origin (Android)
            </Link>
            <p className="text-xs text-gray-500 leading-relaxed">Si estás en Firefox Android, busca “uBlock Origin” en la tienda de extensiones del navegador.</p>
          </>
        )}

        {device.platform === 'ios' && (
          <>
            <Link
              href="https://apps.apple.com/app/id1019770295" 
              target="_blank"
              rel="noreferrer"
              onClick={close}
              className="inline-flex items-center justify-center gap-2 h-11 px-4 rounded-xl bg-primary text-white font-semibold hover:bg-primary-hover active:scale-[0.99] transition-transform"
            >
              <Shield className="w-4 h-4" />
              Instalar uBlock Origin (iOS)
            </Link>
            <p className="text-xs text-gray-500 leading-relaxed">
              La disponibilidad puede variar. Si no te deja instalar, abre la App Store y busca “uBlock Origin”.
            </p>
          </>
        )}

        <button
          onClick={close}
          type="button"
          className="w-full h-11 rounded-xl bg-white/5 text-white font-semibold border border-white/10 hover:bg-white/10 active:scale-[0.99] transition-transform"
        >
          Lo haré luego
        </button>
      </div>

      {hasAdBlock && (
        <p className="text-xs text-gray-500">
          Detectamos señales de un bloqueador activo; si ves problemas,
          prueba con modo compatible/desactivación temporal.
        </p>
      )}
    </div>
  );

  // Evitar render hasta montaje para no pelear con SSR/hidratación
  if (!mounted) return null;

  // Si creemos que tiene AdBlock, no mostramos
  if (mounted && hasAdBlock) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={close}
      title="¿Tienes problemas al cargar?"
      description="Recomendamos una configuración compatible para mejorar la reproducción."
    >
      {content}
    </Modal>
  );
}

