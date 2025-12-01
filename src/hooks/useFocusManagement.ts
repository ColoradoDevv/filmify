'use client';

import { useEffect, useRef, useState, RefObject } from 'react';

/**
 * Hook to manage focus state for an element
 */
export function useFocusState(initialFocused = false) {
    const [isFocused, setIsFocused] = useState(initialFocused);
    const elementRef = useRef<HTMLElement>(null);

    useEffect(() => {
        const element = elementRef.current;
        if (!element) return;

        const handleFocus = () => setIsFocused(true);
        const handleBlur = () => setIsFocused(false);

        element.addEventListener('focus', handleFocus);
        element.addEventListener('blur', handleBlur);

        return () => {
            element.removeEventListener('focus', handleFocus);
            element.removeEventListener('blur', handleBlur);
        };
    }, []);

    return { isFocused, elementRef };
}

/**
 * Hook to automatically focus an element on mount
 */
export function useAutoFocus<T extends HTMLElement>(
    shouldFocus = true,
    delay = 0
): RefObject<T | null> {
    const ref = useRef<T | null>(null);

    useEffect(() => {
        if (!shouldFocus || !ref.current) return;

        const timeoutId = setTimeout(() => {
            ref.current?.focus();
        }, delay);

        return () => clearTimeout(timeoutId);
    }, [shouldFocus, delay]);

    return ref;
}

/**
 * Hook to restore focus to a previous element
 */
export function useFocusRestore() {
    const previousFocusRef = useRef<HTMLElement | null>(null);

    const saveFocus = () => {
        previousFocusRef.current = document.activeElement as HTMLElement;
    };

    const restoreFocus = () => {
        if (previousFocusRef.current) {
            previousFocusRef.current.focus();
            previousFocusRef.current = null;
        }
    };

    return { saveFocus, restoreFocus };
}

/**
 * Hook to manage focus within a specific zone/group
 */
export function useFocusZone(
    zoneRef: RefObject<HTMLElement>,
    options: {
        enabled?: boolean;
        autoFocus?: boolean;
        restoreFocus?: boolean;
    } = {}
) {
    const { enabled = true, autoFocus = false, restoreFocus = false } = options;
    const previousFocusRef = useRef<HTMLElement | null>(null);

    useEffect(() => {
        if (!enabled || !zoneRef.current) return;

        const zone = zoneRef.current;

        // Save previous focus
        if (restoreFocus) {
            previousFocusRef.current = document.activeElement as HTMLElement;
        }

        // Auto focus first element
        if (autoFocus) {
            const firstFocusable = zone.querySelector<HTMLElement>(
                'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
            );
            if (firstFocusable) {
                firstFocusable.focus();
            }
        }

        return () => {
            // Restore previous focus
            if (restoreFocus && previousFocusRef.current) {
                previousFocusRef.current.focus();
            }
        };
    }, [enabled, autoFocus, restoreFocus, zoneRef]);
}

/**
 * Hook to handle focus visibility (show focus indicators only for keyboard navigation)
 */
export function useFocusVisible() {
    const [isFocusVisible, setIsFocusVisible] = useState(false);
    const [lastInputMethod, setLastInputMethod] = useState<'mouse' | 'keyboard' | null>(null);

    useEffect(() => {
        const handleMouseDown = () => {
            setLastInputMethod('mouse');
            setIsFocusVisible(false);
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            // Only show focus for keyboard navigation keys
            if (
                event.key === 'Tab' ||
                event.key.startsWith('Arrow') ||
                event.key === 'Enter' ||
                event.key === 'Escape'
            ) {
                setLastInputMethod('keyboard');
                setIsFocusVisible(true);
            }
        };

        document.addEventListener('mousedown', handleMouseDown);
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('mousedown', handleMouseDown);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    return { isFocusVisible, lastInputMethod };
}

/**
 * Hook to scroll element into view when focused
 */
export function useScrollIntoView<T extends HTMLElement>(
    options: ScrollIntoViewOptions = {
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest'
    }
): RefObject<T | null> {
    const ref = useRef<T | null>(null);

    useEffect(() => {
        const element = ref.current;
        if (!element) return;

        const handleFocus = () => {
            element.scrollIntoView(options);
        };

        element.addEventListener('focus', handleFocus);
        return () => element.removeEventListener('focus', handleFocus);
    }, [options]);

    return ref;
}
