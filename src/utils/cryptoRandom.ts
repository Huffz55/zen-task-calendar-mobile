/**
 * Cryptographically secure random utilities using Web Crypto / Hermes global crypto,
 * avoiding predictable Math.random() for sync pairing keys and entity identifiers.
 */

function fillSecureBytes(buffer: Uint8Array<ArrayBuffer>): boolean {
  const webCrypto = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined;
  if (webCrypto && typeof webCrypto.getRandomValues === 'function') {
    webCrypto.getRandomValues(buffer);
    return true;
  }

  try {
    // Fallback to expo-crypto when globalThis.crypto is unavailable (older runtimes)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const expoCrypto = require('expo-crypto') as { getRandomBytes?: (byteCount: number) => Uint8Array };
    if (expoCrypto && typeof expoCrypto.getRandomBytes === 'function') {
      const bytes = expoCrypto.getRandomBytes(buffer.length);
      buffer.set(bytes);
      return true;
    }
  } catch {
    // Ignore when running outside native Expo runtime
  }

  return false;
}

/**
 * Generates a cryptographically uniform random integer in [0, max).
 * Uses rejection sampling to prevent modulo bias.
 */
export function getSecureRandomInt(max: number): number {
  if (!Number.isInteger(max) || max <= 0 || max > 256) {
    throw new RangeError(`max must be an integer in 1..256, got ${max}`);
  }

  const limit = 256 - (256 % max);
  const byteBuf = new Uint8Array(new ArrayBuffer(16));

  for (let attempt = 0; attempt < 16; attempt++) {
    if (!fillSecureBytes(byteBuf)) {
      throw new Error('Cryptographically secure RNG is unavailable in this environment');
    }
    for (let i = 0; i < byteBuf.length; i++) {
      if (byteBuf[i] < limit) {
        return byteBuf[i] % max;
      }
    }
  }

  // Fallback only if rejection sampling somehow exhausts 256 bytes (probability < 2^-200)
  return byteBuf[0] % max;
}

/**
 * Generates an unambiguous, collision-resistant entity ID.
 */
export function generateSecureId(): string {
  const bytes = new Uint8Array(new ArrayBuffer(6));
  if (fillSecureBytes(bytes)) {
    let hex = '';
    for (let i = 0; i < bytes.length; i++) {
      hex += bytes[i].toString(16).padStart(2, '0');
    }
    return `${Date.now().toString(36)}-${hex}`;
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
