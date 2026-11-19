import type { AppLanguage } from '../../i18n';

export const SETTINGS_MORNING_KEY = '@noteapp_setting_morning_summary';
export const SETTINGS_EVENING_KEY = '@noteapp_setting_evening_winddown';

export interface ReminderPreferences {
  morningBriefingEnabled: boolean;
  eveningReviewEnabled: boolean;
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

export interface SyncTaskStateParams {
  isLoaded: boolean;
  morningBriefingEnabled: boolean;
  eveningReviewEnabled: boolean;
  totalTodayTasks: number;
  pendingTodayTasks: number;
  language?: AppLanguage;
}

/**
 * Coordinates persisted reminder preferences with OS notification scheduling.
 * Uses per-channel monotonic generation tokens so stale async schedules triggered
 * right before a user turns a reminder OFF are cancelled rather than left active.
 */
export function createReminderCoordinator(
  storage: ReminderStorage,
  notifications: ReminderNotificationClient
) {
  let morningSeq = 0;
  let eveningSeq = 0;

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

  async function loadPreferences(): Promise<ReminderPreferences> {
    const [morningBriefingEnabled, eveningReviewEnabled] = await Promise.all([
      safeGetFlag(SETTINGS_MORNING_KEY),
      safeGetFlag(SETTINGS_EVENING_KEY),
    ]);
    return {
      morningBriefingEnabled,
      eveningReviewEnabled,
    };
  }

  async function setMorningEnabled(
    enabled: boolean,
    totalTodayTasks: number,
    language?: AppLanguage
  ): Promise<boolean> {
    const seq = ++morningSeq;
    await safeSetFlag(SETTINGS_MORNING_KEY, enabled);

    if (!enabled) {
      await notifications.cancelMorningBriefing();
      return false;
    }

    const scheduledId =
      language !== undefined
        ? await notifications.scheduleDailySummary(9, 0, totalTodayTasks, language)
        : await notifications.scheduleDailySummary(9, 0, totalTodayTasks);
    if (seq !== morningSeq) {
      await notifications.cancelMorningBriefing();
      return false;
    }

    return scheduledId !== null;
  }

  async function setEveningEnabled(
    enabled: boolean,
    pendingTodayTasks: number,
    language?: AppLanguage
  ): Promise<boolean> {
    const seq = ++eveningSeq;
    await safeSetFlag(SETTINGS_EVENING_KEY, enabled);

    if (!enabled) {
      await notifications.cancelEveningReview();
      return false;
    }

    const scheduledId =
      language !== undefined
        ? await notifications.scheduleEveningWindDown(20, 30, pendingTodayTasks, language)
        : await notifications.scheduleEveningWindDown(20, 30, pendingTodayTasks);
    if (seq !== eveningSeq) {
      await notifications.cancelEveningReview();
      return false;
    }

    return scheduledId !== null;
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

    if (shouldScheduleMorning) {
      if (params.language !== undefined) {
        await notifications.scheduleDailySummary(9, 0, params.totalTodayTasks, params.language);
      } else {
        await notifications.scheduleDailySummary(9, 0, params.totalTodayTasks);
      }
      if (mSeq !== morningSeq) {
        await notifications.cancelMorningBriefing();
      }
    } else if (mSeq === morningSeq) {
      await notifications.cancelMorningBriefing();
    }

    if (shouldScheduleEvening) {
      if (params.language !== undefined) {
        await notifications.scheduleEveningWindDown(20, 30, params.pendingTodayTasks, params.language);
      } else {
        await notifications.scheduleEveningWindDown(20, 30, params.pendingTodayTasks);
      }
      if (eSeq !== eveningSeq) {
        await notifications.cancelEveningReview();
      }
    } else if (eSeq === eveningSeq) {
      await notifications.cancelEveningReview();
    }
  }

  async function resetAll(): Promise<void> {
    morningSeq++;
    eveningSeq++;
    await Promise.all([
      safeSetFlag(SETTINGS_MORNING_KEY, false),
      safeSetFlag(SETTINGS_EVENING_KEY, false),
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
    syncForTaskState,
    resetAll,
  };
}
