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
import { ensureAuth, getFirebaseDb, signOutIfInitialized } from '../firebase/firebaseClient';
import { mergeItemsWithTombstones, cleanUndefined } from './syncEngine';
import {
  clearSyncKey,
  CLOUD_SYNC_ENABLED_KEY,
  getExistingSyncKey,
  getSyncKey,
  isCloudSyncEnabled,
  isValidSyncKey,
  setCloudSyncEnabled,
  setSyncKey,
  SYNC_KEY_STORAGE,
} from './syncKeyManager';
import { defaultFocusStorage, FOCUS_SESSIONS_STORAGE_KEY } from './focusStorage';
import { atomicRemoveJson, atomicWriteJson, safeReadJsonArray } from './atomicStorage';
import { ZEN_TIMER_STATE_KEY } from '../../utils/zenTimerPersistence';

const TASKS_STORAGE_KEY = '@noteapp_mobile_tasks_v1';
const LISTS_STORAGE_KEY = '@noteapp_mobile_lists_v1';
export const THEME_STORAGE_KEY = '@noteapp_mobile_theme_v1';
const TASKS_DELETED_KEY = '@noteapp_mobile_tasks_deleted_ids_v1';
const LISTS_DELETED_KEY = '@noteapp_mobile_lists_deleted_ids_v1';
export const CUSTOM_TAGS_STORAGE_KEY = '@noteapp_custom_tags';
export const CUSTOM_FOLDERS_STORAGE_KEY = '@noteapp_custom_folders';

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

class MobileTaskStorage implements ITaskStorage {
  private isApplyingRemoteUpdate = false;
  private lastPushedHash = '';
  private pushTimer: ReturnType<typeof setTimeout> | null = null;
  private remoteResetTimer: ReturnType<typeof setTimeout> | null = null;
  private currentUnsubscribe: (() => void) | null = null;
  private activeSubscriber: ((tasks: Task[]) => void) | null = null;
  private subscriptionGeneration = 0;

  async loadTasks(): Promise<Task[]> {
    return safeReadJsonArray(AsyncStorage, TASKS_STORAGE_KEY, validateTask, MAX_TASKS_LIMIT);
  }

  async saveTasks(tasks: Task[]): Promise<void> {
    try {
      const prevStored = await AsyncStorage.getItem(TASKS_STORAGE_KEY).catch(() => null);
      const prevTasks = await this.loadTasks();
      const prevMap = new Map(prevTasks.map(t => [t.id, t]));

      const currentIds = new Set(tasks.map(t => t.id));
      const newlyDeletedIds = prevTasks.filter(t => !currentIds.has(t.id)).map(t => t.id);
      const existingDeletedIds = await loadDeletedIds(TASKS_DELETED_KEY);
      if (!prevStored && prevTasks.length === 0 && tasks.length === 0 && existingDeletedIds.length === 0) {
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

      const newSerialized = await atomicWriteJson(AsyncStorage, TASKS_STORAGE_KEY, tasksWithTimestamps);

      const pushGen = this.subscriptionGeneration;
      if (!(await isCloudSyncEnabled()) || pushGen !== this.subscriptionGeneration) {
        return;
      }

      if (this.isApplyingRemoteUpdate || newSerialized === this.lastPushedHash) {
        return;
      }

      this.lastPushedHash = newSerialized;

      if (this.pushTimer) {
        clearTimeout(this.pushTimer);
      }
      this.pushTimer = setTimeout(async () => {
        try {
          if (pushGen !== this.subscriptionGeneration || !(await isCloudSyncEnabled())) return;
          await ensureAuth();
          if (pushGen !== this.subscriptionGeneration || !(await isCloudSyncEnabled())) return;
          const syncKey = await getExistingSyncKey();
          if (pushGen !== this.subscriptionGeneration || !syncKey || !isValidSyncKey(syncKey)) return;
          const taskDocRef = doc(getFirebaseDb(), 'workspaces', `${syncKey}_tasks`);
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

  detachCloudListener(): void {
    this.subscriptionGeneration++;
    this.cancelPendingPush();
    if (this.remoteResetTimer) {
      clearTimeout(this.remoteResetTimer);
      this.remoteResetTimer = null;
    }
    this.isApplyingRemoteUpdate = false;
    if (this.currentUnsubscribe) {
      this.currentUnsubscribe();
      this.currentUnsubscribe = null;
    }
  }

  private attachCloudListener(): void {
    const callback = this.activeSubscriber;
    if (!callback) return;

    const gen = ++this.subscriptionGeneration;
    if (this.currentUnsubscribe) {
      this.currentUnsubscribe();
      this.currentUnsubscribe = null;
    }

    isCloudSyncEnabled()
      .then(async enabled => {
        if (!enabled || gen !== this.subscriptionGeneration) return;
        await ensureAuth();
        if (gen !== this.subscriptionGeneration || !(await isCloudSyncEnabled())) return;
        const syncKey = await getSyncKey();
        if (!isValidSyncKey(syncKey) || gen !== this.subscriptionGeneration) return;
        const taskDocRef = doc(getFirebaseDb(), 'workspaces', `${syncKey}_tasks`);

        const unsubscribeFirestore = onSnapshot(
          taskDocRef,
          async snapshot => {
            if (gen !== this.subscriptionGeneration) return;
            if (!snapshot.exists()) {
              const localTasks = await this.loadTasks();
              if (gen !== this.subscriptionGeneration) return;
              const localDeletedIds = await loadDeletedIds(TASKS_DELETED_KEY);
              if ((localTasks.length > 0 || localDeletedIds.length > 0) && gen === this.subscriptionGeneration) {
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
            if (gen !== this.subscriptionGeneration) return;
            const localDeletedIds = await loadDeletedIds(TASKS_DELETED_KEY);
            if (gen !== this.subscriptionGeneration) return;
            const remoteDeletedIds = sanitizeDeletedIds(data.deletedIds);
            const combinedDeletedIds = new Set([...localDeletedIds, ...remoteDeletedIds]);
            const combinedDeletedArray = Array.from(combinedDeletedIds);

            await saveDeletedIds(TASKS_DELETED_KEY, combinedDeletedArray);
            if (gen !== this.subscriptionGeneration) return;

            const merged = mergeItemsWithTombstones(localTasks, validatedRemoteTasks, combinedDeletedIds);
            const mergedSerialized = JSON.stringify(merged);
            const remoteNeedsPush =
              mergedSerialized !== JSON.stringify(validatedRemoteTasks) ||
              combinedDeletedArray.length !== remoteDeletedIds.length;

            if (mergedSerialized !== JSON.stringify(localTasks)) {
              if (__DEV__) {
                console.log(`[Sync Mobile] Received updated tasks (count: ${merged.length})`);
              }
              this.isApplyingRemoteUpdate = true;
              try {
                this.lastPushedHash = mergedSerialized;
                await atomicWriteJson(AsyncStorage, TASKS_STORAGE_KEY, merged);
                if (gen !== this.subscriptionGeneration) {
                  this.isApplyingRemoteUpdate = false;
                  return;
                }
                callback(merged);
                if (this.remoteResetTimer) clearTimeout(this.remoteResetTimer);
                this.remoteResetTimer = setTimeout(() => {
                  this.isApplyingRemoteUpdate = false;
                  this.remoteResetTimer = null;
                }, 150);
              } catch (writeErr) {
                this.isApplyingRemoteUpdate = false;
                throw writeErr;
              }
            }

            if (remoteNeedsPush && gen === this.subscriptionGeneration) {
              this.lastPushedHash = mergedSerialized;
              const payload: SyncDocState<Task> = {
                items: cleanUndefined(merged),
                deletedIds: combinedDeletedArray,
                updatedAt: Date.now(),
              };
              setDoc(taskDocRef, payload).catch(err => {
                if (__DEV__) console.error('[SyncError Mobile Tasks]: Failed to sync merged tasks:', err);
              });
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
  }

  activateCloudSync(): void {
    this.lastPushedHash = '';
    this.attachCloudListener();
  }

  rebindCloudListener(): void {
    this.detachCloudListener();
    if (this.activeSubscriber) {
      this.attachCloudListener();
    }
  }

  subscribeTasks(callback: (tasks: Task[]) => void): () => void {
    this.activeSubscriber = callback;
    this.attachCloudListener();

    return () => {
      this.detachCloudListener();
      if (this.activeSubscriber === callback) {
        this.activeSubscriber = null;
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
    this.rebindCloudListener();
  }
}

class MobileListStorage implements IListStorage {
  private isApplyingRemoteUpdate = false;
  private lastPushedHash = '';
  private pushTimer: ReturnType<typeof setTimeout> | null = null;
  private remoteResetTimer: ReturnType<typeof setTimeout> | null = null;
  private currentUnsubscribe: (() => void) | null = null;
  private activeSubscriber: ((lists: CustomList[]) => void) | null = null;
  private subscriptionGeneration = 0;

  async loadLists(): Promise<CustomList[]> {
    return safeReadJsonArray(AsyncStorage, LISTS_STORAGE_KEY, validateCustomList, MAX_LISTS_LIMIT);
  }

  async saveLists(lists: CustomList[]): Promise<void> {
    try {
      const prevStored = await AsyncStorage.getItem(LISTS_STORAGE_KEY).catch(() => null);
      const prevLists = await this.loadLists();
      const prevMap = new Map(prevLists.map(l => [l.id, l]));

      const currentIds = new Set(lists.map(l => l.id));
      const newlyDeletedIds = prevLists.filter(l => !currentIds.has(l.id)).map(l => l.id);
      const existingDeletedIds = await loadDeletedIds(LISTS_DELETED_KEY);
      if (!prevStored && prevLists.length === 0 && lists.length === 0 && existingDeletedIds.length === 0) {
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

      const newSerialized = await atomicWriteJson(AsyncStorage, LISTS_STORAGE_KEY, listsWithTimestamps);

      const pushGen = this.subscriptionGeneration;
      if (!(await isCloudSyncEnabled()) || pushGen !== this.subscriptionGeneration) {
        return;
      }

      if (this.isApplyingRemoteUpdate || newSerialized === this.lastPushedHash) {
        return;
      }

      this.lastPushedHash = newSerialized;

      if (this.pushTimer) {
        clearTimeout(this.pushTimer);
      }
      this.pushTimer = setTimeout(async () => {
        try {
          if (pushGen !== this.subscriptionGeneration || !(await isCloudSyncEnabled())) return;
          await ensureAuth();
          if (pushGen !== this.subscriptionGeneration || !(await isCloudSyncEnabled())) return;
          const syncKey = await getExistingSyncKey();
          if (pushGen !== this.subscriptionGeneration || !syncKey || !isValidSyncKey(syncKey)) return;
          const listDocRef = doc(getFirebaseDb(), 'workspaces', `${syncKey}_lists`);
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

  detachCloudListener(): void {
    this.subscriptionGeneration++;
    this.cancelPendingPush();
    if (this.remoteResetTimer) {
      clearTimeout(this.remoteResetTimer);
      this.remoteResetTimer = null;
    }
    this.isApplyingRemoteUpdate = false;
    if (this.currentUnsubscribe) {
      this.currentUnsubscribe();
      this.currentUnsubscribe = null;
    }
  }

  private attachCloudListener(): void {
    const callback = this.activeSubscriber;
    if (!callback) return;

    const gen = ++this.subscriptionGeneration;
    if (this.currentUnsubscribe) {
      this.currentUnsubscribe();
      this.currentUnsubscribe = null;
    }

    isCloudSyncEnabled()
      .then(async enabled => {
        if (!enabled || gen !== this.subscriptionGeneration) return;
        await ensureAuth();
        if (gen !== this.subscriptionGeneration || !(await isCloudSyncEnabled())) return;
        const syncKey = await getSyncKey();
        if (!isValidSyncKey(syncKey) || gen !== this.subscriptionGeneration) return;
        const listDocRef = doc(getFirebaseDb(), 'workspaces', `${syncKey}_lists`);

        const unsubscribeFirestore = onSnapshot(
          listDocRef,
          async snapshot => {
            if (gen !== this.subscriptionGeneration) return;
            if (!snapshot.exists()) {
              const localLists = await this.loadLists();
              if (gen !== this.subscriptionGeneration) return;
              const localDeletedIds = await loadDeletedIds(LISTS_DELETED_KEY);
              if ((localLists.length > 0 || localDeletedIds.length > 0) && gen === this.subscriptionGeneration) {
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
            if (gen !== this.subscriptionGeneration) return;
            const localDeletedIds = await loadDeletedIds(LISTS_DELETED_KEY);
            if (gen !== this.subscriptionGeneration) return;
            const remoteDeletedIds = sanitizeDeletedIds(data.deletedIds);
            const combinedDeletedIds = new Set([...localDeletedIds, ...remoteDeletedIds]);
            const combinedDeletedArray = Array.from(combinedDeletedIds);

            await saveDeletedIds(LISTS_DELETED_KEY, combinedDeletedArray);
            if (gen !== this.subscriptionGeneration) return;

            const merged = mergeItemsWithTombstones(localLists, validatedRemoteLists, combinedDeletedIds);
            const mergedSerialized = JSON.stringify(merged);
            const remoteNeedsPush =
              mergedSerialized !== JSON.stringify(validatedRemoteLists) ||
              combinedDeletedArray.length !== remoteDeletedIds.length;

            if (mergedSerialized !== JSON.stringify(localLists)) {
              if (__DEV__) {
                console.log(`[Sync Mobile] Received updated lists (count: ${merged.length})`);
              }
              this.isApplyingRemoteUpdate = true;
              try {
                this.lastPushedHash = mergedSerialized;
                await atomicWriteJson(AsyncStorage, LISTS_STORAGE_KEY, merged);
                if (gen !== this.subscriptionGeneration) {
                  this.isApplyingRemoteUpdate = false;
                  return;
                }
                callback(merged);
                if (this.remoteResetTimer) clearTimeout(this.remoteResetTimer);
                this.remoteResetTimer = setTimeout(() => {
                  this.isApplyingRemoteUpdate = false;
                  this.remoteResetTimer = null;
                }, 150);
              } catch (writeErr) {
                this.isApplyingRemoteUpdate = false;
                throw writeErr;
              }
            }

            if (remoteNeedsPush && gen === this.subscriptionGeneration) {
              this.lastPushedHash = mergedSerialized;
              const payload: SyncDocState<CustomList> = {
                items: cleanUndefined(merged),
                deletedIds: combinedDeletedArray,
                updatedAt: Date.now(),
              };
              setDoc(listDocRef, payload).catch(err => {
                if (__DEV__) console.error('[SyncError Mobile Lists]: Failed to sync merged lists:', err);
              });
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
  }

  activateCloudSync(): void {
    this.lastPushedHash = '';
    this.attachCloudListener();
  }

  rebindCloudListener(): void {
    this.detachCloudListener();
    if (this.activeSubscriber) {
      this.attachCloudListener();
    }
  }

  subscribeLists(callback: (lists: CustomList[]) => void): () => void {
    this.activeSubscriber = callback;
    this.attachCloudListener();

    return () => {
      this.detachCloudListener();
      if (this.activeSubscriber === callback) {
        this.activeSubscriber = null;
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
    this.rebindCloudListener();
  }
}

export const defaultTaskStorage: ITaskStorage = new MobileTaskStorage();
export const defaultListStorage: IListStorage = new MobileListStorage();

/**
 * Explicitly opts into Cloud Sync, ensures a device pairing key exists,
 * and lazily initializes Firebase listeners for tasks, lists, and focus sessions.
 */
export async function enableCloudSync(): Promise<string> {
  const key = await getSyncKey();
  await setCloudSyncEnabled(true);
  (defaultTaskStorage as MobileTaskStorage).activateCloudSync();
  (defaultListStorage as MobileListStorage).activateCloudSync();
  defaultFocusStorage.activateCloudSync();
  return key;
}

/**
 * Turns off Cloud Sync, detaching all Firebase listeners and stopping background pushes
 * without modifying local data.
 */
export async function disableCloudSync(): Promise<void> {
  await setCloudSyncEnabled(false);
  (defaultTaskStorage as MobileTaskStorage).detachCloudListener();
  (defaultListStorage as MobileListStorage).detachCloudListener();
  defaultFocusStorage.detachCloudListener();
}

export async function switchGlobalSyncKey(newKey: string): Promise<boolean> {
  const success = await setSyncKey(newKey);
  if (!success) return false;
  await setCloudSyncEnabled(true);
  (defaultTaskStorage as MobileTaskStorage).rebindCloudListener();
  (defaultListStorage as MobileListStorage).rebindCloudListener();
  defaultFocusStorage.rebindCloudListener();
  return true;
}

export async function clearAllWorkspaceData(): Promise<void> {
  // Disable cloud sync FIRST and immediately detach all active Firestore listeners & pending pushes
  // so no concurrent save/push/snapshot can resurrect deleted items or regenerate keys.
  await setCloudSyncEnabled(false);
  (defaultTaskStorage as MobileTaskStorage).detachCloudListener();
  (defaultListStorage as MobileListStorage).detachCloudListener();
  defaultFocusStorage.detachCloudListener();

  const existingKey = await getExistingSyncKey();
  if (existingKey && isValidSyncKey(existingKey)) {
    try {
      await ensureAuth();
      const db = getFirebaseDb();
      const results = await Promise.allSettled([
        deleteDoc(doc(db, 'workspaces', `${existingKey}_tasks`)),
        deleteDoc(doc(db, 'workspaces', `${existingKey}_lists`)),
        deleteDoc(doc(db, 'workspaces', `${existingKey}_focus`)),
      ]);
      if (__DEV__) {
        const failed = results.filter(r => r.status === 'rejected');
        if (failed.length > 0) {
          console.warn('[Storage] Some remote workspace docs failed to delete:', failed.length);
        }
      }
      await signOutIfInitialized();
    } catch (err) {
      if (__DEV__) console.warn('[Storage] Failed to clear remote workspace docs (continuing local wipe):', err);
    }
  }

  // Remove atomic primary+backup pairs inside atomicStorage's per-key serialized queues
  await Promise.all([
    atomicRemoveJson(AsyncStorage, TASKS_STORAGE_KEY),
    atomicRemoveJson(AsyncStorage, LISTS_STORAGE_KEY),
    atomicRemoveJson(AsyncStorage, FOCUS_SESSIONS_STORAGE_KEY),
  ]);

  await AsyncStorage.multiRemove([
    TASKS_DELETED_KEY,
    LISTS_DELETED_KEY,
    CUSTOM_TAGS_STORAGE_KEY,
    CUSTOM_FOLDERS_STORAGE_KEY,
    SYNC_KEY_STORAGE,
    CLOUD_SYNC_ENABLED_KEY,
    ZEN_TIMER_STATE_KEY,
  ]);

  await clearSyncKey();
}
