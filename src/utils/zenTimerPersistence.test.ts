import { describe, expect, it } from 'vitest';
import {
  clearPersistedTimerState,
  DEFAULT_FOCUS_MINUTES,
  DEFAULT_FOCUS_SECONDS,
  loadPersistedTimerState,
  reconcilePersistedTimer,
  savePersistedTimerState,
  ZEN_TIMER_STATE_KEY,
  type TimerStateStorage,
} from './zenTimerPersistence';

function createMemoryStorage(): TimerStateStorage & { data: Record<string, string> } {
  const data: Record<string, string> = {};
  return {
    data,
    async getItem(key: string) {
      return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null;
    },
    async setItem(key: string, value: string) {
      data[key] = value;
    },
    async removeItem(key: string) {
      delete data[key];
    },
  };
}

describe('zenTimerPersistence (Android Process Death recovery)', () => {
  it('restores an active timer with exact wall-clock remaining milliseconds', () => {
    const now = 1_700_000_000_000;
    const endTimeMs = now + 12 * 60 * 1000 + 34_000;

    const reconciled = reconcilePersistedTimer(
      {
        initialTime: 1500,
        isRunning: true,
        endTimeMs,
        pausedRemainingMs: null,
        activeTask: { id: 'task-1', title: 'Write audit report' },
      },
      now
    );

    expect(reconciled).toEqual({
      status: 'running',
      initialTime: 1500,
      remainingMs: 12 * 60 * 1000 + 34_000,
      endTimeMs,
      activeTask: { id: 'task-1', title: 'Write audit report' },
    });
  });

  it('detects a session that completed while the Android process was killed', () => {
    const now = 1_700_000_900_000;
    const reconciled = reconcilePersistedTimer(
      {
        initialTime: 1500,
        isRunning: true,
        endTimeMs: now - 5_000,
        pausedRemainingMs: null,
        activeTask: { id: 'task-2', title: 'Deep work' },
      },
      now
    );

    expect(reconciled).toEqual({
      status: 'completed',
      initialTime: 1500,
      elapsedSeconds: 1500,
      activeTask: { id: 'task-2', title: 'Deep work' },
    });
  });

  it('restores a paused mid-session timer accurately', () => {
    const reconciled = reconcilePersistedTimer(
      {
        initialTime: 1500,
        isRunning: false,
        endTimeMs: null,
        pausedRemainingMs: 600_000,
        activeTask: null,
      },
      1_700_000_000_000
    );

    expect(reconciled).toEqual({
      status: 'paused',
      initialTime: 1500,
      remainingMs: 600_000,
      activeTask: null,
    });
  });

  it('persists, loads, clears, and recovers safely from corrupted JSON', async () => {
    const storage = createMemoryStorage();
    const now = 1_700_000_000_000;

    await savePersistedTimerState(storage, {
      initialTime: 2700,
      isRunning: true,
      endTimeMs: now + 90_000,
      pausedRemainingMs: null,
      activeTask: { id: 't-9', title: 'Study' },
    });

    const loaded = await loadPersistedTimerState(storage, now);
    expect(loaded?.status).toBe('running');
    if (loaded?.status === 'running') {
      expect(loaded.remainingMs).toBe(90_000);
      expect(loaded.activeTask?.id).toBe('t-9');
    }

    await clearPersistedTimerState(storage);
    expect(await loadPersistedTimerState(storage, now)).toBeNull();

    // Corrupted JSON is self-healed without crashing
    storage.data[ZEN_TIMER_STATE_KEY] = '{broken-json';
    expect(await loadPersistedTimerState(storage, now)).toBeNull();
    expect(storage.data[ZEN_TIMER_STATE_KEY]).toBeUndefined();
  });

  it('defaults initialTime to 30 minutes (1800s) when unpersisted or missing', () => {
    expect(DEFAULT_FOCUS_MINUTES).toBe(30);
    expect(DEFAULT_FOCUS_SECONDS).toBe(1800);
    expect(reconcilePersistedTimer(null)).toEqual({
      status: 'idle',
      initialTime: 1800,
      activeTask: null,
    });
    expect(reconcilePersistedTimer({})).toEqual({
      status: 'idle',
      initialTime: 1800,
      activeTask: null,
    });
  });
});
