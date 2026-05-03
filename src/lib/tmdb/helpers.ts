const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

export const getImageUrl = (
    path: string | null,
    size: 'w92' | 'w154' | 'w185' | 'w342' | 'w500' | 'w780' | 'original' = 'original'
): string => {
    if (!path) return '/no-image.svg';
    return `${IMAGE_BASE_URL}/${size}${path}`;
};

export const getPosterUrl = (path: string | null): string => {
    return getImageUrl(path, 'original');
};

export const getBackdropUrl = (path: string | null): string => {
    return getImageUrl(path, 'original');
};

export const getProfileUrl = (path: string | null): string => {
    return getImageUrl(path, 'original');
};
