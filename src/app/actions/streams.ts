'use server';

export async function checkUrlAvailability(url: string): Promise<boolean> {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout

        const res = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            cache: 'no-store'
        });

        clearTimeout(timeout);
        return res.ok;
    } catch (error) {
        console.error(`Error checking URL ${url}:`, error);
        return false;
    }
}
