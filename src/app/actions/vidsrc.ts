'use server';

import { VIDSRC_BASE_URL } from '@/services/vidsrc';

export async function checkVidsrcAvailability(imdbId: string, type: 'movie' | 'tv', season: number = 1, episode: number = 1): Promise<boolean> {
    try {
        let url = '';
        if (type === 'movie') {
            url = `${VIDSRC_BASE_URL}/embed/movie/${imdbId}`;
        } else {
            url = `${VIDSRC_BASE_URL}/embed/tv/${imdbId}/${season}/${episode}`;
        }

        const response = await fetch(url, {
            method: 'HEAD',
            cache: 'no-store'
        });

        return response.status === 200;
    } catch (error) {
        console.error('Error checking vidsrc availability:', error);
        return false;
    }
}
