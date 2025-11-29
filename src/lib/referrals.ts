/**
 * Helper to generate referral/search links for streaming providers
 */

export const getProviderLink = (providerName: string, movieTitle: string): string => {
    const encodedTitle = encodeURIComponent(movieTitle);
    const lowerName = providerName.toLowerCase();

    // Netflix
    if (lowerName.includes('netflix')) {
        return `https://www.netflix.com/search?q=${encodedTitle}`;
    }

    // Amazon Prime Video
    if (lowerName.includes('amazon') || lowerName.includes('prime')) {
        // Add your Amazon Associate tag here if you have one, e.g., &tag=filmify-20
        return `https://www.amazon.com/s?k=${encodedTitle}&i=instant-video`;
    }

    // Disney+
    if (lowerName.includes('disney')) {
        return `https://www.disneyplus.com/search?q=${encodedTitle}`;
    }

    // HBO Max / Max
    if (lowerName.includes('hbo') || lowerName.includes('max')) {
        return `https://www.max.com/search?q=${encodedTitle}`;
    }

    // Apple TV+
    if (lowerName.includes('apple')) {
        return `https://tv.apple.com/search?term=${encodedTitle}`;
    }

    // Hulu
    if (lowerName.includes('hulu')) {
        return `https://www.hulu.com/search?q=${encodedTitle}`;
    }

    // Paramount+
    if (lowerName.includes('paramount')) {
        return `https://www.paramountplus.com/search/?q=${encodedTitle}`;
    }

    // Default fallback: Google Search
    return `https://www.google.com/search?q=${encodedTitle}+ver+en+${encodeURIComponent(providerName)}`;
};
