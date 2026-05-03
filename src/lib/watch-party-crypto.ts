/**
 * Cryptographic helpers for watch-party room passwords.
 *
 * Room passwords are short-lived PINs, not user account credentials, so
 * PBKDF2-SHA256 with a random salt is appropriate and avoids adding a
 * bcrypt dependency. The stored format is:
 *
 *   pbkdf2:<iterations>:<salt_hex>:<hash_hex>
 *
 * This makes the algorithm and parameters self-describing so future
 * migrations can detect and upgrade old hashes.
 */

import { pbkdf2, randomBytes } from 'crypto';
import { promisify } from 'util';

const pbkdf2Async = promisify(pbkdf2);

const ALGORITHM  = 'sha256';
const ITERATIONS = 100_000;
const KEY_LENGTH = 32; // bytes → 64 hex chars
const SALT_BYTES = 16;
const PREFIX     = 'pbkdf2';

/**
 * Hashes a room password for storage.
 * Returns a self-describing string: `pbkdf2:<iterations>:<salt>:<hash>`
 */
export async function hashRoomPassword(password: string): Promise<string> {
    const salt = randomBytes(SALT_BYTES).toString('hex');
    const key  = await pbkdf2Async(password, salt, ITERATIONS, KEY_LENGTH, ALGORITHM);
    return `${PREFIX}:${ITERATIONS}:${salt}:${key.toString('hex')}`;
}

/**
 * Verifies a plaintext password against a stored hash produced by
 * `hashRoomPassword`. Returns false for any malformed stored value.
 */
export async function verifyRoomPassword(password: string, stored: string): Promise<boolean> {
    try {
        const parts = stored.split(':');
        if (parts.length !== 4 || parts[0] !== PREFIX) return false;

        const iterations = parseInt(parts[1], 10);
        const salt       = parts[2];
        const expected   = parts[3];

        if (!iterations || !salt || !expected) return false;

        const key = await pbkdf2Async(password, salt, iterations, KEY_LENGTH, ALGORITHM);

        // Constant-time comparison to prevent timing attacks.
        const keyHex      = key.toString('hex');
        const expectedBuf = Buffer.from(expected, 'hex');
        const actualBuf   = Buffer.from(keyHex,   'hex');

        if (expectedBuf.length !== actualBuf.length) return false;

        let diff = 0;
        for (let i = 0; i < expectedBuf.length; i++) {
            diff |= expectedBuf[i] ^ actualBuf[i];
        }
        return diff === 0;
    } catch {
        return false;
    }
}
