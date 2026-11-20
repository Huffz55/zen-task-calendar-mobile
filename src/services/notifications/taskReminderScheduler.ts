import { addDays, format, isValid, parseISO, startOfDay } from 'date-fns';
import type { AppLanguage } from '../../i18n';
import type { Task } from '../../types';
import { matchesRecurrenceOnDate } from '../../utils/taskSchedule';
import { isValidClockTime, parseClockTime } from './reminderScheduler';

export interface TaskReminderNotificationClient {
  scheduleTaskReminder(
    taskId: string,
    taskTitle: string,
    triggerDate: Date,
    language?: AppLanguage
  ): Promise<string | null>;
  cancelTaskReminder(taskId: string): Promise<void>;
  reconcileTaskReminders?(activeTaskIds: Set<string>): Promise<void>;
}

const MAX_RECURRENCE_LOOKAHEAD_DAYS = 400;

/**
 * Computes the next upcoming local Date when a task's reminder should fire,
 * honoring completion state, excluded dates, end dates, and recurrence rules.
 * Returns null if the task has no valid reminder or no future uncompleted occurrence.
 */
export function computeNextTaskReminderDate(task: Task, now: Date = new Date()): Date | null {
  if (!task || task.isArchived || task.isInbox || !task.reminderTime || !isValidClockTime(task.reminderTime)) {
    return null;
  }

  const startDate = parseISO(task.date);
  if (!isValid(startDate)) return null;

  const { hour, minute } = parseClockTime(task.reminderTime, '09:00');
  const completedSet = new Set(Array.isArray(task.completedDates) ? task.completedDates : []);
  const excludedSet = new Set(Array.isArray(task.excludedDates) ? task.excludedDates : []);

  if (task.recurrence === 'none') {
    if (completedSet.has(task.date) || excludedSet.has(task.date)) {
      return null;
    }
    if (task.endDate && task.date > task.endDate) {
      return null;
    }

    const triggerDate = new Date(
      startDate.getFullYear(),
      startDate.getMonth(),
      startDate.getDate(),
      hour,
      minute,
      0,
      0
    );
    return triggerDate.getTime() > now.getTime() ? triggerDate : null;
  }

  const todayStart = startOfDay(now);
  const startDay = startOfDay(startDate);
  let cursor = todayStart.getTime() < startDay.getTime() ? startDay : todayStart;

  for (let i = 0; i < MAX_RECURRENCE_LOOKAHEAD_DAYS; i++) {
    const dateStr = format(cursor, 'yyyy-MM-dd');
    if (task.endDate && dateStr > task.endDate) {
      return null;
    }

    if (
      !excludedSet.has(dateStr) &&
      !completedSet.has(dateStr) &&
      matchesRecurrenceOnDate(task.recurrence, startDate, cursor)
    ) {
      const triggerDate = new Date(
        cursor.getFullYear(),
        cursor.getMonth(),
        cursor.getDate(),
        hour,
        minute,
        0,
        0
      );
      if (triggerDate.getTime() > now.getTime()) {
        return triggerDate;
      }
    }

    cursor = addDays(cursor, 1);
  }

  return null;
}

/**
 * Coordinates per-task reminder scheduling and cancellation against task state changes.
 * Deduplicates redundant OS scheduling calls using an in-memory signature map.
 */
export function createTaskReminderCoordinator(notifications: TaskReminderNotificationClient) {
  const scheduledSignatures = new Map<string, string>();
  let hasReconciledOrphans = false;

  async function syncTasks(tasks: Task[], language?: AppLanguage, now: Date = new Date()): Promise<void> {
    const activeIdsWithReminder = new Set<string>();

    for (const task of tasks) {
      const nextDate = computeNextTaskReminderDate(task, now);
      if (!nextDate) {
        if (scheduledSignatures.has(task.id) || task.reminderTime) {
          scheduledSignatures.delete(task.id);
          await notifications.cancelTaskReminder(task.id);
        }
        continue;
      }

      activeIdsWithReminder.add(task.id);
      const signature = `${nextDate.getTime()}|${task.title}|${language ?? ''}`;
      if (scheduledSignatures.get(task.id) === signature) {
        continue;
      }

      const scheduledId = await notifications.scheduleTaskReminder(task.id, task.title, nextDate, language);
      if (scheduledId !== null) {
        scheduledSignatures.set(task.id, signature);
      }
    }

    for (const trackedTaskId of Array.from(scheduledSignatures.keys())) {
      if (!activeIdsWithReminder.has(trackedTaskId)) {
        scheduledSignatures.delete(trackedTaskId);
        await notifications.cancelTaskReminder(trackedTaskId);
      }
    }

    if (!hasReconciledOrphans && notifications.reconcileTaskReminders) {
      hasReconciledOrphans = true;
      await notifications.reconcileTaskReminders(activeIdsWithReminder);
    }
  }

  async function cancelForTask(taskId: string): Promise<void> {
    scheduledSignatures.delete(taskId);
    await notifications.cancelTaskReminder(taskId);
  }

  function reset(): void {
    scheduledSignatures.clear();
    hasReconciledOrphans = false;
  }

  return {
    syncTasks,
    cancelForTask,
    reset,
  };
}
