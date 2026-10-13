import AsyncStorage from '@react-native-async-storage/async-storage';

export const SYNC_KEY_STORAGE = '@zen_sync_key';
const CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

let cachedSyncKey: string | null = null;

/**
 * Generates an unambiguous, human-friendly pairing code: ZEN-XXXX-XXXX
 * Omits characters easily confused: 0/O, 1/I.
 */
export function generateSyncKey(): string {
  let part1 = '';
  let part2 = '';
  for (let i = 0; i < 4; i++) {
    part1 += CHARS[Math.floor(Math.random() * CHARS.length)];
    part2 += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return `ZEN-${part1}-${part2}`;
}

/**
 * Validates if a string adheres to the ZEN-XXXX-XXXX pairing format.
 */
export function isValidSyncKey(key: string): boolean {
  if (!key) return false;
  const cleaned = key.trim().toUpperCase();
  return /^ZEN-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(cleaned);
}

/**
 * Retrieves the currently active sync key or generates and persists a new one.
 */
export async function getSyncKey(): Promise<string> {
  if (cachedSyncKey && isValidSyncKey(cachedSyncKey)) {
    return cachedSyncKey;
  }

  try {
    const existing = await AsyncStorage.getItem(SYNC_KEY_STORAGE);
    if (existing && isValidSyncKey(existing)) {
      cachedSyncKey = existing.trim().toUpperCase();
      return cachedSyncKey;
    }
  } catch (err) {
    console.error('[SyncKeyManager] Failed to read sync key from AsyncStorage', err);
  }

  const generated = generateSyncKey();
  try {
    await AsyncStorage.setItem(SYNC_KEY_STORAGE, generated);
  } catch (err) {
    console.error('[SyncKeyManager] Failed to persist generated sync key', err);
  }
  cachedSyncKey = generated;
  return generated;
}

/**
 * Synchronous accessor for in-memory cached key, if already loaded.
 */
export function getCachedSyncKey(): string | null {
  return cachedSyncKey;
}

/**
 * Persists a new sync key to AsyncStorage after format validation.
 */
export async function setSyncKey(newKey: string): Promise<boolean> {
  const normalized = newKey.trim().toUpperCase();
  if (!isValidSyncKey(normalized)) {
    return false;
  }
  try {
    await AsyncStorage.setItem(SYNC_KEY_STORAGE, normalized);
    cachedSyncKey = normalized;
    return true;
  } catch (err) {
    console.error('[SyncKeyManager] Failed to persist new sync key', err);
    return false;
  }
}
