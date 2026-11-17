import { getSecureRandomInt } from '../../utils/cryptoRandom';

const CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

/**
 * Generates a cryptographically random, unambiguous pairing code: ZEN-XXXX-XXXX
 * Omits characters easily confused: 0/O, 1/I.
 */
export function generateSyncKey(): string {
  let part1 = '';
  let part2 = '';
  for (let i = 0; i < 4; i++) {
    part1 += CHARS[getSecureRandomInt(CHARS.length)];
    part2 += CHARS[getSecureRandomInt(CHARS.length)];
  }
  return `ZEN-${part1}-${part2}`;
}

/**
 * Validates if a string adheres strictly to the ZEN-XXXX-XXXX pairing format.
 */
export function isValidSyncKey(key: string): boolean {
  if (typeof key !== 'string' || !key) return false;
  if (/[\r\n\t\0]/.test(key)) return false;
  const cleaned = key.trim().toUpperCase();
  return /^ZEN-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(cleaned);
}
