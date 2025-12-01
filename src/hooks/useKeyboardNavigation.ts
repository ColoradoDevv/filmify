'use client';

import { useEffect, useCallback, useRef } from 'react';

export type KeyboardKey =
    | 'ArrowUp'
    | 'ArrowDown'
    | 'ArrowLeft'
    | 'ArrowRight'
    | 'Enter'
    | 'Escape'
    | 'Backspace'
    | 'Space';

export interface KeyboardNavigationOptions {
    onArrowUp?: () => void;
    onArrowDown?: () => void;
    onArrowLeft?: () => void;
    onArrowRight?: () => void;
    onEnter?: () => void;
    onEscape?: () => void;
    onBack?: () => void;
    onSpace?: () => void;
    enabled?: boolean;
    preventDefault?: boolean;
}

/**
 * Hook for handling keyboard/remote navigation events
 * Supports arrow keys, Enter, Escape, and Back button
 */
export function useKeyboardNavigation(options: KeyboardNavigationOptions) {
    const {
        onArrowUp,
        onArrowDown,
        onArrowLeft,
        onArrowRight,
        onEnter,
        onEscape,
        onBack,
        onSpace,
        enabled = true,
        preventDefault = true
    } = options;

    const handlersRef = useRef(options);

    // Update handlers ref when options change
    useEffect(() => {
        handlersRef.current = options;
    }, [options]);

    const handleKeyDown = useCallback((event: KeyboardEvent) => {
        if (!enabled) return;

        const handlers = handlersRef.current;
        let handled = false;

        switch (event.key) {
            case 'ArrowUp':
                if (handlers.onArrowUp) {
                    handlers.onArrowUp();
                    handled = true;
                }
                break;
            case 'ArrowDown':
                if (handlers.onArrowDown) {
                    handlers.onArrowDown();
                    handled = true;
                }
                break;
            case 'ArrowLeft':
                if (handlers.onArrowLeft) {
                    handlers.onArrowLeft();
                    handled = true;
                }
                break;
            case 'ArrowRight':
                if (handlers.onArrowRight) {
                    handlers.onArrowRight();
                    handled = true;
                }
                break;
            case 'Enter':
                if (handlers.onEnter) {
                    handlers.onEnter();
                    handled = true;
                }
                break;
            case 'Escape':
                if (handlers.onEscape) {
                    handlers.onEscape();
                    handled = true;
                }
                break;
            case 'Backspace':
                // TV remotes often map Back button to Backspace
                if (handlers.onBack) {
                    handlers.onBack();
                    handled = true;
                }
                break;
            case ' ':
            case 'Spacebar':
                if (handlers.onSpace) {
                    handlers.onSpace();
                    handled = true;
                }
                break;
        }

        if (handled && preventDefault) {
            event.preventDefault();
            event.stopPropagation();
        }
    }, [enabled, preventDefault]);

    useEffect(() => {
        if (!enabled) return;

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [enabled, handleKeyDown]);
}

/**
 * Hook for handling directional navigation with custom key mappings
 */
export function useDirectionalNavigation(
    onNavigate: (direction: 'up' | 'down' | 'left' | 'right') => void,
    enabled = true
) {
    useKeyboardNavigation({
        onArrowUp: () => onNavigate('up'),
        onArrowDown: () => onNavigate('down'),
        onArrowLeft: () => onNavigate('left'),
        onArrowRight: () => onNavigate('right'),
        enabled,
        preventDefault: true
    });
}
