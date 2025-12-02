export const getLatinoUrl = (baseUrl: string): string => {
    if (typeof window === 'undefined') return baseUrl;

    const isLocal = window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1' ||
        window.location.port === '3000';

    return isLocal
        ? `/api/proxy/latino?url=${encodeURIComponent(baseUrl)}`
        : baseUrl;
};
