import { NextResponse } from 'next/server';

/**
 * DEPRECATED / DISABLED — legacy open proxy.
 *
 * This endpoint previously fetched any user-supplied URL with no
 * authentication, no domain allowlist and no SSRF guard, which made it a
 * server-side request forgery (SSRF) vector: a caller could use it to reach
 * the server's internal network, cloud metadata endpoints, etc.
 *
 * It is superseded by `/api/proxy/latino`, which enforces authentication,
 * the shared SSRF guard (`@/lib/ssrf-guard`) and a domain allowlist.
 *
 * The route is kept only so existing links return a clean 410 instead of a
 * 404; it no longer performs any outbound fetch. Delete it once nothing
 * references the old path.
 */
export const dynamic = 'force-static';

export function GET() {
    return NextResponse.json(
        { error: 'Endpoint deshabilitado. Usa /api/proxy/latino.' },
        { status: 410 }
    );
}
