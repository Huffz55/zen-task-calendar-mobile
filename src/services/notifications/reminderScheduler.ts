import type { AppLanguage } from '../../i18n';

export const SETTINGS_MORNING_KEY = '@noteapp_setting_morning_summary';
export const SETTINGS_EVENING_KEY = '@noteapp_setting_evening_winddown';
export const SETTINGS_MORNING_TIME_KEY = '@noteapp_setting_morning_time';
export const SETTINGS_EVENING_TIME_KEY = '@noteapp_setting_evening_time';

export const DEFAULT_MORNING_TIME = '09:00';
export const DEFAULT_EVENING_TIME = '20:30';

const TIME_HH_MM_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isValidClockTime(value: unknown): value is string {
  return typeof value === 'string' && TIME_HH_MM_REGEX.test(value);
}

export function formatClockTime(hour: number, minute: number): string {
  const safeHour = ((Math.floor(hour) % 24) + 24) % 24;
  const safeMinute = ((Math.floor(minute) % 60) + 60) % 60;
  return `${String(safeHour).padStart(2, '0')}:${String(safeMinute).padStart(2, '0')}`;
}

export function parseClockTime(
  value: string | null | undefined,
  fallback: string
): { hour: number; minute: number; formatted: string } {
  const resolved = isValidClockTime(value) ? value : isValidClockTime(fallback) ? fallback : '09:00';
  const [hStr, mStr] = resolved.split(':');
  const hour = parseInt(hStr, 10);
  const minute = parseInt(mStr, 10);
  return { hour, minute, formatted: resolved };
}

export interface ReminderPreferences {
  morningBriefingEnabled: boolean;
  eveningReviewEnabled: boolean;
  morningTime: string;
  eveningTime: string;
}

export interface ReminderStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

export interface ReminderNotificationClient {
  scheduleDailySummary(hour: number, minute: number, taskCount: number, language?: AppLanguage): Promise<string | null>;
  scheduleEveningWindDown(hour: number, minute: number, pendingCount: number, language?: AppLanguage): Promise<string | null>;
  cancelMorningBriefing(): Promise<void>;
  cancelEveningReview(): Promise<void>;
}

interface SyncTaskStateParams {
  isLoaded: boolean;
  morningBriefingEnabled: boolean;
  eveningReviewEnabled: boolean;
  morningTime?: string;
  eveningTime?: string;
  totalTodayTasks: number;
  pendingTodayTasks: number;
  language?: AppLanguage;
}

/**
 * Coordinates persisted reminder preferences and custom schedules with OS notification scheduling.
 * Uses per-channel monotonic generation tokens so stale async schedules triggered
 * right before a user turns a reminder OFF or changes its time are cancelled cleanly.
 */
export function createReminderCoordinator(
  storage: ReminderStorage,
  notifications: ReminderNotificationClient
) {
  let morningSeq = 0;
  let eveningSeq = 0;
  let cachedMorningTime = DEFAULT_MORNING_TIME;
  let cachedEveningTime = DEFAULT_EVENING_TIME;

  async function safeGetFlag(key: string): Promise<boolean> {
    try {
      const value = await storage.getItem(key);
      return value === 'true';
    } catch {
      return false;
    }
  }

  async function safeSetFlag(key: string, enabled: boolean): Promise<void> {
    try {
      await storage.setItem(key, String(enabled));
    } catch {
      // Ignore storage write failure so cancellation can still proceed
    }
  }

  async function safeGetTime(key: string, fallback: string): Promise<string> {
    try {
      const value = await storage.getItem(key);
      return isValidClockTime(value) ? value : fallback;
    } catch {
      return fallback;
    }
  }

  async function safeSetTime(key: string, timeStr: string): Promise<void> {
    try {
      await storage.setItem(key, timeStr);
    } catch {
      // Ignore storage write failure
    }
  }

  async function loadPreferences(): Promise<ReminderPreferences> {
    const [morningBriefingEnabled, eveningReviewEnabled, morningTime, eveningTime] = await Promise.all([
      safeGetFlag(SETTINGS_MORNING_KEY),
      safeGetFlag(SETTINGS_EVENING_KEY),
      safeGetTime(SETTINGS_MORNING_TIME_KEY, DEFAULT_MORNING_TIME),
      safeGetTime(SETTINGS_EVENING_TIME_KEY, DEFAULT_EVENING_TIME),
    ]);
    cachedMorningTime = morningTime;
    cachedEveningTime = eveningTime;
    return {
      morningBriefingEnabled,
      eveningReviewEnabled,
      morningTime,
      eveningTime,
    };
  }

  async function scheduleMorningAt(
    seq: number,
    timeStr: string,
    totalTodayTasks: number,
    language?: AppLanguage
  ): Promise<boolean> {
    const { hour, minute } = parseClockTime(timeStr, DEFAULT_MORNING_TIME);
    const scheduledId =
      language !== undefined
        ? await notifications.scheduleDailySummary(hour, minute, totalTodayTasks, language)
        : await notifications.scheduleDailySummary(hour, minute, totalTodayTasks);
    if (seq !== morningSeq) {
      await notifications.cancelMorningBriefing();
      return false;
    }
    return scheduledId !== null;
  }

  async function scheduleEveningAt(
    seq: number,
    timeStr: string,
    pendingTodayTasks: number,
    language?: AppLanguage
  ): Promise<boolean> {
    const { hour, minute } = parseClockTime(timeStr, DEFAULT_EVENING_TIME);
    const scheduledId =
      language !== undefined
        ? await notifications.scheduleEveningWindDown(hour, minute, pendingTodayTasks, language)
        : await notifications.scheduleEveningWindDown(hour, minute, pendingTodayTasks);
    if (seq !== eveningSeq) {
      await notifications.cancelEveningReview();
      return false;
    }
    return scheduledId !== null;
  }

  async function setMorningEnabled(
    enabled: boolean,
    totalTodayTasks: number,
    language?: AppLanguage,
    timeOverride?: string
  ): Promise<boolean> {
    const seq = ++morningSeq;
    await safeSetFlag(SETTINGS_MORNING_KEY, enabled);

    if (!enabled) {
      await notifications.cancelMorningBriefing();
      return false;
    }

    if (seq !== morningSeq) {
      await notifications.cancelMorningBriefing();
      return false;
    }

    const timeStr = isValidClockTime(timeOverride) ? timeOverride : cachedMorningTime;
    return scheduleMorningAt(seq, timeStr, totalTodayTasks, language);
  }

  async function setEveningEnabled(
    enabled: boolean,
    pendingTodayTasks: number,
    language?: AppLanguage,
    timeOverride?: string
  ): Promise<boolean> {
    const seq = ++eveningSeq;
    await safeSetFlag(SETTINGS_EVENING_KEY, enabled);

    if (!enabled) {
      await notifications.cancelEveningReview();
      return false;
    }

    if (seq !== eveningSeq) {
      await notifications.cancelEveningReview();
      return false;
    }

    const timeStr = isValidClockTime(timeOverride) ? timeOverride : cachedEveningTime;
    return scheduleEveningAt(seq, timeStr, pendingTodayTasks, language);
  }

  async function setMorningTime(
    nextTime: string,
    enabled: boolean,
    totalTodayTasks: number,
    language?: AppLanguage
  ): Promise<string> {
    const resolved = parseClockTime(nextTime, DEFAULT_MORNING_TIME).formatted;
    cachedMorningTime = resolved;
    const seq = ++morningSeq;
    await safeSetTime(SETTINGS_MORNING_TIME_KEY, resolved);

    if (enabled && (await safeGetFlag(SETTINGS_MORNING_KEY)) && seq === morningSeq) {
      await scheduleMorningAt(seq, resolved, totalTodayTasks, language);
    }
    return resolved;
  }

  async function setEveningTime(
    nextTime: string,
    enabled: boolean,
    pendingTodayTasks: number,
    language?: AppLanguage
  ): Promise<string> {
    const resolved = parseClockTime(nextTime, DEFAULT_EVENING_TIME).formatted;
    cachedEveningTime = resolved;
    const seq = ++eveningSeq;
    await safeSetTime(SETTINGS_EVENING_TIME_KEY, resolved);

    if (enabled && (await safeGetFlag(SETTINGS_EVENING_KEY)) && seq === eveningSeq) {
      await scheduleEveningAt(seq, resolved, pendingTodayTasks, language);
    }
    return resolved;
  }

  async function syncForTaskState(params: SyncTaskStateParams): Promise<void> {
    if (!params.isLoaded) {
      return;
    }

    const mSeq = morningSeq;
    const eSeq = eveningSeq;
    const persisted = await loadPreferences();

    const shouldScheduleMorning =
      params.morningBriefingEnabled && persisted.morningBriefingEnabled && mSeq === morningSeq;
    const shouldScheduleEvening =
      params.eveningReviewEnabled && persisted.eveningReviewEnabled && eSeq === eveningSeq;

    const morningTime = isValidClockTime(params.morningTime) ? params.morningTime : persisted.morningTime;
    const eveningTime = isValidClockTime(params.eveningTime) ? params.eveningTime : persisted.eveningTime;

    if (shouldScheduleMorning) {
      await scheduleMorningAt(mSeq, morningTime, params.totalTodayTasks, params.language);
    } else if (mSeq === morningSeq) {
      await notifications.cancelMorningBriefing();
    }

    if (shouldScheduleEvening) {
      await scheduleEveningAt(eSeq, eveningTime, params.pendingTodayTasks, params.language);
    } else if (eSeq === eveningSeq) {
      await notifications.cancelEveningReview();
    }
  }

  async function resetAll(): Promise<void> {
    morningSeq++;
    eveningSeq++;
    cachedMorningTime = DEFAULT_MORNING_TIME;
    cachedEveningTime = DEFAULT_EVENING_TIME;
    await Promise.all([
      safeSetFlag(SETTINGS_MORNING_KEY, false),
      safeSetFlag(SETTINGS_EVENING_KEY, false),
      safeSetTime(SETTINGS_MORNING_TIME_KEY, DEFAULT_MORNING_TIME),
      safeSetTime(SETTINGS_EVENING_TIME_KEY, DEFAULT_EVENING_TIME),
    ]);
    await Promise.all([
      notifications.cancelMorningBriefing(),
      notifications.cancelEveningReview(),
    ]);
  }

  return {
    loadPreferences,
    setMorningEnabled,
    setEveningEnabled,
    setMorningTime,
    setEveningTime,
    syncForTaskState,
    resetAll,
  };
}
