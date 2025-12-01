'use client';

import { useEffect, useRef, RefObject } from 'react';

export interface FocusableElement extends HTMLElement {
    dataset: DOMStringMap & {
        focusable?: string;
        focusGroup?: string;
        focusIndex?: string;
    };
}

/**
 * Get all focusable elements within a container
 */
export function getFocusableElements(container: HTMLElement): FocusableElement[] {
    const selector = [
        'a[href]',
        'button:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        '[tabindex]:not([tabindex="-1"])',
        '[data-focusable="true"]'
    ].join(', ');

    return Array.from(container.querySelectorAll<FocusableElement>(selector))
        .filter(el => {
            // Filter out hidden elements
            const style = window.getComputedStyle(el);
            return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
        });
}

/**
 * Find the next focusable element in a given direction
 */
export function findNextFocusable(
    current: FocusableElement,
    direction: 'up' | 'down' | 'left' | 'right',
    container: HTMLElement
): FocusableElement | null {
    const focusables = getFocusableElements(container);
    if (focusables.length === 0) return null;

    const currentRect = current.getBoundingClientRect();
    const currentCenter = {
        x: currentRect.left + currentRect.width / 2,
        y: currentRect.top + currentRect.height / 2
    };

    let bestCandidate: FocusableElement | null = null;
    let bestDistance = Infinity;

    for (const candidate of focusables) {
        if (candidate === current) continue;

        const candidateRect = candidate.getBoundingClientRect();
        const candidateCenter = {
            x: candidateRect.left + candidateRect.width / 2,
            y: candidateRect.top + candidateRect.height / 2
        };

        // Check if candidate is in the correct direction
        let isInDirection = false;
        switch (direction) {
            case 'up':
                isInDirection = candidateCenter.y < currentCenter.y;
                break;
            case 'down':
                isInDirection = candidateCenter.y > currentCenter.y;
                break;
            case 'left':
                isInDirection = candidateCenter.x < currentCenter.x;
                break;
            case 'right':
                isInDirection = candidateCenter.x > currentCenter.x;
                break;
        }

        if (!isInDirection) continue;

        // Calculate distance
        const dx = candidateCenter.x - currentCenter.x;
        const dy = candidateCenter.y - currentCenter.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Prefer elements that are more aligned in the direction
        let alignmentBonus = 0;
        if (direction === 'up' || direction === 'down') {
            alignmentBonus = Math.abs(dx) * 2; // Penalize horizontal offset
        } else {
            alignmentBonus = Math.abs(dy) * 2; // Penalize vertical offset
        }

        const adjustedDistance = distance + alignmentBonus;

        if (adjustedDistance < bestDistance) {
            bestDistance = adjustedDistance;
            bestCandidate = candidate;
        }
    }

    return bestCandidate;
}

/**
 * Hook for spatial navigation within a container
 */
export function useSpatialNavigation(
    containerRef: RefObject<HTMLElement | null>,
    options: {
        enabled?: boolean;
        focusOnMount?: boolean;
        onNavigate?: (direction: 'up' | 'down' | 'left' | 'right') => void;
    } = {}
) {
    const { enabled = true, focusOnMount = false, onNavigate } = options;

    useEffect(() => {
        if (!enabled || !containerRef.current) return;

        const container = containerRef.current;

        // Focus first element on mount if requested
        if (focusOnMount) {
            const focusables = getFocusableElements(container);
            if (focusables.length > 0) {
                focusables[0].focus();
            }
        }

        const handleKeyDown = (event: KeyboardEvent) => {
            const activeElement = document.activeElement as FocusableElement;
            if (!activeElement || !container.contains(activeElement)) return;

            let direction: 'up' | 'down' | 'left' | 'right' | null = null;

            switch (event.key) {
                case 'ArrowUp':
                    direction = 'up';
                    break;
                case 'ArrowDown':
                    direction = 'down';
                    break;
                case 'ArrowLeft':
                    direction = 'left';
                    break;
                case 'ArrowRight':
                    direction = 'right';
                    break;
            }

            if (direction) {
                event.preventDefault();
                event.stopPropagation();

                const nextElement = findNextFocusable(activeElement, direction, container);
                if (nextElement) {
                    nextElement.focus();
                }

                onNavigate?.(direction);
            }
        };

        container.addEventListener('keydown', handleKeyDown);
        return () => container.removeEventListener('keydown', handleKeyDown);
    }, [enabled, containerRef, focusOnMount, onNavigate]);
}

/**
 * Hook to manage focus trap within a container
 */
export function useFocusTrap(
    containerRef: RefObject<HTMLElement | null>,
    enabled = true
) {
    const previousFocusRef = useRef<HTMLElement | null>(null);

    useEffect(() => {
        if (!enabled || !containerRef.current) return;

        const container = containerRef.current;
        previousFocusRef.current = document.activeElement as HTMLElement;

        // Focus first element in container
        const focusables = getFocusableElements(container);
        if (focusables.length > 0) {
            focusables[0].focus();
        }

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Tab') return;

            const focusables = getFocusableElements(container);
            if (focusables.length === 0) return;

            const firstFocusable = focusables[0];
            const lastFocusable = focusables[focusables.length - 1];
            const activeElement = document.activeElement;

            if (event.shiftKey) {
                // Shift + Tab
                if (activeElement === firstFocusable) {
                    event.preventDefault();
                    lastFocusable.focus();
                }
            } else {
                // Tab
                if (activeElement === lastFocusable) {
                    event.preventDefault();
                    firstFocusable.focus();
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            // Restore previous focus
            if (previousFocusRef.current) {
                previousFocusRef.current.focus();
            }
        };
    }, [enabled, containerRef]);
}
