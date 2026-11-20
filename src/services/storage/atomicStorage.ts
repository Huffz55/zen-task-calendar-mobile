import { safeJsonParse, MAX_BACKUP_BYTES } from '../validation/validator';

export interface AtomicStorageBackend {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

const keyQueues = new Map<string, Promise<unknown>>();

export function getBackupKey(key: string): string {
  return `${key}__backup`;
}

/**
 * Serializes asynchronous operations sharing the same storage key so overlapping
 * saves or deletions cannot interleave and corrupt primary/backup pairs.
 */
function enqueueKeyOp<T>(key: string, op: () => Promise<T>): Promise<T> {
  const prev = keyQueues.get(key) ?? Promise.resolve();
  const next = prev.catch(() => {}).then(op);
  const tail = next.then(
    () => {
      if (keyQueues.get(key) === tail) {
        keyQueues.delete(key);
      }
    },
    () => {
      if (keyQueues.get(key) === tail) {
        keyQueues.delete(key);
      }
    }
  );
  keyQueues.set(key, tail);
  return next;
}

function validateArrayItems<T>(
  raw: unknown[],
  validateItem: (item: unknown) => T | null,
  maxItems: number
): T[] {
  const validated: T[] = [];
  const capped = raw.slice(0, maxItems);
  for (const item of capped) {
    const valid = validateItem(item);
    if (valid !== null) {
      validated.push(valid);
    }
  }
  return validated;
}

/**
 * Reads a persisted JSON array safely. If the primary key contains corrupted JSON
 * or a non-array payload, automatically attempts recovery from `${key}__backup`
 * before falling back to `[]` without crashing.
 */
export async function safeReadJsonArray<T>(
  storage: AtomicStorageBackend,
  key: string,
  validateItem: (item: unknown) => T | null,
  maxItems: number
): Promise<T[]> {
  return enqueueKeyOp(key, async () => {
    const backupKey = getBackupKey(key);

    try {
      const primaryRaw = await storage.getItem(key);
      if (primaryRaw !== null) {
        const parsedPrimary = safeJsonParse<unknown>(primaryRaw, MAX_BACKUP_BYTES);
        if (Array.isArray(parsedPrimary)) {
          return validateArrayItems(parsedPrimary, validateItem, maxItems);
        }

        // Primary key is corrupted or malformed: try restoring from shadow backup
        const backupRaw = await storage.getItem(backupKey).catch(() => null);
        if (backupRaw !== null) {
          const parsedBackup = safeJsonParse<unknown>(backupRaw, MAX_BACKUP_BYTES);
          if (Array.isArray(parsedBackup)) {
            await storage.setItem(key, backupRaw).catch(() => {});
            return validateArrayItems(parsedBackup, validateItem, maxItems);
          }
        }

        // Neither copy is recoverable: quarantine corrupted primary entry safely
        await storage.removeItem(key).catch(() => {});
        return [];
      }

      // Primary absent: still check if a crash occurred between writing backup and primary
      const backupRaw = await storage.getItem(backupKey).catch(() => null);
      if (backupRaw !== null) {
        const parsedBackup = safeJsonParse<unknown>(backupRaw, MAX_BACKUP_BYTES);
        if (Array.isArray(parsedBackup)) {
          await storage.setItem(key, backupRaw).catch(() => {});
          return validateArrayItems(parsedBackup, validateItem, maxItems);
        }
      }

      return [];
    } catch {
      return [];
    }
  });
}

/**
 * Atomically persists JSON data per key by committing the shadow `__backup` copy
 * before swapping the primary key inside a serialized per-key queue.
 */
export async function atomicWriteJson(
  storage: AtomicStorageBackend,
  key: string,
  value: unknown
): Promise<string> {
  return enqueueKeyOp(key, async () => {
    const serialized = JSON.stringify(value);
    const backupKey = getBackupKey(key);
    await storage.setItem(backupKey, serialized);
    await storage.setItem(key, serialized);
    return serialized;
  });
}
