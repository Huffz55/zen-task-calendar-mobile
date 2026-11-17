import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, onSnapshot, setDoc, deleteDoc } from 'firebase/firestore';
import { Task, CustomList, SyncDocState } from '../../types';
import {
  validateTask,
  validateCustomList,
  sanitizeDeletedIds,
  safeJsonParse,
  MAX_TASKS_LIMIT,
  MAX_LISTS_LIMIT,
} from '../validation/validator';
import { db, ensureAuth } from '../firebase/firebaseClient';
import { mergeItemsWithTombstones, cleanUndefined } from './syncEngine';
import { getSyncKey, setSyncKey, generateSyncKey, isValidSyncKey, SYNC_KEY_STORAGE } from './syncKeyManager';
import { defaultFocusStorage, FOCUS_SESSIONS_STORAGE_KEY } from './focusStorage';

export const TASKS_STORAGE_KEY = '@noteapp_mobile_tasks_v1';
export const LISTS_STORAGE_KEY = '@noteapp_mobile_lists_v1';
export const THEME_STORAGE_KEY = '@noteapp_mobile_theme_v1';
export const TASKS_DELETED_KEY = '@noteapp_mobile_tasks_deleted_ids_v1';
export const LISTS_DELETED_KEY = '@noteapp_mobile_lists_deleted_ids_v1';
export const CUSTOM_TAGS_STORAGE_KEY = '@noteapp_custom_tags';

export interface ITaskStorage {
  loadTasks(): Promise<Task[]>;
  saveTasks(tasks: Task[]): Promise<void>;
  subscribeTasks?(callback: (tasks: Task[]) => void): () => void;
  switchSyncKey?(newKey: string): Promise<void>;
}

export interface IListStorage {
  loadLists(): Promise<CustomList[]>;
  saveLists(lists: CustomList[]): Promise<void>;
  subscribeLists?(callback: (lists: CustomList[]) => void): () => void;
  switchSyncKey?(newKey: string): Promise<void>;
}

async function loadDeletedIds(key: string): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw) {
      const parsed = safeJsonParse<unknown>(raw);
      return sanitizeDeletedIds(parsed);
    }
  } catch {}
  return [];
}

async function saveDeletedIds(key: string, ids: string[]): Promise<void> {
  try {
    const capped = sanitizeDeletedIds(ids, 1000);
    await AsyncStorage.setItem(key, JSON.stringify(capped));
  } catch {}
}

export class MobileTaskStorage implements ITaskStorage {
  private isApplyingRemoteUpdate = false;
  private lastPushedHash = '';
  private pushTimer: ReturnType<typeof setTimeout> | null = null;
  private currentUnsubscribe: (() => void) | null = null;
  private activeSubscriber: ((tasks: Task[]) => void) | null = null;

  async loadTasks(): Promise<Task[]> {
    try {
      const stored = await AsyncStorage.getItem(TASKS_STORAGE_KEY);
      if (!stored) return [];
      const raw = safeJsonParse<unknown>(stored);
      if (Array.isArray(raw)) {
        const validated: Task[] = [];
        for (const item of raw.slice(0, MAX_TASKS_LIMIT)) {
          const v = validateTask(item);
          if (v) validated.push(v);
        }
        return validated;
      }
      return [];
    } catch (e) {
      if (__DEV__) console.error('[SyncError Mobile Tasks] Failed to load tasks from AsyncStorage', e);
      return [];
    }
  }

  async saveTasks(tasks: Task[]): Promise<void> {
    try {
      const prevStored = await AsyncStorage.getItem(TASKS_STORAGE_KEY);
      const parsedPrev = prevStored ? safeJsonParse<unknown>(prevStored) : [];
      const prevTasks: Task[] = Array.isArray(parsedPrev)
        ? parsedPrev.map(validateTask).filter((t): t is Task => t !== null)
        : [];
      const prevMap = new Map(prevTasks.map(t => [t.id, t]));

      const currentIds = new Set(tasks.map(t => t.id));
      const newlyDeletedIds = prevTasks.filter(t => !currentIds.has(t.id)).map(t => t.id);
      const existingDeletedIds = await loadDeletedIds(TASKS_DELETED_KEY);
      if (!prevStored && tasks.length === 0 && existingDeletedIds.length === 0) {
        return;
      }
      const updatedDeletedIds = sanitizeDeletedIds([...existingDeletedIds, ...newlyDeletedIds], 1000);
      if (newlyDeletedIds.length > 0) {
        await saveDeletedIds(TASKS_DELETED_KEY, updatedDeletedIds);
      }

      const now = Date.now();
      const tasksWithTimestamps: Task[] = tasks.slice(0, MAX_TASKS_LIMIT).map(t => {
        const prev = prevMap.get(t.id);
        if (!prev || JSON.stringify(prev) !== JSON.stringify(t)) {
          return { ...t, updatedAt: now };
        }
        return { ...t, updatedAt: t.updatedAt || now };
      });

      const newSerialized = JSON.stringify(tasksWithTimestamps);
      await AsyncStorage.setItem(TASKS_STORAGE_KEY, newSerialized);

      if (this.isApplyingRemoteUpdate || newSerialized === this.lastPushedHash) {
        return;
      }

      this.lastPushedHash = newSerialized;

      if (this.pushTimer) {
        clearTimeout(this.pushTimer);
      }
      this.pushTimer = setTimeout(async () => {
        try {
          await ensureAuth();
          const syncKey = await getSyncKey();
          if (!isValidSyncKey(syncKey)) return;
          const taskDocRef = doc(db, 'workspaces', `${syncKey}_tasks`);
          const payload: SyncDocState<Task> = {
            items: cleanUndefined(tasksWithTimestamps),
            deletedIds: updatedDeletedIds,
            updatedAt: Date.now(),
          };
          await setDoc(taskDocRef, payload);
          if (__DEV__) {
            console.log(`[Sync Mobile] Pushed tasks (count: ${tasksWithTimestamps.length})`);
          }
        } catch (err) {
          if (__DEV__) console.error('[SyncError Mobile Tasks]: Failed to push tasks to Firestore:', err);
        }
      }, 150);
    } catch (e) {
      if (__DEV__) console.error('[SyncError Mobile Tasks]: Failed in saveTasks', e);
    }
  }

  subscribeTasks(callback: (tasks: Task[]) => void): () => void {
    this.activeSubscriber = callback;
    let isCancelled = false;

    ensureAuth()
      .then(async () => {
        if (isCancelled) return;
        const syncKey = await getSyncKey();
        if (!isValidSyncKey(syncKey)) return;
        const taskDocRef = doc(db, 'workspaces', `${syncKey}_tasks`);

        const unsubscribeFirestore = onSnapshot(
          taskDocRef,
          async snapshot => {
            if (!snapshot.exists()) {
              const localTasks = await this.loadTasks();
              const localDeletedIds = await loadDeletedIds(TASKS_DELETED_KEY);
              if (localTasks.length > 0 || localDeletedIds.length > 0) {
                const payload: SyncDocState<Task> = {
                  items: cleanUndefined(localTasks),
                  deletedIds: localDeletedIds,
                  updatedAt: Date.now(),
                };
                setDoc(taskDocRef, payload).catch(err => {
                  if (__DEV__) console.error('[SyncError Mobile Tasks]: Failed to initialize empty tasks_state:', err);
                });
              }
              return;
            }

            const data = snapshot.data() as SyncDocState<unknown> | undefined;
            if (!data || !Array.isArray(data.items)) return;

            // Strictly validate & sanitize every remote record before storing/rendering
            const validatedRemoteTasks: Task[] = [];
            for (const rawItem of data.items.slice(0, MAX_TASKS_LIMIT)) {
              const v = validateTask(rawItem);
              if (v) validatedRemoteTasks.push(v);
            }

            const localTasks = await this.loadTasks();
            const localDeletedIds = await loadDeletedIds(TASKS_DELETED_KEY);
            const remoteDeletedIds = sanitizeDeletedIds(data.deletedIds);
            const combinedDeletedIds = new Set([...localDeletedIds, ...remoteDeletedIds]);

            await saveDeletedIds(TASKS_DELETED_KEY, Array.from(combinedDeletedIds));

            const merged = mergeItemsWithTombstones(localTasks, validatedRemoteTasks, combinedDeletedIds);
            const mergedSerialized = JSON.stringify(merged);

            if (mergedSerialized !== JSON.stringify(localTasks)) {
              if (__DEV__) {
                console.log(`[Sync Mobile] Received updated tasks (count: ${merged.length})`);
              }
              this.isApplyingRemoteUpdate = true;
              this.lastPushedHash = mergedSerialized;
              await AsyncStorage.setItem(TASKS_STORAGE_KEY, mergedSerialized);

              callback(merged);

              setTimeout(() => {
                this.isApplyingRemoteUpdate = false;
              }, 150);
            }
          },
          err => {
            if (__DEV__) console.error('[SyncError Mobile Tasks]: onSnapshot listener error:', err);
          }
        );

        this.currentUnsubscribe = unsubscribeFirestore;
      })
      .catch(err => {
        if (__DEV__) console.error('[SyncError Mobile Tasks]: Failed to initialize task subscription:', err);
      });

    return () => {
      isCancelled = true;
      if (this.currentUnsubscribe) {
        this.currentUnsubscribe();
        this.currentUnsubscribe = null;
      }
      if (this.pushTimer) {
        clearTimeout(this.pushTimer);
      }
    };
  }

  cancelPendingPush(): void {
    if (this.pushTimer) {
      clearTimeout(this.pushTimer);
      this.pushTimer = null;
    }
    this.lastPushedHash = '';
  }

  async switchSyncKey(newKey: string): Promise<void> {
    const ok = await setSyncKey(newKey);
    if (!ok) return;
    if (this.currentUnsubscribe) {
      this.currentUnsubscribe();
      this.currentUnsubscribe = null;
    }
    this.lastPushedHash = '';
    if (this.activeSubscriber) {
      this.subscribeTasks(this.activeSubscriber);
    }
  }
}

export class MobileListStorage implements IListStorage {
  private isApplyingRemoteUpdate = false;
  private lastPushedHash = '';
  private pushTimer: ReturnType<typeof setTimeout> | null = null;
  private currentUnsubscribe: (() => void) | null = null;
  private activeSubscriber: ((lists: CustomList[]) => void) | null = null;

  async loadLists(): Promise<CustomList[]> {
    try {
      const stored = await AsyncStorage.getItem(LISTS_STORAGE_KEY);
      if (!stored) return [];
      const raw = safeJsonParse<unknown>(stored);
      if (Array.isArray(raw)) {
        const validated: CustomList[] = [];
        for (const item of raw.slice(0, MAX_LISTS_LIMIT)) {
          const v = validateCustomList(item);
          if (v) validated.push(v);
        }
        return validated;
      }
      return [];
    } catch (e) {
      if (__DEV__) console.error('[SyncError Mobile Lists] Failed to load lists from AsyncStorage', e);
      return [];
    }
  }

  async saveLists(lists: CustomList[]): Promise<void> {
    try {
      const prevStored = await AsyncStorage.getItem(LISTS_STORAGE_KEY);
      const parsedPrev = prevStored ? safeJsonParse<unknown>(prevStored) : [];
      const prevLists: CustomList[] = Array.isArray(parsedPrev)
        ? parsedPrev.map(validateCustomList).filter((l): l is CustomList => l !== null)
        : [];
      const prevMap = new Map(prevLists.map(l => [l.id, l]));

      const currentIds = new Set(lists.map(l => l.id));
      const newlyDeletedIds = prevLists.filter(l => !currentIds.has(l.id)).map(l => l.id);
      const existingDeletedIds = await loadDeletedIds(LISTS_DELETED_KEY);
      if (!prevStored && lists.length === 0 && existingDeletedIds.length === 0) {
        return;
      }
      const updatedDeletedIds = sanitizeDeletedIds([...existingDeletedIds, ...newlyDeletedIds], 1000);
      if (newlyDeletedIds.length > 0) {
        await saveDeletedIds(LISTS_DELETED_KEY, updatedDeletedIds);
      }

      const now = Date.now();
      const listsWithTimestamps: CustomList[] = lists.slice(0, MAX_LISTS_LIMIT).map(l => {
        const prev = prevMap.get(l.id);
        if (!prev || JSON.stringify(prev) !== JSON.stringify(l)) {
          return { ...l, updatedAt: now };
        }
        return { ...l, updatedAt: l.updatedAt || now };
      });

      const newSerialized = JSON.stringify(listsWithTimestamps);
      await AsyncStorage.setItem(LISTS_STORAGE_KEY, newSerialized);

      if (this.isApplyingRemoteUpdate || newSerialized === this.lastPushedHash) {
        return;
      }

      this.lastPushedHash = newSerialized;

      if (this.pushTimer) {
        clearTimeout(this.pushTimer);
      }
      this.pushTimer = setTimeout(async () => {
        try {
          await ensureAuth();
          const syncKey = await getSyncKey();
          if (!isValidSyncKey(syncKey)) return;
          const listDocRef = doc(db, 'workspaces', `${syncKey}_lists`);
          const payload: SyncDocState<CustomList> = {
            items: cleanUndefined(listsWithTimestamps),
            deletedIds: updatedDeletedIds,
            updatedAt: Date.now(),
          };
          await setDoc(listDocRef, payload);
          if (__DEV__) {
            console.log(`[Sync Mobile] Pushed lists (count: ${listsWithTimestamps.length})`);
          }
        } catch (err) {
          if (__DEV__) console.error('[SyncError Mobile Lists]: Failed to push lists to Firestore:', err);
        }
      }, 150);
    } catch (e) {
      if (__DEV__) console.error('[SyncError Mobile Lists]: Failed in saveLists', e);
    }
  }

  subscribeLists(callback: (lists: CustomList[]) => void): () => void {
    this.activeSubscriber = callback;
    let isCancelled = false;

    ensureAuth()
      .then(async () => {
        if (isCancelled) return;
        const syncKey = await getSyncKey();
        if (!isValidSyncKey(syncKey)) return;
        const listDocRef = doc(db, 'workspaces', `${syncKey}_lists`);

        const unsubscribeFirestore = onSnapshot(
          listDocRef,
          async snapshot => {
            if (!snapshot.exists()) {
              const localLists = await this.loadLists();
              const localDeletedIds = await loadDeletedIds(LISTS_DELETED_KEY);
              if (localLists.length > 0 || localDeletedIds.length > 0) {
                const payload: SyncDocState<CustomList> = {
                  items: cleanUndefined(localLists),
                  deletedIds: localDeletedIds,
                  updatedAt: Date.now(),
                };
                setDoc(listDocRef, payload).catch(err => {
                  if (__DEV__) console.error('[SyncError Mobile Lists]: Failed to initialize empty lists_state:', err);
                });
              }
              return;
            }

            const data = snapshot.data() as SyncDocState<unknown> | undefined;
            if (!data || !Array.isArray(data.items)) return;

            const validatedRemoteLists: CustomList[] = [];
            for (const rawItem of data.items.slice(0, MAX_LISTS_LIMIT)) {
              const v = validateCustomList(rawItem);
              if (v) validatedRemoteLists.push(v);
            }

            const localLists = await this.loadLists();
            const localDeletedIds = await loadDeletedIds(LISTS_DELETED_KEY);
            const remoteDeletedIds = sanitizeDeletedIds(data.deletedIds);
            const combinedDeletedIds = new Set([...localDeletedIds, ...remoteDeletedIds]);

            await saveDeletedIds(LISTS_DELETED_KEY, Array.from(combinedDeletedIds));

            const merged = mergeItemsWithTombstones(localLists, validatedRemoteLists, combinedDeletedIds);
            const mergedSerialized = JSON.stringify(merged);

            if (mergedSerialized !== JSON.stringify(localLists)) {
              if (__DEV__) {
                console.log(`[Sync Mobile] Received updated lists (count: ${merged.length})`);
              }
              this.isApplyingRemoteUpdate = true;
              this.lastPushedHash = mergedSerialized;
              await AsyncStorage.setItem(LISTS_STORAGE_KEY, mergedSerialized);

              callback(merged);

              setTimeout(() => {
                this.isApplyingRemoteUpdate = false;
              }, 150);
            }
          },
          err => {
            if (__DEV__) console.error('[SyncError Mobile Lists]: onSnapshot listener error:', err);
          }
        );

        this.currentUnsubscribe = unsubscribeFirestore;
      })
      .catch(err => {
        if (__DEV__) console.error('[SyncError Mobile Lists]: Failed to initialize list subscription:', err);
      });

    return () => {
      isCancelled = true;
      if (this.currentUnsubscribe) {
        this.currentUnsubscribe();
        this.currentUnsubscribe = null;
      }
      if (this.pushTimer) {
        clearTimeout(this.pushTimer);
      }
    };
  }

  cancelPendingPush(): void {
    if (this.pushTimer) {
      clearTimeout(this.pushTimer);
      this.pushTimer = null;
    }
    this.lastPushedHash = '';
  }

  async switchSyncKey(newKey: string): Promise<void> {
    const ok = await setSyncKey(newKey);
    if (!ok) return;
    if (this.currentUnsubscribe) {
      this.currentUnsubscribe();
      this.currentUnsubscribe = null;
    }
    this.lastPushedHash = '';
    if (this.activeSubscriber) {
      this.subscribeLists(this.activeSubscriber);
    }
  }
}

export const defaultTaskStorage: ITaskStorage = new MobileTaskStorage();
export const defaultListStorage: IListStorage = new MobileListStorage();

export async function switchGlobalSyncKey(newKey: string): Promise<boolean> {
  const success = await setSyncKey(newKey);
  if (!success) return false;
  await (defaultTaskStorage as MobileTaskStorage).switchSyncKey(newKey);
  await (defaultListStorage as MobileListStorage).switchSyncKey(newKey);
  await defaultFocusStorage.switchSyncKey(newKey);
  return true;
}

export async function clearAllWorkspaceData(): Promise<void> {
  (defaultTaskStorage as MobileTaskStorage).cancelPendingPush();
  (defaultListStorage as MobileListStorage).cancelPendingPush();
  defaultFocusStorage.cancelPendingPush();

  try {
    await ensureAuth();
    const currentKey = await getSyncKey();
    if (isValidSyncKey(currentKey)) {
      await Promise.allSettled([
        deleteDoc(doc(db, 'workspaces', `${currentKey}_tasks`)),
        deleteDoc(doc(db, 'workspaces', `${currentKey}_lists`)),
        deleteDoc(doc(db, 'workspaces', `${currentKey}_focus`)),
      ]);
    }
  } catch (err) {
    if (__DEV__) console.warn('[Storage] Failed to clear remote workspace docs (continuing local wipe):', err);
  }

  await AsyncStorage.multiRemove([
    TASKS_STORAGE_KEY,
    LISTS_STORAGE_KEY,
    TASKS_DELETED_KEY,
    LISTS_DELETED_KEY,
    FOCUS_SESSIONS_STORAGE_KEY,
    CUSTOM_TAGS_STORAGE_KEY,
    SYNC_KEY_STORAGE,
  ]);

  const freshKey = generateSyncKey();
  await switchGlobalSyncKey(freshKey);
}
