import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateSyncKey, isValidSyncKey } from './syncKeyFormat';
import { normalizeMachineKey } from '../../utils/localeText';

export { generateSyncKey, isValidSyncKey };

export const SYNC_KEY_STORAGE = '@zen_sync_key';
export const CLOUD_SYNC_ENABLED_KEY = '@zen_cloud_sync_enabled';
const SECURE_SYNC_KEY = 'zen_sync_key_v1';

let cachedSyncKey: string | null = null;
let cachedCloudSyncEnabled: boolean | null = null;

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
      return normalizeMachineKey(secured);
    }
  } catch {
    // Ignore when SecureStore is unavailable (e.g., web, test environment, or pre-SecureStore APK)
  }
  return null;
}

async function deleteFromSecureStorage(): Promise<void> {
  try {
    const SecureStore = getSecureStoreModule();
    if (SecureStore && typeof SecureStore.deleteItemAsync === 'function') {
      await SecureStore.deleteItemAsync(SECURE_SYNC_KEY);
    }
  } catch {
    // Ignore when SecureStore is unavailable
  }
}

/**
 * Returns true only when the user has explicitly opted into Cloud Sync.
 * Defaults to false so Kanso remains strictly local-first with zero background Firebase traffic.
 */
export async function isCloudSyncEnabled(): Promise<boolean> {
  if (cachedCloudSyncEnabled !== null) {
    return cachedCloudSyncEnabled;
  }
  try {
    const raw = await AsyncStorage.getItem(CLOUD_SYNC_ENABLED_KEY);
    cachedCloudSyncEnabled = raw === 'true';
    return cachedCloudSyncEnabled;
  } catch {
    return false;
  }
}

/**
 * Persists the user's explicit Cloud Sync opt-in preference.
 */
export async function setCloudSyncEnabled(enabled: boolean): Promise<void> {
  cachedCloudSyncEnabled = enabled;
  try {
    if (enabled) {
      await AsyncStorage.setItem(CLOUD_SYNC_ENABLED_KEY, 'true');
    } else {
      await AsyncStorage.removeItem(CLOUD_SYNC_ENABLED_KEY);
    }
  } catch (err) {
    if (__DEV__) {
      console.error('[SyncKeyManager] Failed to persist cloud sync preference', err);
    }
  }
}

/**
 * Reads an already-persisted sync key without auto-generating a new one.
 * Returns null if the user has never activated Cloud Sync or after full data deletion.
 */
export async function getExistingSyncKey(): Promise<string | null> {
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
      const normalized = normalizeMachineKey(legacy);
      await writeToSecureStorage(normalized);
      cachedSyncKey = normalized;
      return normalized;
    }
  } catch (err) {
    if (__DEV__) {
      console.error('[SyncKeyManager] Failed to read sync key from AsyncStorage', err);
    }
  }

  return null;
}

/**
 * Retrieves the currently active sync key from hardware-backed SecureStore
 * (migrating any legacy AsyncStorage value) or generates and persists a new one.
 */
export async function getSyncKey(): Promise<string> {
  const existing = await getExistingSyncKey();
  if (existing) {
    return existing;
  }

  const generated = generateSyncKey();
  const savedSecure = await writeToSecureStorage(generated);
  if (!savedSecure) {
    try {
      await AsyncStorage.setItem(SYNC_KEY_STORAGE, generated);
    } catch (err) {
      if (__DEV__) {
        console.error('[SyncKeyManager] Failed to persist generated sync key', err);
      }
    }
  }
  cachedSyncKey = generated;
  return generated;
}

/**
 * Persists a new sync key after strict format validation.
 */
export async function setSyncKey(newKey: string): Promise<boolean> {
  const normalized = typeof newKey === 'string' ? normalizeMachineKey(newKey) : '';
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
    if (__DEV__) {
      console.error('[SyncKeyManager] Failed to persist new sync key', err);
    }
    return false;
  }
}

/**
 * Permanently removes the stored sync key from hardware-backed SecureStore,
 * AsyncStorage, and in-memory cache.
 */
export async function clearSyncKey(): Promise<void> {
  cachedSyncKey = null;
  await deleteFromSecureStorage();
  await AsyncStorage.removeItem(SYNC_KEY_STORAGE).catch(() => {});
}
