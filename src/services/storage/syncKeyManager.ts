import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateSyncKey, isValidSyncKey } from './syncKeyFormat';

export { generateSyncKey, isValidSyncKey };

export const SYNC_KEY_STORAGE = '@zen_sync_key';
const SECURE_SYNC_KEY = 'zen_sync_key_v1';

let cachedSyncKey: string | null = null;

function getSecureStoreModule(): typeof import('expo-secure-store') | null {
  try {
    // Load lazily so OTA updates stay compatible even with older APKs lacking ExpoSecureStore native binary
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('expo-secure-store') as typeof import('expo-secure-store');
    if (mod && typeof mod.getItemAsync === 'function' && typeof mod.setItemAsync === 'function') {
      return mod;
    }
  } catch {
    // Fallback to AsyncStorage if native module is unavailable
  }
  return null;
}

async function writeToSecureStorage(value: string): Promise<boolean> {
  try {
    const SecureStore = getSecureStoreModule();
    if (!SecureStore) return false;
    await SecureStore.setItemAsync(SECURE_SYNC_KEY, value, {
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
    });
    // Ensure plain AsyncStorage no longer holds the pairing key
    await AsyncStorage.removeItem(SYNC_KEY_STORAGE).catch(() => {});
    return true;
  } catch {
    return false;
  }
}

async function readFromSecureStorage(): Promise<string | null> {
  try {
    const SecureStore = getSecureStoreModule();
    if (!SecureStore) return null;
    const secured = await SecureStore.getItemAsync(SECURE_SYNC_KEY);
    if (secured && isValidSyncKey(secured)) {
      return secured.trim().toUpperCase();
    }
  } catch {
    // Ignore when SecureStore is unavailable (e.g., web, test environment, or pre-SecureStore APK)
  }
  return null;
}

/**
 * Retrieves the currently active sync key from hardware-backed SecureStore
 * (migrating any legacy AsyncStorage value) or generates and persists a new one.
 */
export async function getSyncKey(): Promise<string> {
  if (cachedSyncKey && isValidSyncKey(cachedSyncKey)) {
    return cachedSyncKey;
  }

  const fromSecure = await readFromSecureStorage();
  if (fromSecure) {
    cachedSyncKey = fromSecure;
    // Remove any leftover legacy plaintext copy in AsyncStorage
    await AsyncStorage.removeItem(SYNC_KEY_STORAGE).catch(() => {});
    return fromSecure;
  }

  try {
    const legacy = await AsyncStorage.getItem(SYNC_KEY_STORAGE);
    if (legacy && isValidSyncKey(legacy)) {
      const normalized = legacy.trim().toUpperCase();
      await writeToSecureStorage(normalized);
      cachedSyncKey = normalized;
      return normalized;
    }
  } catch (err) {
    console.error('[SyncKeyManager] Failed to read sync key from AsyncStorage', err);
  }

  const generated = generateSyncKey();
  const savedSecure = await writeToSecureStorage(generated);
  if (!savedSecure) {
    try {
      await AsyncStorage.setItem(SYNC_KEY_STORAGE, generated);
    } catch (err) {
      console.error('[SyncKeyManager] Failed to persist generated sync key', err);
    }
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
 * Persists a new sync key after strict format validation.
 */
export async function setSyncKey(newKey: string): Promise<boolean> {
  const normalized = typeof newKey === 'string' ? newKey.trim().toUpperCase() : '';
  if (!isValidSyncKey(normalized)) {
    return false;
  }

  const savedSecure = await writeToSecureStorage(normalized);
  if (savedSecure) {
    cachedSyncKey = normalized;
    return true;
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
