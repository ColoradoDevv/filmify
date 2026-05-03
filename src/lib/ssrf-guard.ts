/**
 * SSRF Guard — blocks requests to private/reserved IP ranges and
 * non-HTTP(S) schemes before the server makes any outbound fetch.
 *
 * Covers:
 *  - IPv4 private ranges (RFC 1918, loopback, link-local, CGNAT, etc.)
 *  - IPv6 loopback, link-local, ULA, and mapped IPv4 private ranges
 *  - Cloud metadata endpoints (169.254.169.254, 100.100.100.200)
 *  - Non-HTTP(S) schemes (file:, ftp:, gopher:, data:, …)
 */

/** Allowed URL schemes for outbound proxy requests. */
const ALLOWED_SCHEMES = new Set(['http:', 'https:']);

/**
 * IPv4 CIDR ranges that must never be reached by the proxy.
 * Stored as [networkInt, maskInt] pairs for fast bitwise matching.
 */
const BLOCKED_IPV4_CIDRS: [number, number][] = [
    // Loopback
    [ipv4ToInt('127.0.0.0'),   cidrMask(8)],
    // Private class A
    [ipv4ToInt('10.0.0.0'),    cidrMask(8)],
    // Private class B
    [ipv4ToInt('172.16.0.0'),  cidrMask(12)],
    // Private class C
    [ipv4ToInt('192.168.0.0'), cidrMask(16)],
    // Link-local / AWS metadata
    [ipv4ToInt('169.254.0.0'), cidrMask(16)],
    // CGNAT (RFC 6598)
    [ipv4ToInt('100.64.0.0'),  cidrMask(10)],
    // Alibaba Cloud metadata
    [ipv4ToInt('100.100.0.0'), cidrMask(16)],
    // Broadcast / "this" network
    [ipv4ToInt('0.0.0.0'),     cidrMask(8)],
    // Documentation ranges (RFC 5737) — not routable
    [ipv4ToInt('192.0.2.0'),   cidrMask(24)],
    [ipv4ToInt('198.51.100.0'),cidrMask(24)],
    [ipv4ToInt('203.0.113.0'), cidrMask(24)],
    // Multicast
    [ipv4ToInt('224.0.0.0'),   cidrMask(4)],
    // Reserved / future use
    [ipv4ToInt('240.0.0.0'),   cidrMask(4)],
];

function ipv4ToInt(ip: string): number {
    return ip.split('.').reduce((acc, octet) => (acc << 8) | parseInt(octet, 10), 0) >>> 0;
}

function cidrMask(bits: number): number {
    return (0xffffffff << (32 - bits)) >>> 0;
}

function isBlockedIPv4(ip: string): boolean {
    let addr: number;
    try {
        addr = ipv4ToInt(ip);
    } catch {
        return true; // unparseable → block
    }
    return BLOCKED_IPV4_CIDRS.some(([net, mask]) => (addr & mask) === net);
}

function isBlockedIPv6(ip: string): boolean {
    const lower = ip.toLowerCase().replace(/^\[|\]$/g, '');

    // Loopback ::1
    if (lower === '::1' || lower === '0:0:0:0:0:0:0:1') return true;

    // Unspecified ::
    if (lower === '::' || lower === '0:0:0:0:0:0:0:0') return true;

    // Link-local fe80::/10
    if (/^fe[89ab][0-9a-f]:/i.test(lower)) return true;

    // Unique local fc00::/7 (fc:: and fd::)
    if (/^f[cd][0-9a-f]{2}:/i.test(lower)) return true;

    // IPv4-mapped ::ffff:x.x.x.x
    const mappedMatch = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mappedMatch) return isBlockedIPv4(mappedMatch[1]);

    // IPv4-compatible ::x.x.x.x (deprecated but still dangerous)
    const compatMatch = lower.match(/^::(\d+\.\d+\.\d+\.\d+)$/);
    if (compatMatch) return isBlockedIPv4(compatMatch[1]);

    return false;
}

/**
 * Returns true if the given string looks like a bare IP address
 * (IPv4 dotted-decimal or IPv6 with colons / brackets).
 */
function looksLikeIpAddress(hostname: string): boolean {
    // IPv4
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) return true;
    // IPv6 (with or without brackets)
    if (hostname.includes(':')) return true;
    return false;
}

export interface SsrfGuardResult {
    ok: boolean;
    /** Human-readable reason when ok === false */
    reason?: string;
}

/**
 * Validates a URL string against SSRF attack vectors.
 *
 * Call this BEFORE making any outbound fetch on behalf of user input.
 *
 * @example
 * const guard = validateOutboundUrl(userSuppliedUrl);
 * if (!guard.ok) return NextResponse.json({ error: guard.reason }, { status: 400 });
 */
export function validateOutboundUrl(raw: string): SsrfGuardResult {
    let parsed: URL;
    try {
        parsed = new URL(raw);
    } catch {
        return { ok: false, reason: 'URL inválida.' };
    }

    // 1. Scheme check
    if (!ALLOWED_SCHEMES.has(parsed.protocol)) {
        return { ok: false, reason: `Esquema no permitido: ${parsed.protocol}` };
    }

    // 2. Hostname must be present
    const hostname = parsed.hostname;
    if (!hostname) {
        return { ok: false, reason: 'URL sin hostname.' };
    }

    // 3. Block bare IP addresses that fall in private/reserved ranges.
    //    Hostnames (domain names) are not blocked here — DNS rebinding
    //    protection would require an async DNS lookup which is handled
    //    separately in resolveAndValidate().
    if (looksLikeIpAddress(hostname)) {
        if (/^\d/.test(hostname) && isBlockedIPv4(hostname)) {
            return { ok: false, reason: 'Dirección IP privada o reservada no permitida.' };
        }
        if (hostname.includes(':') || hostname.startsWith('[')) {
            if (isBlockedIPv6(hostname)) {
                return { ok: false, reason: 'Dirección IPv6 privada o reservada no permitida.' };
            }
        }
    }

    // 4. Block localhost by name
    if (hostname === 'localhost' || hostname.endsWith('.localhost')) {
        return { ok: false, reason: 'Hostname localhost no permitido.' };
    }

    // 5. Block internal .local / .internal / .corp TLDs
    if (
        hostname.endsWith('.local') ||
        hostname.endsWith('.internal') ||
        hostname.endsWith('.corp') ||
        hostname.endsWith('.home') ||
        hostname.endsWith('.lan')
    ) {
        return { ok: false, reason: 'Dominio interno no permitido.' };
    }

    return { ok: true };
}
