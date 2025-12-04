'use server';

export async function checkVidsrcAvailability(imdbId: string, type: 'movie' | 'tv', season: number = 1, episode: number = 1): Promise<boolean> {
    // Streaming functionality has been removed
    return false;
}
