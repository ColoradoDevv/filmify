import { NextRequest, NextResponse } from 'next/server';

const COOKIE_NAME = 'filmify_tv_mode';
// 1 year in seconds
const MAX_AGE = 60 * 60 * 24 * 365;

/**
 * POST /api/tv-mode        — enable TV mode (sets cookie)
 * DELETE /api/tv-mode      — disable TV mode (clears cookie)
 */

export async function POST(_req: NextRequest) {
    const res = NextResponse.json({ tvMode: true });
    res.cookies.set(COOKIE_NAME, '1', {
        path: '/',
        maxAge: MAX_AGE,
        sameSite: 'lax',
        httpOnly: false, // needs to be readable client-side for useTVDetection
    });
    return res;
}

export async function DELETE(_req: NextRequest) {
    const res = NextResponse.json({ tvMode: false });
    res.cookies.set(COOKIE_NAME, '', {
        path: '/',
        maxAge: 0,
        sameSite: 'lax',
    });
    return res;
}
