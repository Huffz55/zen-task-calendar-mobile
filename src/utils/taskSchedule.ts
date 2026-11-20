import {
  differenceInCalendarDays,
  format,
  getDaysInMonth,
  isSameDay,
  isValid,
  parseISO,
  subDays,
} from 'date-fns';
import type { DailyTask, RecurrenceType, Task } from '../types';

/**
 * Evaluates whether a recurrence rule starting on `startDate` occurs on `targetDate`.
 * Caller must ensure `targetDate >= startDate` (calendar day) when checking future occurrences.
 */
export function matchesRecurrenceOnDate(
  recurrence: RecurrenceType,
  startDate: Date,
  targetDate: Date
): boolean {
  if (recurrence === 'none') {
    return isSameDay(targetDate, startDate);
  }
  if (recurrence === 'daily') {
    return true;
  }
  if (recurrence === 'weekdays') {
    const dayOfWeek = targetDate.getDay();
    return dayOfWeek >= 1 && dayOfWeek <= 5;
  }
  if (recurrence === 'weekly') {
    return differenceInCalendarDays(targetDate, startDate) % 7 === 0;
  }
  if (recurrence === 'biweekly') {
    return differenceInCalendarDays(targetDate, startDate) % 14 === 0;
  }
  if (recurrence === 'monthly') {
    const expectedDay = Math.min(startDate.getDate(), getDaysInMonth(targetDate));
    return targetDate.getDate() === expectedDay;
  }
  return false;
}

/**
 * Computes and sorts active DailyTask entries for a given YYYY-MM-DD date string.
 * Excludes archived/inbox tasks, honors recurrence rules, excludedDates, and endDate,
 * and sorts incomplete tasks first and pinned tasks at the top.
 */
export function getDailyTasksForDate(tasks: Task[], dateStr: string): DailyTask[] {
  const targetDate = parseISO(dateStr);
  if (!isValid(targetDate)) return [];

  const mapped: DailyTask[] = tasks
    .filter(task => {
      if (!task || task.isArchived || task.isInbox || !task.date || typeof task.date !== 'string') {
        return false;
      }

      const startDate = parseISO(task.date);
      if (!isValid(startDate)) return false;

      if (dateStr < task.date) return false;
      if (task.excludedDates && task.excludedDates.includes(dateStr)) return false;
      if (task.endDate && dateStr > task.endDate) return false;

      return matchesRecurrenceOnDate(task.recurrence, startDate, targetDate);
    })
    .map(task => ({
      id: `${task.id}-${dateStr}`,
      taskId: task.id,
      title: task.title,
      isCompleted: (Array.isArray(task.completedDates) ? task.completedDates : []).includes(dateStr),
      recurrence: task.recurrence,
      tag: task.tag,
      subtasks: task.subtasks,
      focusedSeconds: task.focusedSeconds,
      isPinned: task.isPinned,
      isInbox: task.isInbox,
      estimatedMinutes: task.estimatedMinutes,
      notes: task.notes,
      reminderTime: task.reminderTime,
      isArchived: task.isArchived,
    }));

  return mapped.sort((a, b) => {
    if (a.isCompleted !== b.isCompleted) {
      return a.isCompleted ? 1 : -1;
    }
    if (a.isPinned !== b.isPinned) {
      return a.isPinned ? -1 : 1;
    }
    return 0;
  });
}

interface ParsedStreakTask {
  date: string;
  startDate: Date;
  endDate?: string;
  recurrence: Task['recurrence'];
  completedSet: Set<string>;
  excludedSet: Set<string> | null;
}

const RECURRING_TYPES = new Set<RecurrenceType>([
  'daily',
  'weekdays',
  'weekly',
  'biweekly',
  'monthly',
]);

/**
 * Computes consecutive perfect days ending today or yesterday without
 * allocating or sorting task arrays per day across the 365-day window.
 */
export function computeCurrentStreak(tasks: Task[], today: Date = new Date()): number {
  const nonRecurringByDate = new Map<string, ParsedStreakTask[]>();
  const recurringTasks: ParsedStreakTask[] = [];

  for (const task of tasks) {
    if (!task || task.isArchived || task.isInbox || !task.date || typeof task.date !== 'string') {
      continue;
    }
    const startDate = parseISO(task.date);
    if (!isValid(startDate)) continue;

    const entry: ParsedStreakTask = {
      date: task.date,
      startDate,
      endDate: task.endDate,
      recurrence: task.recurrence,
      completedSet: new Set(Array.isArray(task.completedDates) ? task.completedDates : []),
      excludedSet: task.excludedDates && task.excludedDates.length > 0 ? new Set(task.excludedDates) : null,
    };

    if (task.recurrence === 'none') {
      const bucket = nonRecurringByDate.get(task.date);
      if (bucket) bucket.push(entry);
      else nonRecurringByDate.set(task.date, [entry]);
    } else if (RECURRING_TYPES.has(task.recurrence)) {
      recurringTasks.push(entry);
    }
  }

  const isDayPerfect = (dateObj: Date, dateStr: string): boolean => {
    let activeCount = 0;
    let completedCount = 0;

    const singleTasks = nonRecurringByDate.get(dateStr);
    if (singleTasks) {
      for (const t of singleTasks) {
        if (t.excludedSet?.has(dateStr)) continue;
        if (t.endDate && dateStr > t.endDate) continue;
        activeCount++;
        if (t.completedSet.has(dateStr)) completedCount++;
      }
    }

    for (const t of recurringTasks) {
      if (dateStr < t.date) continue;
      if (t.excludedSet?.has(dateStr)) continue;
      if (t.endDate && dateStr > t.endDate) continue;
      if (!matchesRecurrenceOnDate(t.recurrence, t.startDate, dateObj)) continue;

      activeCount++;
      if (t.completedSet.has(dateStr)) completedCount++;
    }

    return activeCount > 0 && completedCount === activeCount;
  };

  let streak = 0;
  const todayStr = format(today, 'yyyy-MM-dd');
  if (isDayPerfect(today, todayStr)) {
    streak++;
  }

  let checkDate = subDays(today, 1);
  for (let i = 0; i < 365; i++) {
    const dateStr = format(checkDate, 'yyyy-MM-dd');
    if (isDayPerfect(checkDate, dateStr)) {
      streak++;
      checkDate = subDays(checkDate, 1);
    } else {
      break;
    }
  }

  return streak;
}
