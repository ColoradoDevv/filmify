import { cn } from '@/lib/utils';
import AdBanner2 from './AdBanner2';

interface AdSlotProps {
  /** Clases extra para el espaciado/posicionamiento del slot. */
  className?: string;
}

/**
 * Slot publicitario reutilizable.
 *
 * Centraliza la colocación del banner (AdBanner2) para mantener un estilo
 * consistente en toda la app y evitar repetir el boilerplate de import dinámico.
 *
 * AdBanner2 ya se auto-oculta cuando no hay consentimiento de marketing o en
 * móviles muy pequeños; como el espaciado se pasa vía `className` al propio
 * banner, no quedan huecos vacíos cuando el anuncio no se renderiza.
 *
 * Es un Server Component, así que puede usarse directamente dentro de páginas
 * server o client sin necesidad de `next/dynamic`.
 */
export default function AdSlot({ className }: AdSlotProps) {
  return (
    <AdBanner2
      className={cn('my-6 opacity-90 hover:opacity-100 transition-opacity', className)}
    />
  );
}
