import { beforeEach, describe, expect, it, vi } from 'vitest';

(globalThis as Record<string, unknown>).__DEV__ = false;

const asyncStore = new Map<string, string>();
const secureStore = new Map<string, string>();

const mockAsyncStorage = {
  getItem: vi.fn(async (key: string) => (asyncStore.has(key) ? asyncStore.get(key)! : null)),
  setItem: vi.fn(async (key: string, value: string) => {
    asyncStore.set(key, value);
  }),
  removeItem: vi.fn(async (key: string) => {
    asyncStore.delete(key);
  }),
  multiRemove: vi.fn(async (keys: string[]) => {
    for (const k of keys) asyncStore.delete(k);
  }),
};

const mockSecureStore = {
  AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 1,
  getItemAsync: vi.fn(async (key: string) => (secureStore.has(key) ? secureStore.get(key)! : null)),
  setItemAsync: vi.fn(async (key: string, value: string) => {
    secureStore.set(key, value);
  }),
  deleteItemAsync: vi.fn(async (key: string) => {
    secureStore.delete(key);
  }),
};

const mockApps: unknown[] = [];
const mockInitializeApp = vi.fn(() => {
  const app = { name: 'mock-app' };
  mockApps.push(app);
  return app;
});
const mockGetApps = vi.fn(() => mockApps);
const mockGetApp = vi.fn(() => mockApps[0]);

const mockAuthObj = { currentUser: null as null | { uid: string } };
const mockInitializeAuth = vi.fn(() => mockAuthObj);
const mockGetAuth = vi.fn(() => mockAuthObj);
const mockGetReactNativePersistence = vi.fn(() => ({ type: 'RN_ASYNC_STORAGE' }));
const mockSignInAnonymously = vi.fn(async () => {
  mockAuthObj.currentUser = { uid: 'anon-1' };
  return { user: mockAuthObj.currentUser };
});
const mockSignOut = vi.fn(async () => {
  mockAuthObj.currentUser = null;
});

const mockDbObj = { name: 'mock-db' };
const mockInitializeFirestore = vi.fn(() => mockDbObj);
const mockGetFirestore = vi.fn(() => mockDbObj);

interface MockDocRef {
  path: string;
}

const mockDoc = vi.fn((_db: unknown, collection: string, id: string): MockDocRef => ({
  path: `${collection}/${id}`,
}));
const mockSetDoc = vi.fn(async (_ref: MockDocRef, _payload: unknown) => {});
const mockDeleteDoc = vi.fn(async (_ref: MockDocRef) => {});

interface SnapshotEntry {
  ref: MockDocRef;
  cb: (snap: { exists: () => boolean; data: () => unknown }) => Promise<void> | void;
  unsubscribed: boolean;
}

const activeSnapshotCallbacks: SnapshotEntry[] = [];
const mockOnSnapshot = vi.fn(
  (
    ref: MockDocRef,
    cb: (snap: { exists: () => boolean; data: () => unknown }) => Promise<void> | void
  ) => {
    const entry: SnapshotEntry = { ref, cb, unsubscribed: false };
    activeSnapshotCallbacks.push(entry);
    return () => {
      entry.unsubscribed = true;
    };
  }
);

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: mockAsyncStorage,
}));

vi.mock('expo-secure-store', () => mockSecureStore);

vi.mock('firebase/app', () => ({
  initializeApp: mockInitializeApp,
  getApps: mockGetApps,
  getApp: mockGetApp,
}));

vi.mock('firebase/auth', () => ({
  initializeAuth: mockInitializeAuth,
  getAuth: mockGetAuth,
  getReactNativePersistence: mockGetReactNativePersistence,
  signInAnonymously: mockSignInAnonymously,
  signOut: mockSignOut,
}));

vi.mock('firebase/firestore', () => ({
  initializeFirestore: mockInitializeFirestore,
  getFirestore: mockGetFirestore,
  doc: mockDoc,
  setDoc: mockSetDoc,
  deleteDoc: mockDeleteDoc,
  onSnapshot: mockOnSnapshot,
}));

async function flushMicrotasks(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await new Promise(resolveFn => setTimeout(resolveFn, 0));
}

describe('Cloud Sync Privacy Isolation & Full Data Erasure', () => {
  beforeEach(() => {
    (globalThis as Record<string, unknown>).__DEV__ = false;
    vi.resetModules();
    vi.clearAllMocks();
    asyncStore.clear();
    secureStore.clear();
    mockApps.length = 0;
    mockAuthObj.currentUser = null;
    activeSnapshotCallbacks.length = 0;
  });

  it('never initializes Firebase or sends background traffic when Cloud Sync is disabled (default)', async () => {
    const firebaseClient = await import('../firebase/firebaseClient');
    const taskStorage = await import('./taskStorage');
    const focusStorage = await import('./focusStorage');

    expect(firebaseClient.isFirebaseInitialized()).toBe(false);
    expect(mockInitializeApp).not.toHaveBeenCalled();
    expect(mockInitializeAuth).not.toHaveBeenCalled();
    expect(mockInitializeFirestore).not.toHaveBeenCalled();

    const unsubTasks = taskStorage.defaultTaskStorage.subscribeTasks!(() => {});
    const unsubLists = taskStorage.defaultListStorage.subscribeLists!(() => {});
    const unsubFocus = focusStorage.defaultFocusStorage.subscribeSessions(() => {});

    await taskStorage.defaultTaskStorage.saveTasks([
      {
        id: 't1',
        title: 'Local private task',
        date: '2026-11-22',
        recurrence: 'none',
        completedDates: [],
      },
    ]);
    await taskStorage.defaultListStorage.saveLists([
      {
        id: 'l1',
        title: 'Private checklist',
        items: [{ id: 'i1', text: 'Item', completed: false }],
      },
    ]);
    await focusStorage.defaultFocusStorage.saveSessions([
      {
        id: 'f1',
        date: '2026-11-22',
        durationSeconds: 1500,
        timestamp: 1700000000000,
      },
    ]);

    await new Promise(resolveFn => setTimeout(resolveFn, 220));

    expect(firebaseClient.isFirebaseInitialized()).toBe(false);
    expect(mockInitializeApp).not.toHaveBeenCalled();
    expect(mockSignInAnonymously).not.toHaveBeenCalled();
    expect(mockOnSnapshot).not.toHaveBeenCalled();
    expect(mockSetDoc).not.toHaveBeenCalled();

    // Local persistence still works cleanly offline
    expect(await taskStorage.defaultTaskStorage.loadTasks()).toHaveLength(1);
    expect(await taskStorage.defaultListStorage.loadLists()).toHaveLength(1);
    expect(await focusStorage.defaultFocusStorage.loadSessions()).toHaveLength(1);

    unsubTasks();
    unsubLists();
    unsubFocus();
  }, 15000);

  it('lazily initializes Firebase only after user enables Cloud Sync, and stops pushing when turned off', async () => {
    const firebaseClient = await import('../firebase/firebaseClient');
    const taskStorage = await import('./taskStorage');
    const focusStorage = await import('./focusStorage');

    const unsubTasks = taskStorage.defaultTaskStorage.subscribeTasks!(() => {});
    const unsubLists = taskStorage.defaultListStorage.subscribeLists!(() => {});
    const unsubFocus = focusStorage.defaultFocusStorage.subscribeSessions(() => {});
    await flushMicrotasks();

    expect(firebaseClient.isFirebaseInitialized()).toBe(false);

    // User explicitly enables Cloud Sync
    const key = await taskStorage.enableCloudSync();
    await flushMicrotasks();

    expect(key).toMatch(/^ZEN-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    expect(firebaseClient.isFirebaseInitialized()).toBe(true);
    expect(mockInitializeApp).toHaveBeenCalledTimes(1);
    expect(mockSignInAnonymously).toHaveBeenCalledTimes(1);
    expect(mockOnSnapshot).toHaveBeenCalledTimes(3);

    // Saving a task now pushes to Firestore
    await taskStorage.defaultTaskStorage.saveTasks([
      {
        id: 't-sync',
        title: 'Synced task',
        date: '2026-11-22',
        recurrence: 'none',
        completedDates: [],
      },
    ]);
    await new Promise(resolveFn => setTimeout(resolveFn, 220));
    expect(mockSetDoc).toHaveBeenCalledTimes(1);

    // User disables Cloud Sync: listeners detach and future saves stay local-only
    await taskStorage.disableCloudSync();
    expect(activeSnapshotCallbacks.every(entry => entry.unsubscribed)).toBe(true);

    mockSetDoc.mockClear();
    await taskStorage.defaultTaskStorage.saveTasks([
      {
        id: 't-local-again',
        title: 'Local after disable',
        date: '2026-11-22',
        recurrence: 'none',
        completedDates: [],
      },
    ]);
    await new Promise(resolveFn => setTimeout(resolveFn, 220));
    expect(mockSetDoc).not.toHaveBeenCalled();

    // Re-enabling Cloud Sync pushes offline local edits even when remote doc already exists
    await taskStorage.enableCloudSync();
    await flushMicrotasks();
    const taskSnap = activeSnapshotCallbacks.find(e => !e.unsubscribed && e.ref.path.endsWith('_tasks'));
    expect(taskSnap).toBeDefined();
    await taskSnap!.cb({
      exists: () => true,
      data: () => ({
        items: [],
        deletedIds: [],
        updatedAt: 100,
      }),
    });
    expect(mockSetDoc).toHaveBeenCalledTimes(1);

    unsubTasks();
    unsubLists();
    unsubFocus();
  });

  it('switchGlobalSyncKey rejects invalid keys without touching Firebase and enables sync on valid pairing key', async () => {
    const firebaseClient = await import('../firebase/firebaseClient');
    const taskStorage = await import('./taskStorage');
    const focusStorage = await import('./focusStorage');

    const unsubTasks = taskStorage.defaultTaskStorage.subscribeTasks!(() => {});
    const unsubLists = taskStorage.defaultListStorage.subscribeLists!(() => {});
    const unsubFocus = focusStorage.defaultFocusStorage.subscribeSessions(() => {});

    const invalidOk = await taskStorage.switchGlobalSyncKey('INVALID-KEY');
    expect(invalidOk).toBe(false);
    expect(firebaseClient.isFirebaseInitialized()).toBe(false);
    expect(mockOnSnapshot).not.toHaveBeenCalled();

    const validOk = await taskStorage.switchGlobalSyncKey('ZEN-ABCD-2345');
    await flushMicrotasks();
    const syncKeyManager = await import('./syncKeyManager');
    expect(validOk).toBe(true);
    expect(firebaseClient.isFirebaseInitialized()).toBe(true);
    expect(await syncKeyManager.getExistingSyncKey()).toBe('ZEN-ABCD-2345');
    const keyWrites =
      mockSecureStore.setItemAsync.mock.calls.length +
      mockAsyncStorage.setItem.mock.calls.filter(call => call[0] === '@zen_sync_key').length;
    expect(keyWrites).toBe(1);
    expect(mockOnSnapshot).toHaveBeenCalledTimes(3);

    unsubTasks();
    unsubLists();
    unsubFocus();
  });

  it('clearAllWorkspaceData wipes local storage, SecureStore key, Firebase docs, and signs out without resurrecting data', async () => {
    const taskStorage = await import('./taskStorage');
    const focusStorage = await import('./focusStorage');
    const syncKeyManager = await import('./syncKeyManager');

    const unsubTasks = taskStorage.defaultTaskStorage.subscribeTasks!(() => {});
    const unsubLists = taskStorage.defaultListStorage.subscribeLists!(() => {});
    const unsubFocus = focusStorage.defaultFocusStorage.subscribeSessions(() => {});

    const syncKey = await taskStorage.enableCloudSync();
    await flushMicrotasks();

    await taskStorage.defaultTaskStorage.saveTasks([
      {
        id: 't-del',
        title: 'Delete me',
        date: '2026-11-22',
        recurrence: 'none',
        completedDates: [],
      },
    ]);
    await focusStorage.defaultFocusStorage.saveSessions([
      {
        id: 'f-del',
        date: '2026-11-22',
        durationSeconds: 600,
        timestamp: 1700000000000,
      },
    ]);

    mockSetDoc.mockClear();

    // Simulate Firestore snapshot firing when deleteDoc deletes a doc (previously caused resurrection)
    mockDeleteDoc.mockImplementationOnce(async () => {
      for (const entry of activeSnapshotCallbacks) {
        if (!entry.unsubscribed) {
          await entry.cb({ exists: () => false, data: () => undefined });
        }
      }
    });

    await taskStorage.clearAllWorkspaceData();
    await new Promise(resolveFn => setTimeout(resolveFn, 220));

    // All listeners were detached BEFORE deletion, so no resurrection setDoc occurred
    expect(activeSnapshotCallbacks.every(entry => entry.unsubscribed)).toBe(true);
    expect(mockSetDoc).not.toHaveBeenCalled();

    // All 3 Firestore workspace documents were deleted and anonymous auth signed out
    const deletedPaths = mockDeleteDoc.mock.calls.map(call => call[0].path);
    expect(deletedPaths).toEqual([
      `workspaces/${syncKey}_tasks`,
      `workspaces/${syncKey}_lists`,
      `workspaces/${syncKey}_focus`,
    ]);
    expect(mockSignOut).toHaveBeenCalledTimes(1);

    // Local storage, secure key, and cloud sync opt-in flag are all cleared
    expect(await taskStorage.defaultTaskStorage.loadTasks()).toEqual([]);
    expect(await taskStorage.defaultListStorage.loadLists()).toEqual([]);
    expect(await focusStorage.defaultFocusStorage.loadSessions()).toEqual([]);
    expect(await syncKeyManager.getExistingSyncKey()).toBeNull();
    expect(await syncKeyManager.isCloudSyncEnabled()).toBe(false);
    expect(secureStore.size).toBe(0);

    unsubTasks();
    unsubLists();
    unsubFocus();
  });

  it('clearAllWorkspaceData still deletes remote Firebase docs even if user previously disabled Cloud Sync', async () => {
    const taskStorage = await import('./taskStorage');
    const syncKeyManager = await import('./syncKeyManager');

    const syncKey = await taskStorage.enableCloudSync();
    await flushMicrotasks();
    await taskStorage.disableCloudSync();

    await taskStorage.clearAllWorkspaceData();

    const deletedPaths = mockDeleteDoc.mock.calls.map(call => call[0].path);
    expect(deletedPaths).toEqual([
      `workspaces/${syncKey}_tasks`,
      `workspaces/${syncKey}_lists`,
      `workspaces/${syncKey}_focus`,
    ]);
    expect(await syncKeyManager.getExistingSyncKey()).toBeNull();
    expect(secureStore.size).toBe(0);
  });

  it('clearAllWorkspaceData does not initialize Firebase when Cloud Sync was never used', async () => {
    const firebaseClient = await import('../firebase/firebaseClient');
    const taskStorage = await import('./taskStorage');

    await taskStorage.defaultTaskStorage.saveTasks([
      {
        id: 't-local',
        title: 'Local only task',
        date: '2026-11-22',
        recurrence: 'none',
        completedDates: [],
      },
    ]);

    await taskStorage.clearAllWorkspaceData();

    expect(firebaseClient.isFirebaseInitialized()).toBe(false);
    expect(mockInitializeApp).not.toHaveBeenCalled();
    expect(mockSignInAnonymously).not.toHaveBeenCalled();
    expect(mockDeleteDoc).not.toHaveBeenCalled();
    expect(await taskStorage.defaultTaskStorage.loadTasks()).toEqual([]);
  });

  it('privacy policy translations (EN and TR) use Kanso branding, opt-in sync, and deletion disclosures', async () => {
    const { en } = await import('../../i18n/en');
    const { tr } = await import('../../i18n/tr');

    // No legacy Zen Task Calendar branding
    expect(JSON.stringify(en.privacy)).not.toMatch(/Zen Task Calendar/i);
    expect(JSON.stringify(tr.privacy)).not.toMatch(/Zen Task Calendar/i);

    // Kanso branding present in both EN and TR
    expect(en.privacy.subtitle).toContain('Kanso');
    expect(en.privacy.localBody).toContain('Kanso');
    expect(tr.privacy.subtitle).toContain('Kanso');
    expect(tr.privacy.localBody).toContain('Kanso');

    // Clear deletion and prominent support email placeholder
    expect(en.privacy.exportBody).toContain('Clear All Data');
    expect(en.privacy.exportBody).toContain('Firebase');
    expect(tr.privacy.exportBody).toContain('Tüm Verileri Sil');
    expect(tr.privacy.exportBody).toContain('Firebase');
    expect(en.privacy.contactBody).toContain('[REPLACE_WITH_SUPPORT_EMAIL@example.com]');
    expect(tr.privacy.contactBody).toContain('[DESTEK_EPOSTA_ADRESINIZ@ornek.com]');
  });
});
