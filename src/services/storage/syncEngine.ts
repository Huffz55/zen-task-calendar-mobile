/**
 * Generic Tombstone-enabled Array Merge Engine for Mobile
 * Prevents zombie items (resurrection bug) across offline/online clients.
 */
export function mergeItemsWithTombstones<T extends { id: string; updatedAt?: number }>(
  localItems: T[],
  remoteItems: T[],
  deletedIdsSet: Set<string>
): T[] {
  const map = new Map<string, T>();

  // 1. Add local items unless in deletedIds
  for (const item of localItems) {
    if (!deletedIdsSet.has(item.id)) {
      map.set(item.id, item);
    }
  }

  // 2. Merge remote items
  for (const remoteItem of remoteItems) {
    if (deletedIdsSet.has(remoteItem.id)) {
      // Tombstone active: never resurrect deleted items!
      continue;
    }

    const localItem = map.get(remoteItem.id);
    if (!localItem) {
      map.set(remoteItem.id, remoteItem);
    } else {
      // Last-Write-Wins based on updatedAt
      const remoteTime = remoteItem.updatedAt || 0;
      const localTime = localItem.updatedAt || 0;
      if (remoteTime > localTime) {
        map.set(remoteItem.id, remoteItem);
      }
    }
  }

  return Array.from(map.values());
}

const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Strips undefined properties and prototype-pollution keys recursively so Firestore setDoc never rejects or leaks unsafe keys.
 */
export function cleanUndefined<T>(obj: T): T {
  const serialized = JSON.stringify(obj);
  return JSON.parse(serialized, (key, value) => {
    if (FORBIDDEN_KEYS.has(key)) {
      return undefined;
    }
    return value;
  }) as T;
}
