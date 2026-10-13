import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { Task, CustomList, SyncDocState } from '../../types';
import { validateTask, validateCustomList } from '../validation/validator';
import { db, ensureAuth } from '../firebase/firebaseClient';
import { mergeItemsWithTombstones, cleanUndefined } from './syncEngine';
import { getSyncKey, setSyncKey } from './syncKeyManager';

export const TASKS_STORAGE_KEY = '@noteapp_mobile_tasks_v1';
export const LISTS_STORAGE_KEY = '@noteapp_mobile_lists_v1';
export const THEME_STORAGE_KEY = '@noteapp_mobile_theme_v1';
export const TASKS_DELETED_KEY = '@noteapp_mobile_tasks_deleted_ids_v1';
export const LISTS_DELETED_KEY = '@noteapp_mobile_lists_deleted_ids_v1';

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
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

async function saveDeletedIds(key: string, ids: string[]): Promise<void> {
  try {
    const capped = ids.slice(-1000);
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
      const raw: unknown = JSON.parse(stored);
      if (Array.isArray(raw)) {
        const validated: Task[] = [];
        for (const item of raw) {
          const v = validateTask(item);
          if (v) validated.push(v);
        }
        return validated;
      }
      return [];
    } catch (e) {
      console.error('[SyncError Mobile Tasks] Failed to load tasks from AsyncStorage', e);
      return [];
    }
  }

  async saveTasks(tasks: Task[]): Promise<void> {
    try {
      // 1. Previous tasks for diffing deletions & content changes
      const prevStored = await AsyncStorage.getItem(TASKS_STORAGE_KEY);
      const prevTasks: Task[] = prevStored ? JSON.parse(prevStored) : [];
      const prevMap = new Map(prevTasks.map(t => [t.id, t]));

      // 2. Track deleted IDs (Tombstones)
      const currentIds = new Set(tasks.map(t => t.id));
      const newlyDeletedIds = prevTasks.filter(t => !currentIds.has(t.id)).map(t => t.id);
      const existingDeletedIds = await loadDeletedIds(TASKS_DELETED_KEY);
      const updatedDeletedIds = Array.from(new Set([...existingDeletedIds, ...newlyDeletedIds]));
      if (newlyDeletedIds.length > 0) {
        await saveDeletedIds(TASKS_DELETED_KEY, updatedDeletedIds);
      }

      // 3. Attach updatedAt timestamp to modified/new tasks
      const now = Date.now();
      const tasksWithTimestamps: Task[] = tasks.map(t => {
        const prev = prevMap.get(t.id);
        if (!prev || JSON.stringify(prev) !== JSON.stringify(t)) {
          return { ...t, updatedAt: now };
        }
        return { ...t, updatedAt: t.updatedAt || now };
      });

      // 4. Always save to AsyncStorage immediately (0ms local-first guarantee)
      const newSerialized = JSON.stringify(tasksWithTimestamps);
      await AsyncStorage.setItem(TASKS_STORAGE_KEY, newSerialized);

      // 5. Infinite Echo Loop Protection
      if (this.isApplyingRemoteUpdate || newSerialized === this.lastPushedHash) {
        return;
      }

      this.lastPushedHash = newSerialized;

      // 6. Push to Firestore (debounced 150ms to batch rapid UI actions)
      if (this.pushTimer) {
        clearTimeout(this.pushTimer);
      }
      this.pushTimer = setTimeout(async () => {
        try {
          await ensureAuth();
          const syncKey = await getSyncKey();
          const taskDocRef = doc(db, 'workspaces', `${syncKey}_tasks`);
          const payload: SyncDocState<Task> = {
            items: cleanUndefined(tasksWithTimestamps),
            deletedIds: updatedDeletedIds,
            updatedAt: Date.now(),
          };
          await setDoc(taskDocRef, payload);
          console.log(`[Sync Mobile] Successfully pushed tasks to ${taskDocRef.path} (count: ${tasksWithTimestamps.length})`);
        } catch (err) {
          console.error('[SyncError Mobile Tasks]: Failed to push tasks to Firestore:', err);
        }
      }, 150);
    } catch (e) {
      console.error('[SyncError Mobile Tasks]: Failed in saveTasks', e);
    }
  }

  subscribeTasks(callback: (tasks: Task[]) => void): () => void {
    this.activeSubscriber = callback;
    let isCancelled = false;

    ensureAuth()
      .then(async () => {
        if (isCancelled) return;
        const syncKey = await getSyncKey();
        const taskDocRef = doc(db, 'workspaces', `${syncKey}_tasks`);

        const unsubscribeFirestore = onSnapshot(
          taskDocRef,
          async snapshot => {
            if (!snapshot.exists()) {
              const localTasks = await this.loadTasks();
              const localDeletedIds = await loadDeletedIds(TASKS_DELETED_KEY);
              if (localTasks.length > 0 || localDeletedIds.length > 0) {
                console.log(`[Sync Mobile] Initializing empty cloud document ${taskDocRef.path} with local data...`);
                const payload: SyncDocState<Task> = {
                  items: cleanUndefined(localTasks),
                  deletedIds: localDeletedIds,
                  updatedAt: Date.now(),
                };
                setDoc(taskDocRef, payload).catch(err => {
                  console.error('[SyncError Mobile Tasks]: Failed to initialize empty tasks_state:', err);
                });
              }
              return;
            }

            const data = snapshot.data() as SyncDocState<Task> | undefined;
            if (!data || !Array.isArray(data.items)) return;

            // Load local state & tombstones
            const localTasks = await this.loadTasks();
            const localDeletedIds = await loadDeletedIds(TASKS_DELETED_KEY);
            const remoteDeletedIds = Array.isArray(data.deletedIds) ? data.deletedIds : [];
            const combinedDeletedIds = new Set([...localDeletedIds, ...remoteDeletedIds]);

            // Save combined tombstones
            await saveDeletedIds(TASKS_DELETED_KEY, Array.from(combinedDeletedIds));

            // Merge with tombstones
            const merged = mergeItemsWithTombstones(localTasks, data.items, combinedDeletedIds);
            const mergedSerialized = JSON.stringify(merged);

            // If merged state is different from local, apply it
            if (mergedSerialized !== JSON.stringify(localTasks)) {
              console.log(`[Sync Mobile] Received updated tasks from ${taskDocRef.path} (count: ${merged.length})`);
              this.isApplyingRemoteUpdate = true;
              this.lastPushedHash = mergedSerialized;
              await AsyncStorage.setItem(TASKS_STORAGE_KEY, mergedSerialized);

              // Notify hook to update React state
              callback(merged);

              // Reset echo guard
              setTimeout(() => {
                this.isApplyingRemoteUpdate = false;
              }, 150);
            }
          },
          err => {
            console.error('[SyncError Mobile Tasks]: onSnapshot listener error:', err);
          }
        );

        this.currentUnsubscribe = unsubscribeFirestore;
      })
      .catch(err => {
        console.error('[SyncError Mobile Tasks]: Failed to initialize task subscription:', err);
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

  async switchSyncKey(newKey: string): Promise<void> {
    await setSyncKey(newKey);
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
      const raw: unknown = JSON.parse(stored);
      if (Array.isArray(raw)) {
        const validated: CustomList[] = [];
        for (const item of raw) {
          const v = validateCustomList(item);
          if (v) validated.push(v);
        }
        return validated;
      }
      return [];
    } catch (e) {
      console.error('[SyncError Mobile Lists] Failed to load lists from AsyncStorage', e);
      return [];
    }
  }

  async saveLists(lists: CustomList[]): Promise<void> {
    try {
      // 1. Previous lists for diffing deletions
      const prevStored = await AsyncStorage.getItem(LISTS_STORAGE_KEY);
      const prevLists: CustomList[] = prevStored ? JSON.parse(prevStored) : [];
      const prevMap = new Map(prevLists.map(l => [l.id, l]));

      // 2. Track deleted list IDs
      const currentIds = new Set(lists.map(l => l.id));
      const newlyDeletedIds = prevLists.filter(l => !currentIds.has(l.id)).map(l => l.id);
      const existingDeletedIds = await loadDeletedIds(LISTS_DELETED_KEY);
      const updatedDeletedIds = Array.from(new Set([...existingDeletedIds, ...newlyDeletedIds]));
      if (newlyDeletedIds.length > 0) {
        await saveDeletedIds(LISTS_DELETED_KEY, updatedDeletedIds);
      }

      // 3. Attach updatedAt timestamp
      const now = Date.now();
      const listsWithTimestamps: CustomList[] = lists.map(l => {
        const prev = prevMap.get(l.id);
        if (!prev || JSON.stringify(prev) !== JSON.stringify(l)) {
          return { ...l, updatedAt: now };
        }
        return { ...l, updatedAt: l.updatedAt || now };
      });

      // 4. Save to AsyncStorage immediately
      const newSerialized = JSON.stringify(listsWithTimestamps);
      await AsyncStorage.setItem(LISTS_STORAGE_KEY, newSerialized);

      // 5. Infinite Echo Loop Protection
      if (this.isApplyingRemoteUpdate || newSerialized === this.lastPushedHash) {
        return;
      }

      this.lastPushedHash = newSerialized;

      // 6. Push to Firestore
      if (this.pushTimer) {
        clearTimeout(this.pushTimer);
      }
      this.pushTimer = setTimeout(async () => {
        try {
          await ensureAuth();
          const syncKey = await getSyncKey();
          const listDocRef = doc(db, 'workspaces', `${syncKey}_lists`);
          const payload: SyncDocState<CustomList> = {
            items: cleanUndefined(listsWithTimestamps),
            deletedIds: updatedDeletedIds,
            updatedAt: Date.now(),
          };
          await setDoc(listDocRef, payload);
          console.log(`[Sync Mobile] Successfully pushed lists to ${listDocRef.path} (count: ${listsWithTimestamps.length})`);
        } catch (err) {
          console.error('[SyncError Mobile Lists]: Failed to push lists to Firestore:', err);
        }
      }, 150);
    } catch (e) {
      console.error('[SyncError Mobile Lists]: Failed in saveLists', e);
    }
  }

  subscribeLists(callback: (lists: CustomList[]) => void): () => void {
    this.activeSubscriber = callback;
    let isCancelled = false;

    ensureAuth()
      .then(async () => {
        if (isCancelled) return;
        const syncKey = await getSyncKey();
        const listDocRef = doc(db, 'workspaces', `${syncKey}_lists`);

        const unsubscribeFirestore = onSnapshot(
          listDocRef,
          async snapshot => {
            if (!snapshot.exists()) {
              const localLists = await this.loadLists();
              const localDeletedIds = await loadDeletedIds(LISTS_DELETED_KEY);
              if (localLists.length > 0 || localDeletedIds.length > 0) {
                console.log(`[Sync Mobile] Initializing empty cloud document ${listDocRef.path} with local data...`);
                const payload: SyncDocState<CustomList> = {
                  items: cleanUndefined(localLists),
                  deletedIds: localDeletedIds,
                  updatedAt: Date.now(),
                };
                setDoc(listDocRef, payload).catch(err => {
                  console.error('[SyncError Mobile Lists]: Failed to initialize empty lists_state:', err);
                });
              }
              return;
            }

            const data = snapshot.data() as SyncDocState<CustomList> | undefined;
            if (!data || !Array.isArray(data.items)) return;

            // Load local state & tombstones
            const localLists = await this.loadLists();
            const localDeletedIds = await loadDeletedIds(LISTS_DELETED_KEY);
            const remoteDeletedIds = Array.isArray(data.deletedIds) ? data.deletedIds : [];
            const combinedDeletedIds = new Set([...localDeletedIds, ...remoteDeletedIds]);

            // Save combined tombstones
            await saveDeletedIds(LISTS_DELETED_KEY, Array.from(combinedDeletedIds));

            // Merge with tombstones
            const merged = mergeItemsWithTombstones(localLists, data.items, combinedDeletedIds);
            const mergedSerialized = JSON.stringify(merged);

            if (mergedSerialized !== JSON.stringify(localLists)) {
              console.log(`[Sync Mobile] Received updated lists from ${listDocRef.path} (count: ${merged.length})`);
              this.isApplyingRemoteUpdate = true;
              this.lastPushedHash = mergedSerialized;
              await AsyncStorage.setItem(LISTS_STORAGE_KEY, mergedSerialized);

              // Notify hook to update React state
              callback(merged);

              // Reset echo guard
              setTimeout(() => {
                this.isApplyingRemoteUpdate = false;
              }, 150);
            }
          },
          err => {
            console.error('[SyncError Mobile Lists]: onSnapshot listener error:', err);
          }
        );

        this.currentUnsubscribe = unsubscribeFirestore;
      })
      .catch(err => {
        console.error('[SyncError Mobile Lists]: Failed to initialize list subscription:', err);
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

  async switchSyncKey(newKey: string): Promise<void> {
    await setSyncKey(newKey);
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
  return true;
}
