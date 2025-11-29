import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Movie } from '@/types/tmdb';

/**
 * User state interface
 */
interface UserState {
    favorites: Movie[];
    watched: Movie[];
}

/**
 * UI state interface
 */
interface UIState {
    isMenuOpen: boolean;
    isLoading: boolean;
    searchQuery: string;
    isSidebarCollapsed: boolean;
}

/**
 * Complete store state
 */
interface StoreState {
    // User data
    user: UserState;

    // UI state
    ui: UIState;

    // User actions
    addFavorite: (movie: Movie) => void;
    removeFavorite: (movieId: number) => void;
    isFavorite: (movieId: number) => boolean;

    addWatched: (movie: Movie) => void;
    removeWatched: (movieId: number) => void;
    isWatched: (movieId: number) => boolean;

    // UI actions
    toggleMenu: () => void;
    setMenuOpen: (isOpen: boolean) => void;
    setLoading: (isLoading: boolean) => void;
    setSearchQuery: (query: string) => void;
    toggleSidebar: () => void;

    // Utility actions
    clearFavorites: () => void;
    clearWatched: () => void;
    resetStore: () => void;
}

/**
 * Initial state
 */
const initialState = {
    user: {
        favorites: [],
        watched: [],
    },
    ui: {
        isMenuOpen: false,
        isLoading: false,
        searchQuery: '',
        isSidebarCollapsed: false,
    },
};

/**
 * Main application store using Zustand with localStorage persistence
 */
export const useStore = create<StoreState>()(
    persist(
        (set, get) => ({
            // Initial state
            ...initialState,

            // Favorite actions
            addFavorite: (movie: Movie) => {
                set((state) => {
                    // Check if already in favorites
                    const exists = state.user.favorites.some((fav) => fav.id === movie.id);
                    if (exists) return state;

                    return {
                        user: {
                            ...state.user,
                            favorites: [...state.user.favorites, movie],
                        },
                    };
                });
            },

            removeFavorite: (movieId: number) => {
                set((state) => ({
                    user: {
                        ...state.user,
                        favorites: state.user.favorites.filter((movie) => movie.id !== movieId),
                    },
                }));
            },

            isFavorite: (movieId: number) => {
                return get().user.favorites.some((movie) => movie.id === movieId);
            },

            // Watched actions
            addWatched: (movie: Movie) => {
                set((state) => {
                    // Check if already in watched
                    const exists = state.user.watched.some((w) => w.id === movie.id);
                    if (exists) return state;

                    return {
                        user: {
                            ...state.user,
                            watched: [...state.user.watched, movie],
                        },
                    };
                });
            },

            removeWatched: (movieId: number) => {
                set((state) => ({
                    user: {
                        ...state.user,
                        watched: state.user.watched.filter((movie) => movie.id !== movieId),
                    },
                }));
            },

            isWatched: (movieId: number) => {
                return get().user.watched.some((movie) => movie.id === movieId);
            },

            // UI actions
            toggleMenu: () => {
                set((state) => ({
                    ui: {
                        ...state.ui,
                        isMenuOpen: !state.ui.isMenuOpen,
                    },
                }));
            },

            setMenuOpen: (isOpen: boolean) => {
                set((state) => ({
                    ui: {
                        ...state.ui,
                        isMenuOpen: isOpen,
                    },
                }));
            },

            setLoading: (isLoading: boolean) => {
                set((state) => ({
                    ui: {
                        ...state.ui,
                        isLoading,
                    },
                }));
            },

            setSearchQuery: (query: string) => {
                set((state) => ({
                    ui: {
                        ...state.ui,
                        searchQuery: query,
                    },
                }));
            },

            toggleSidebar: () => {
                set((state) => ({
                    ui: {
                        ...state.ui,
                        isSidebarCollapsed: !state.ui.isSidebarCollapsed,
                    },
                }));
            },

            // Utility actions
            clearFavorites: () => {
                set((state) => ({
                    user: {
                        ...state.user,
                        favorites: [],
                    },
                }));
            },

            clearWatched: () => {
                set((state) => ({
                    user: {
                        ...state.user,
                        watched: [],
                    },
                }));
            },

            resetStore: () => {
                set(initialState);
            },
        }),
        {
            name: 'filmify-storage', // localStorage key
            storage: createJSONStorage(() => localStorage),
            // Only persist user data, not UI state
            partialize: (state) => ({
                user: state.user,
            }),
        }
    )
);

/**
 * Selector hooks for better performance (optional but recommended)
 */
export const useFavorites = () => useStore((state) => state.user.favorites);
export const useWatched = () => useStore((state) => state.user.watched);
export const useUIState = () => useStore((state) => state.ui);
export const useIsMenuOpen = () => useStore((state) => state.ui.isMenuOpen);
export const useIsLoading = () => useStore((state) => state.ui.isLoading);
export const useSearchQuery = () => useStore((state) => state.ui.searchQuery);
export const useIsSidebarCollapsed = () => useStore((state) => state.ui.isSidebarCollapsed);
export const useToggleSidebar = () => useStore((state) => state.toggleSidebar);

/**
 * Export store type for use in components
 */
export type { StoreState };
