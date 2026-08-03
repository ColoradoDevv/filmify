/**
 * Cryptographic helpers for watch-party room passwords.
 *
 * Room passwords are short-lived PINs, not user account credentials, so
 * PBKDF2-SHA256 with a random salt is appropriate. Originally implemented
 * using Node.js `crypto.pbkdf2` + `util.promisify`; rewritten to use the
 * Web Crypto API (crypto.subtle) for Cloudflare Workers compatibility.
 *
 * ── Salt encoding — CRITICAL for backward compatibility ──────────────────────
 * The original Node.js implementation stored the salt as a hex string
 * (randomBytes(16).toString('hex'), e.g. "d903b804...") and passed that
 * same STRING directly to pbkdf2() as the salt argument. Node.js crypto.pbkdf2
 * treats a string salt as its UTF-8 byte representation, NOT as decoded hex.
 * So the actual salt bytes fed to PBKDF2 were the ASCII/UTF-8 bytes of the
 * 32-character hex string (32 bytes), not the 16 decoded bytes.
 *
 * The new implementation MUST replicate this exact behavior to remain
 * compatible with hashes already stored in the database. Therefore:
 *   - The salt passed to crypto.subtle.deriveBits is TextEncoder(saltHex),
 *     i.e. the UTF-8 bytes of the hex string — exactly what Node.js did.
 *   - This is verified by the test in scripts/_pbkdf2-compat-test.mjs.
 *
 * Stored format (self-describing for future migrations):
 *   pbkdf2:<iterations>:<salt_hex>:<hash_hex>
 */

const ALGORITHM  = 'SHA-256';  // Node.js 'sha256' → same algorithm
const ITERATIONS = 100_000;
const KEY_LENGTH = 32;         // bytes → 64 hex chars
const SALT_BYTES = 16;         // produces a 32-char hex string as salt
const PREFIX     = 'pbkdf2';

// ── Helpers ──────────────────────────────────────────────────────────────────

function bufToHex(buf: ArrayBuffer): string {
    return Array.from(new Uint8Array(buf))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

/**
 * Derives PBKDF2-SHA256 key from password and saltHex.
 *
 * Salt encoding: saltHex is passed as its UTF-8 byte representation
 * (TextEncoder), matching the behavior of the original Node.js implementation
 * which received the hex string directly as the salt argument.
 */
async function deriveKey(
    password: string,
    saltHex: string,
    iterations: number,
): Promise<string> {
    const enc = new TextEncoder();

    const baseKey = await crypto.subtle.importKey(
        'raw',
        enc.encode(password),   // UTF-8 bytes of password — same as Node.js
        'PBKDF2',
        false,
        ['deriveBits'],
    );

    const bits = await crypto.subtle.deriveBits(
        {
            name:       'PBKDF2',
            hash:       ALGORITHM,
            // UTF-8 bytes of the hex string — replicates Node.js string→salt behavior
            salt:       enc.encode(saltHex),
            iterations,
        },
        baseKey,
        KEY_LENGTH * 8, // bits
    );

    return bufToHex(bits);
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Hashes a room password for storage.
 * Returns a self-describing string: `pbkdf2:<iterations>:<salt>:<hash>`
 *
 * The saltHex is 32 hex characters (16 raw bytes), stored as-is.
 * PBKDF2 receives the UTF-8 bytes of that hex string as the salt,
 * matching the original Node.js implementation byte-for-byte.
 */
export async function hashRoomPassword(password: string): Promise<string> {
    const saltBytes = new Uint8Array(SALT_BYTES);
    crypto.getRandomValues(saltBytes);
    // toString('hex') equivalent: lowercase hex, no padding issues
    const saltHex = bufToHex(saltBytes.buffer);
    const hash = await deriveKey(password, saltHex, ITERATIONS);
    return `${PREFIX}:${ITERATIONS}:${saltHex}:${hash}`;
}

/**
 * Verifies a plaintext password against a stored hash produced by
 * `hashRoomPassword`. Returns false for any malformed stored value.
 *
 * Compatible with hashes produced by both the original Node.js implementation
 * and this Web Crypto implementation (salt encoding is identical).
 */
export async function verifyRoomPassword(
    password: string,
    stored: string,
): Promise<boolean> {
    try {
        const parts = stored.split(':');
        if (parts.length !== 4 || parts[0] !== PREFIX) return false;

        const iterations = parseInt(parts[1], 10);
        const salt       = parts[2];
        const expected   = parts[3];

        if (!iterations || !salt || !expected) return false;

        const actual = await deriveKey(password, salt, iterations);

        // Constant-time byte comparison to prevent timing attacks.
        if (actual.length !== expected.length) return false;

        let diff = 0;
        for (let i = 0; i < actual.length; i++) {
            diff |= actual.charCodeAt(i) ^ expected.charCodeAt(i);
        }
        return diff === 0;
    } catch {
        return false;
    }
}
