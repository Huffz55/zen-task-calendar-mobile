import { describe, expect, it, vi } from 'vitest';
import type { Task } from '../../types';
import {
  computeNextTaskReminderDate,
  createTaskReminderCoordinator,
  type TaskReminderNotificationClient,
} from './taskReminderScheduler';

function createMockTaskNotificationClient() {
  const scheduled = new Map<string, { title: string; date: Date }>();
  const client: TaskReminderNotificationClient = {
    scheduleTaskReminder: vi.fn(async (taskId, title, date) => {
      scheduled.set(taskId, { title, date });
      return `task-reminder-${taskId}`;
    }),
    cancelTaskReminder: vi.fn(async taskId => {
      scheduled.delete(taskId);
    }),
    reconcileTaskReminders: vi.fn(async () => {}),
  };
  return { client, scheduled };
}

describe('taskReminderScheduler', () => {
  it('computes exact trigger date for upcoming single task and returns null when past or completed', () => {
    const now = new Date(2026, 10, 20, 10, 0, 0, 0); // Fri Nov 20, 2026 10:00
    const upcomingTask: Task = {
      id: 't1',
      title: 'Call dentist',
      date: '2026-11-20',
      recurrence: 'none',
      completedDates: [],
      reminderTime: '14:30',
    };

    const nextDate = computeNextTaskReminderDate(upcomingTask, now);
    expect(nextDate).not.toBeNull();
    expect(nextDate?.getFullYear()).toBe(2026);
    expect(nextDate?.getMonth()).toBe(10);
    expect(nextDate?.getDate()).toBe(20);
    expect(nextDate?.getHours()).toBe(14);
    expect(nextDate?.getMinutes()).toBe(30);

    expect(
      computeNextTaskReminderDate({ ...upcomingTask, completedDates: ['2026-11-20'] }, now)
    ).toBeNull();
    expect(
      computeNextTaskReminderDate({ ...upcomingTask, reminderTime: '09:30' }, now)
    ).toBeNull();
    expect(
      computeNextTaskReminderDate({ ...upcomingTask, isInbox: true }, now)
    ).toBeNull();
  });

  it('skips weekends for weekdays recurrence and advances to next valid occurrence when completed today', () => {
    const fridayAfternoon = new Date(2026, 10, 20, 15, 0, 0, 0); // Fri Nov 20, 2026 15:00
    const weekdayTask: Task = {
      id: 'wk1',
      title: 'Morning standup',
      date: '2026-11-16',
      recurrence: 'weekdays',
      completedDates: [],
      reminderTime: '09:15',
    };

    const nextWeekday = computeNextTaskReminderDate(weekdayTask, fridayAfternoon);
    expect(nextWeekday?.getFullYear()).toBe(2026);
    expect(nextWeekday?.getMonth()).toBe(10);
    expect(nextWeekday?.getDate()).toBe(23); // Monday Nov 23
    expect(nextWeekday?.getHours()).toBe(9);
    expect(nextWeekday?.getMinutes()).toBe(15);

    const fridayMorning = new Date(2026, 10, 20, 8, 0, 0, 0);
    const completedToday = computeNextTaskReminderDate(
      { ...weekdayTask, completedDates: ['2026-11-20'] },
      fridayMorning
    );
    expect(completedToday?.getDate()).toBe(23); // Skips Friday, moves to Monday
  });

  it('computes monthly recurrence with month-end clamping and honors endDate', () => {
    const now = new Date(2026, 1, 1, 8, 0, 0, 0); // Feb 1, 2026
    const monthEndTask: Task = {
      id: 'm1',
      title: 'Monthly invoice',
      date: '2026-01-31',
      recurrence: 'monthly',
      completedDates: [],
      reminderTime: '11:00',
    };

    const nextDate = computeNextTaskReminderDate(monthEndTask, now);
    expect(nextDate?.getMonth()).toBe(1); // February
    expect(nextDate?.getDate()).toBe(28);
    expect(nextDate?.getHours()).toBe(11);

    expect(
      computeNextTaskReminderDate({ ...monthEndTask, endDate: '2026-02-15' }, now)
    ).toBeNull();
  });

  it('schedules, deduplicates, and cancels task reminders on completion or deletion', async () => {
    const now = new Date(2026, 10, 20, 10, 0, 0, 0);
    const { client, scheduled } = createMockTaskNotificationClient();
    const coordinator = createTaskReminderCoordinator(client);

    const task: Task = {
      id: 't-rem',
      title: 'Submit report',
      date: '2026-11-20',
      recurrence: 'none',
      completedDates: [],
      reminderTime: '16:00',
    };

    await coordinator.syncTasks([task], 'en', now);
    expect(scheduled.has('t-rem')).toBe(true);
    expect(client.scheduleTaskReminder).toHaveBeenCalledTimes(1);
    expect(client.reconcileTaskReminders).toHaveBeenCalledTimes(1);

    // Identical state should not trigger duplicate OS scheduling
    await coordinator.syncTasks([task], 'en', now);
    expect(client.scheduleTaskReminder).toHaveBeenCalledTimes(1);

    // Completing task cancels its scheduled reminder
    await coordinator.syncTasks([{ ...task, completedDates: ['2026-11-20'] }], 'en', now);
    expect(scheduled.has('t-rem')).toBe(false);
    expect(client.cancelTaskReminder).toHaveBeenCalledWith('t-rem');

    // Re-opening task reschedules it; deleting cancels it
    await coordinator.syncTasks([task], 'en', now);
    expect(scheduled.has('t-rem')).toBe(true);
    await coordinator.syncTasks([], 'en', now);
    expect(scheduled.has('t-rem')).toBe(false);
  });
});
