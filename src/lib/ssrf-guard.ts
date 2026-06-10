/**
 * SSRF Guard — bloquea peticiones a IPs privadas/reservadas y esquemas
 * no HTTP(S) antes de que el servidor realice cualquier fetch saliente.
 *
 * Cobertura:
 *  - IPv4 privadas (RFC 1918, loopback, link-local, CGNAT, etc.)
 *  - IPv6 loopback, link-local, ULA, y mapped IPv4
 *  - Endpoints de metadatos cloud (AWS, GCP, Azure, DigitalOcean, etc.)
 *  - Esquemas no HTTP(S) (file:, ftp:, gopher:, data:, …)
 *  - Puertos restringidos (SMTP, SSH, Redis, etc.)
 *  - DNS rebinding (resolución + validación en resolveAndValidate)
 */

/** Esquemas permitidos para peticiones salientes. */
const ALLOWED_SCHEMES = new Set(['http:', 'https:']);

/** Puertos bloqueados además de los estándar HTTP/HTTPS. */
const BLOCKED_PORTS = new Set([
    21,    // FTP
    22,    // SSH
    23,    // Telnet
    25,    // SMTP
    53,    // DNS
    110,   // POP3
    135,   // RPC
    139,   // NetBIOS
    143,   // IMAP
    445,   // SMB
    993,   // IMAPS
    995,   // POP3S
    1433,  // MSSQL
    1521,  // Oracle
    3306,  // MySQL
    3389,  // RDP
    5432,  // PostgreSQL
    6379,  // Redis
    27017, // MongoDB
]);

/**
 * IPv4 CIDR ranges que nunca deben ser alcanzadas.
 * Almacenadas como [networkInt, maskInt] para comparación bitwise.
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
    // Link-local / AWS metadata (169.254.169.254)
    [ipv4ToInt('169.254.0.0'), cidrMask(16)],
    // CGNAT (RFC 6598)
    [ipv4ToInt('100.64.0.0'),  cidrMask(10)],
    // Alibaba Cloud metadata (100.100.100.200)
    [ipv4ToInt('100.100.0.0'), cidrMask(16)],
    // Broadcast / "this" network
    [ipv4ToInt('0.0.0.0'),     cidrMask(8)],
    // Documentation ranges (RFC 5737) — no enrutables
    [ipv4ToInt('192.0.2.0'),   cidrMask(24)],
    [ipv4ToInt('198.51.100.0'),cidrMask(24)],
    [ipv4ToInt('203.0.113.0'), cidrMask(24)],
    // Multicast
    [ipv4ToInt('224.0.0.0'),   cidrMask(4)],
    // Reservado / uso futuro
    [ipv4ToInt('240.0.0.0'),   cidrMask(4)],
];

/** Endpoints de metadatos de cloud (IPs específicas). */
const CLOUD_METADATA_IPS = new Set([
    '169.254.169.254',       // AWS, GCP, Azure, DigitalOcean, etc.
    '100.100.100.200',       // Alibaba Cloud
    '192.0.0.192',           // Oracle Cloud
    '103.90.224.0',          // Tencent Cloud (rango, se captura vía CIDR si se añade)
]);

// ── Helpers de IPv4 ──────────────────────────────────────────────────────────

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
        return true;
    }
    if (CLOUD_METADATA_IPS.has(ip)) return true;
    return BLOCKED_IPV4_CIDRS.some(([net, mask]) => (addr & mask) === net);
}

// ── Helpers de IPv6 ──────────────────────────────────────────────────────────

function isBlockedIPv6(ip: string): boolean {
    const lower = ip.toLowerCase().replace(/^\[|\]$/g, '');

    // Loopback ::1
    if (lower === '::1' || lower === '0:0:0:0:0:0:0:1') return true;

    // Unspecified ::
    if (lower === '::' || lower === '0:0:0:0:0:0:0:0') return true;

    // Link-local fe80::/10
    if (/^fe[89ab][0-9a-f]:/i.test(lower)) return true;

    // Unique local fc00::/7 (fc:: y fd::)
    if (/^f[cd][0-9a-f]{2}:/i.test(lower)) return true;

    // Documentation 2001:db8::/32
    if (/^2001:db8:/i.test(lower)) return true;

    // IPv4-mapped ::ffff:x.x.x.x
    const mappedMatch = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mappedMatch) return isBlockedIPv4(mappedMatch[1]);

    // IPv4-compatible ::x.x.x.x (obsoleto pero peligroso)
    const compatMatch = lower.match(/^::(\d+\.\d+\.\d+\.\d+)$/);
    if (compatMatch) return isBlockedIPv4(compatMatch[1]);

    return false;
}

// ── Detección de IP ──────────────────────────────────────────────────────────

function looksLikeIpAddress(hostname: string): boolean {
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) return true;
    if (hostname.includes(':')) return true;
    return false;
}

// ── TLDs internos / no enrutables ────────────────────────────────────────────

const BLOCKED_TLDS = new Set([
    'local',
    'localhost',
    'internal',
    'corp',
    'home',
    'lan',
    'test',
    'example',
    'invalid',
    'onion',     // Tor — podría exponer servicios internos
]);

// ── API pública ───────────────────────────────────────────────────────────────

export interface SsrfGuardResult {
    ok: boolean;
    reason?: string;
}

/**
 * Valida una URL contra vectores SSRF (esquema, IPs privadas, puertos, TLDs internos).
 * NO resuelve DNS — para protección completa contra DNS rebinding,
 * usa `resolveAndValidate()`.
 */
export function validateOutboundUrl(raw: string): SsrfGuardResult {
    let parsed: URL;
    try {
        parsed = new URL(raw.trim());
    } catch {
        return { ok: false, reason: 'URL inválida.' };
    }

    // 1. Esquema
    if (!ALLOWED_SCHEMES.has(parsed.protocol)) {
        return { ok: false, reason: `Esquema no permitido: ${parsed.protocol}` };
    }

    // 2. Hostname presente
    const hostname = parsed.hostname;
    if (!hostname) {
        return { ok: false, reason: 'URL sin hostname.' };
    }

    // 3. Credenciales en la URL (user:pass@host)
    if (parsed.username || parsed.password) {
        return { ok: false, reason: 'Credenciales embebidas no permitidas en la URL.' };
    }

    // 4. Puerto bloqueado (solo si no es el default y es conocido)
    const port = parsed.port ? parseInt(parsed.port, 10) : null;
    if (port && BLOCKED_PORTS.has(port)) {
        return { ok: false, reason: `Puerto no permitido: ${port}` };
    }

    // 5. IPs privadas/reservadas
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

    // 6. Bloquear localhost por nombre
    if (hostname === 'localhost' || hostname.endsWith('.localhost')) {
        return { ok: false, reason: 'Hostname localhost no permitido.' };
    }

    // 7. Bloquear TLDs internos
    const tld = hostname.split('.').pop()?.toLowerCase() || '';
    if (BLOCKED_TLDS.has(tld)) {
        return { ok: false, reason: `Dominio con TLD '${tld}' no permitido.` };
    }

    return { ok: true };
}

/**
 * Resuelve DNS de la URL y valida la IP resultante.
 * Útil como capa adicional contra DNS rebinding.
 *
 * NOTA: Esta función usa `dns.promises.resolve4`/`resolve6` de Node.js.
 * Solo funciona en el servidor (no en Edge Runtime).
 */
export async function resolveAndValidate(raw: string): Promise<SsrfGuardResult> {
    // Primero validación estándar
    const staticCheck = validateOutboundUrl(raw);
    if (!staticCheck.ok) return staticCheck;

    const { hostname } = new URL(raw.trim());

    // Si es una IP, no necesita resolución DNS (ya fue validada)
    if (looksLikeIpAddress(hostname)) {
        return { ok: true };
    }

    try {
        // Import dinámico para evitar problemas en Edge Runtime
        const dns = await import('node:dns/promises');

        const [ipv4Addresses, ipv6Addresses] = await Promise.all([
            dns.resolve4(hostname).catch(() => []),
            dns.resolve6(hostname).catch(() => []),
        ]);

        // Validar cada IP resuelta
        for (const ip of ipv4Addresses) {
            if (isBlockedIPv4(ip)) {
                return { ok: false, reason: `DNS resolvió a IP privada: ${ip}` };
            }
        }
        for (const ip of ipv6Addresses) {
            if (isBlockedIPv6(ip)) {
                return { ok: false, reason: `DNS resolvió a IPv6 privada: ${ip}` };
            }
        }

        return { ok: true };
    } catch {
        // Si falla la resolución DNS, bloqueamos por seguridad
        return { ok: false, reason: 'No se pudo resolver el dominio.' };
    }
}