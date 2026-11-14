import { differenceInDays, isValid, parseISO } from 'date-fns';
import type { DailyTask, Task } from '../types';

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

      const diffDays = differenceInDays(targetDate, startDate);

      if (task.recurrence === 'none') {
        return dateStr === task.date;
      }
      if (task.recurrence === 'daily') {
        return true;
      }
      if (task.recurrence === 'weekly') {
        return diffDays % 7 === 0;
      }
      if (task.recurrence === 'biweekly') {
        return diffDays % 14 === 0;
      }
      return false;
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
      isEvening: task.isEvening,
      isGhost: task.isGhost,
      isInbox: task.isInbox,
      estimatedMinutes: task.estimatedMinutes,
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
