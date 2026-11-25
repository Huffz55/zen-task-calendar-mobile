import { safeJsonParse, sanitizeText } from '../services/validation/validator';

export const ZEN_TIMER_STATE_KEY = '@noteapp_zen_timer_state_v1';
export const DEFAULT_FOCUS_MINUTES = 30;
export const DEFAULT_FOCUS_SECONDS = DEFAULT_FOCUS_MINUTES * 60;

export interface PersistedFocusTask {
  id: string;
  title: string;
}

export interface PersistedZenTimerState {
  initialTime: number;
  isRunning: boolean;
  endTimeMs: number | null;
  pausedRemainingMs: number | null;
  activeTask?: PersistedFocusTask | null;
}

export type ReconciledZenTimer =
  | {
      status: 'running';
      initialTime: number;
      remainingMs: number;
      endTimeMs: number;
      activeTask: PersistedFocusTask | null;
    }
  | {
      status: 'completed';
      initialTime: number;
      elapsedSeconds: number;
      activeTask: PersistedFocusTask | null;
    }
  | {
      status: 'paused';
      initialTime: number;
      remainingMs: number;
      activeTask: PersistedFocusTask | null;
    }
  | {
      status: 'idle';
      initialTime: number;
      activeTask: PersistedFocusTask | null;
    };

export interface TimerStateStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

const MIN_INITIAL_SECONDS = 60;
const MAX_INITIAL_SECONDS = 24 * 60 * 60;

function sanitizeFocusTask(raw: unknown): PersistedFocusTask | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const rec = raw as Record<string, unknown>;
  const id = typeof rec.id === 'string' ? rec.id.trim() : '';
  const title = sanitizeText(rec.title, 200);
  if (!id || !title || id.length > 100) return null;
  return { id, title };
}

/**
 * Reconciles a persisted Zen Timer snapshot against the current wall-clock timestamp.
 * Handles Android Process Death cleanly:
 * - Still running -> restores exact remaining milliseconds from `endTimeMs - nowMs`
 * - Finished while app process was dead -> returns `completed` once so the session is logged
 * - Paused mid-session -> restores remaining milliseconds so the user can resume
 */
export function reconcilePersistedTimer(
  raw: unknown,
  nowMs: number = Date.now(),
  defaultSeconds = DEFAULT_FOCUS_SECONDS
): ReconciledZenTimer {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { status: 'idle', initialTime: defaultSeconds, activeTask: null };
  }

  const candidate = raw as Record<string, unknown>;
  const initialTime =
    typeof candidate.initialTime === 'number' &&
    Number.isFinite(candidate.initialTime) &&
    candidate.initialTime >= MIN_INITIAL_SECONDS &&
    candidate.initialTime <= MAX_INITIAL_SECONDS
      ? Math.floor(candidate.initialTime)
      : defaultSeconds;

  const activeTask = sanitizeFocusTask(candidate.activeTask);
  const isRunning = candidate.isRunning === true;
  const endTimeMs =
    typeof candidate.endTimeMs === 'number' && Number.isFinite(candidate.endTimeMs) && candidate.endTimeMs > 0
      ? Math.floor(candidate.endTimeMs)
      : null;
  const pausedRemainingMs =
    typeof candidate.pausedRemainingMs === 'number' &&
    Number.isFinite(candidate.pausedRemainingMs) &&
    candidate.pausedRemainingMs > 0
      ? Math.min(initialTime * 1000, Math.floor(candidate.pausedRemainingMs))
      : null;

  if (isRunning && endTimeMs !== null) {
    const remainingMs = endTimeMs - nowMs;
    if (remainingMs <= 0) {
      return {
        status: 'completed',
        initialTime,
        elapsedSeconds: initialTime,
        activeTask,
      };
    }
    return {
      status: 'running',
      initialTime,
      remainingMs: Math.min(initialTime * 1000, remainingMs),
      endTimeMs,
      activeTask,
    };
  }

  if (!isRunning && pausedRemainingMs !== null && pausedRemainingMs < initialTime * 1000) {
    return {
      status: 'paused',
      initialTime,
      remainingMs: pausedRemainingMs,
      activeTask,
    };
  }

  return {
    status: 'idle',
    initialTime,
    activeTask,
  };
}

export async function loadPersistedTimerState(
  storage: TimerStateStorage,
  nowMs: number = Date.now(),
  defaultSeconds = DEFAULT_FOCUS_SECONDS
): Promise<ReconciledZenTimer | null> {
  try {
    const raw = await storage.getItem(ZEN_TIMER_STATE_KEY);
    if (!raw) return null;
    const parsed = safeJsonParse<unknown>(raw, 16 * 1024);
    if (!parsed) {
      await storage.removeItem(ZEN_TIMER_STATE_KEY).catch(() => {});
      return null;
    }
    return reconcilePersistedTimer(parsed, nowMs, defaultSeconds);
  } catch {
    return null;
  }
}

export async function savePersistedTimerState(
  storage: TimerStateStorage,
  state: PersistedZenTimerState
): Promise<void> {
  try {
    await storage.setItem(ZEN_TIMER_STATE_KEY, JSON.stringify(state));
  } catch {
    // Non-fatal: timer continues running in memory
  }
}

export async function clearPersistedTimerState(storage: TimerStateStorage): Promise<void> {
  try {
    await storage.removeItem(ZEN_TIMER_STATE_KEY);
  } catch {
    // Ignore storage cleanup errors
  }
}
