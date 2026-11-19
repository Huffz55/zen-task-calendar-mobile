import { describe, expect, it } from 'vitest';
import {
  atomicWriteJson,
  getBackupKey,
  safeReadJsonArray,
  type AtomicStorageBackend,
} from './atomicStorage';
import { validateTask } from '../validation/validator';

function createMemoryBackend(
  initial: Record<string, string> = {},
  options?: { setDelayMs?: number }
): AtomicStorageBackend & { map: Map<string, string>; writeLog: string[] } {
  const map = new Map<string, string>(Object.entries(initial));
  const writeLog: string[] = [];

  return {
    map,
    writeLog,
    async getItem(key: string) {
      return map.has(key) ? map.get(key)! : null;
    },
    async setItem(key: string, value: string) {
      if (options?.setDelayMs) {
        await new Promise(resolve => setTimeout(resolve, options.setDelayMs));
      }
      map.set(key, value);
      writeLog.push(`${key}:${value}`);
    },
    async removeItem(key: string) {
      map.delete(key);
    },
  };
}

const sampleTask = (id: string, title: string) => ({
  id,
  title,
  date: '2026-11-19',
  recurrence: 'none' as const,
  completedDates: [],
});

describe('atomicStorage', () => {
  it('writes backup copy before primary copy and reads validated items back', async () => {
    const backend = createMemoryBackend();
    const key = '@test_tasks';
    const payload = [sampleTask('t1', 'First task')];

    await atomicWriteJson(backend, key, payload);

    expect(backend.writeLog[0].startsWith(`${getBackupKey(key)}:`)).toBe(true);
    expect(backend.writeLog[1].startsWith(`${key}:`)).toBe(true);

    const loaded = await safeReadJsonArray(backend, key, validateTask, 100);
    expect(loaded).toHaveLength(1);
    expect(loaded[0].id).toBe('t1');
    expect(loaded[0].title).toBe('First task');
  });

  it('recovers intact backup data when primary JSON is corrupted and repairs primary key', async () => {
    const key = '@test_tasks';
    const validBackup = JSON.stringify([sampleTask('t-safe', 'Recovered task')]);
    const backend = createMemoryBackend({
      [key]: '{"truncated": [invalid json',
      [getBackupKey(key)]: validBackup,
    });

    const loaded = await safeReadJsonArray(backend, key, validateTask, 100);

    expect(loaded).toHaveLength(1);
    expect(loaded[0].id).toBe('t-safe');
    expect(loaded[0].title).toBe('Recovered task');
    expect(backend.map.get(key)).toBe(validBackup);
  });

  it('quarantines corrupt payload and falls back to empty array when both primary and backup are invalid', async () => {
    const key = '@test_tasks';
    const backend = createMemoryBackend({
      [key]: 'not-valid-json',
      [getBackupKey(key)]: '{"not": "an-array"}',
    });

    const loaded = await safeReadJsonArray(backend, key, validateTask, 100);

    expect(loaded).toEqual([]);
    expect(backend.map.has(key)).toBe(false);
  });

  it('serializes concurrent writes on the same key in exact submission order', async () => {
    const key = '@concurrent_key';
    const backend = createMemoryBackend({}, { setDelayMs: 5 });

    const p1 = atomicWriteJson(backend, key, [sampleTask('t1', 'Older')]);
    const p2 = atomicWriteJson(backend, key, [sampleTask('t2', 'Newer')]);
    await Promise.all([p1, p2]);

    const loaded = await safeReadJsonArray(backend, key, validateTask, 100);
    expect(loaded).toHaveLength(1);
    expect(loaded[0].id).toBe('t2');
    expect(loaded[0].title).toBe('Newer');
  });
});
