/**
 * Clases de la grilla de catálogo.
 *
 * Películas, series, anime y doramas comparten exactamente la misma rejilla:
 * mismas columnas por breakpoint y mismos gaps. Vive en un único sitio para
 * que un cambio de densidad no deje un módulo desalineado respecto al resto.
 */
export const CATALOG_GRID_CLASS =
    'grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2 sm:gap-3';

/** Retardo escalonado de la animación de entrada, igual que en MovieGrid. */
export function cardAnimationDelay(index: number): string {
    return `${(index % 20) * 50}ms`;
}
