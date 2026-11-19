import { describe, expect, it, vi } from 'vitest';
import {
  createReminderCoordinator,
  SETTINGS_EVENING_KEY,
  SETTINGS_MORNING_KEY,
  type ReminderNotificationClient,
  type ReminderStorage,
} from './reminderScheduler';

function createMemoryStorage(initial: Record<string, string> = {}): ReminderStorage & { data: Record<string, string> } {
  const data: Record<string, string> = { ...initial };
  return {
    data,
    async getItem(key: string) {
      return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null;
    },
    async setItem(key: string, value: string) {
      data[key] = value;
    },
  };
}

function createMockNotifications() {
  const scheduled = new Set<string>();
  const client: ReminderNotificationClient = {
    scheduleDailySummary: vi.fn(async () => {
      scheduled.add('daily-summary');
      return 'daily-summary';
    }),
    scheduleEveningWindDown: vi.fn(async () => {
      scheduled.add('evening-winddown');
      return 'evening-winddown';
    }),
    cancelMorningBriefing: vi.fn(async () => {
      scheduled.delete('daily-summary');
    }),
    cancelEveningReview: vi.fn(async () => {
      scheduled.delete('evening-winddown');
    }),
  };
  return { client, scheduled };
}

describe('reminderScheduler', () => {
  it('persists false and immediately cancels Morning Briefing when turned off', async () => {
    const storage = createMemoryStorage({ [SETTINGS_MORNING_KEY]: 'true' });
    const { client, scheduled } = createMockNotifications();
    scheduled.add('daily-summary');
    const coordinator = createReminderCoordinator(storage, client);

    const active = await coordinator.setMorningEnabled(false, 4);

    expect(active).toBe(false);
    expect(storage.data[SETTINGS_MORNING_KEY]).toBe('false');
    expect(client.cancelMorningBriefing).toHaveBeenCalledTimes(1);
    expect(client.scheduleDailySummary).not.toHaveBeenCalled();
    expect(scheduled.has('daily-summary')).toBe(false);
  });

  it('persists false and immediately cancels Evening Review when turned off', async () => {
    const storage = createMemoryStorage({ [SETTINGS_EVENING_KEY]: 'true' });
    const { client, scheduled } = createMockNotifications();
    scheduled.add('evening-winddown');
    const coordinator = createReminderCoordinator(storage, client);

    const active = await coordinator.setEveningEnabled(false, 2);

    expect(active).toBe(false);
    expect(storage.data[SETTINGS_EVENING_KEY]).toBe('false');
    expect(client.cancelEveningReview).toHaveBeenCalledTimes(1);
    expect(client.scheduleEveningWindDown).not.toHaveBeenCalled();
    expect(scheduled.has('evening-winddown')).toBe(false);
  });

  it('never re-schedules Morning Briefing or Evening Review on task updates when flags are off', async () => {
    const storage = createMemoryStorage({
      [SETTINGS_MORNING_KEY]: 'false',
      [SETTINGS_EVENING_KEY]: 'false',
    });
    const { client, scheduled } = createMockNotifications();
    // Simulate a leftover OS notification from an older version
    scheduled.add('daily-summary');
    scheduled.add('evening-winddown');
    const coordinator = createReminderCoordinator(storage, client);

    await coordinator.syncForTaskState({
      isLoaded: true,
      morningBriefingEnabled: false,
      eveningReviewEnabled: false,
      totalTodayTasks: 5,
      pendingTodayTasks: 3,
    });

    expect(client.scheduleDailySummary).not.toHaveBeenCalled();
    expect(client.scheduleEveningWindDown).not.toHaveBeenCalled();
    expect(client.cancelMorningBriefing).toHaveBeenCalledTimes(1);
    expect(client.cancelEveningReview).toHaveBeenCalledTimes(1);
    expect(scheduled.size).toBe(0);
  });

  it('respects each channel flag independently during task sync', async () => {
    const storage = createMemoryStorage({
      [SETTINGS_MORNING_KEY]: 'true',
      [SETTINGS_EVENING_KEY]: 'false',
    });
    const { client, scheduled } = createMockNotifications();
    const coordinator = createReminderCoordinator(storage, client);

    await coordinator.syncForTaskState({
      isLoaded: true,
      morningBriefingEnabled: true,
      eveningReviewEnabled: false,
      totalTodayTasks: 6,
      pendingTodayTasks: 4,
    });

    expect(client.scheduleDailySummary).toHaveBeenCalledWith(9, 0, 6);
    expect(client.scheduleEveningWindDown).not.toHaveBeenCalled();
    expect(client.cancelEveningReview).toHaveBeenCalledTimes(1);
    expect(Array.from(scheduled)).toEqual(['daily-summary']);

    // Flip to evening-only
    storage.data[SETTINGS_MORNING_KEY] = 'false';
    storage.data[SETTINGS_EVENING_KEY] = 'true';

    await coordinator.syncForTaskState({
      isLoaded: true,
      morningBriefingEnabled: false,
      eveningReviewEnabled: true,
      totalTodayTasks: 6,
      pendingTodayTasks: 2,
    });

    expect(client.cancelMorningBriefing).toHaveBeenCalledTimes(1);
    expect(client.scheduleEveningWindDown).toHaveBeenCalledWith(20, 30, 2);
    expect(Array.from(scheduled)).toEqual(['evening-winddown']);
  });

  it('does not schedule anything before hydration/loading completes', async () => {
    const storage = createMemoryStorage({
      [SETTINGS_MORNING_KEY]: 'true',
      [SETTINGS_EVENING_KEY]: 'true',
    });
    const { client } = createMockNotifications();
    const coordinator = createReminderCoordinator(storage, client);

    await coordinator.syncForTaskState({
      isLoaded: false,
      morningBriefingEnabled: true,
      eveningReviewEnabled: true,
      totalTodayTasks: 3,
      pendingTodayTasks: 3,
    });

    expect(client.scheduleDailySummary).not.toHaveBeenCalled();
    expect(client.scheduleEveningWindDown).not.toHaveBeenCalled();
  });

  it('cancels stale in-flight schedule if user turns Morning Briefing off before scheduling resolves', async () => {
    const storage = createMemoryStorage();
    const scheduled = new Set<string>();
    let resolvePendingSchedule!: (id: string) => void;

    const client: ReminderNotificationClient = {
      scheduleDailySummary: vi.fn(
        () =>
          new Promise<string>(resolve => {
            resolvePendingSchedule = id => {
              scheduled.add(id);
              resolve(id);
            };
          })
      ),
      scheduleEveningWindDown: vi.fn(async () => 'evening-winddown'),
      cancelMorningBriefing: vi.fn(async () => {
        scheduled.delete('daily-summary');
      }),
      cancelEveningReview: vi.fn(async () => {
        scheduled.delete('evening-winddown');
      }),
    };

    const coordinator = createReminderCoordinator(storage, client);
    const pendingEnable = coordinator.setMorningEnabled(true, 3);
    // Let storage write complete and scheduleDailySummary start
    await Promise.resolve();
    await Promise.resolve();

    // User immediately disables the toggle before permission/schedule finishes
    const disablePromise = coordinator.setMorningEnabled(false, 3);
    resolvePendingSchedule('daily-summary');

    const [enableResult, disableResult] = await Promise.all([pendingEnable, disablePromise]);

    expect(enableResult).toBe(false);
    expect(disableResult).toBe(false);
    expect(storage.data[SETTINGS_MORNING_KEY]).toBe('false');
    expect(scheduled.has('daily-summary')).toBe(false);
    expect(client.cancelMorningBriefing).toHaveBeenCalledTimes(2);
  });

  it('resetAll disables persisted flags and cancels both reminders', async () => {
    const storage = createMemoryStorage({
      [SETTINGS_MORNING_KEY]: 'true',
      [SETTINGS_EVENING_KEY]: 'true',
    });
    const { client, scheduled } = createMockNotifications();
    scheduled.add('daily-summary');
    scheduled.add('evening-winddown');
    const coordinator = createReminderCoordinator(storage, client);

    await coordinator.resetAll();

    expect(storage.data[SETTINGS_MORNING_KEY]).toBe('false');
    expect(storage.data[SETTINGS_EVENING_KEY]).toBe('false');
    expect(client.cancelMorningBriefing).toHaveBeenCalledTimes(1);
    expect(client.cancelEveningReview).toHaveBeenCalledTimes(1);
    expect(scheduled.size).toBe(0);
  });
});
