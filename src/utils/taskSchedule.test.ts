import { describe, it, expect } from 'vitest';
import type { Task } from '../types';
import { computeCurrentStreak, getDailyTasksForDate } from './taskSchedule';

describe('mobile getDailyTasksForDate', () => {
  const sampleTasks: Task[] = [
    {
      id: 'normal',
      title: 'Regular task',
      date: '2026-11-15',
      recurrence: 'none',
      completedDates: [],
    },
    {
      id: 'pinned',
      title: 'Pinned task',
      date: '2026-11-15',
      recurrence: 'none',
      completedDates: [],
      isPinned: true,
    },
    {
      id: 'done-pinned',
      title: 'Completed pinned task',
      date: '2026-11-15',
      recurrence: 'none',
      completedDates: ['2026-11-15'],
      isPinned: true,
    },
    {
      id: 'daily',
      title: 'Daily meditation',
      date: '2026-11-10',
      recurrence: 'daily',
      completedDates: [],
      excludedDates: ['2026-11-16'],
      endDate: '2026-11-17',
    },
    {
      id: 'weekly',
      title: 'Weekly sync',
      date: '2026-11-01',
      recurrence: 'weekly',
      completedDates: [],
    },
    {
      id: 'biweekly',
      title: 'Biweekly review',
      date: '2026-11-01',
      recurrence: 'biweekly',
      completedDates: [],
    },
    {
      id: 'inbox',
      title: 'Inbox note',
      date: '2026-11-15',
      recurrence: 'none',
      completedDates: [],
      isInbox: true,
    },
    {
      id: 'archived',
      title: 'Archived note',
      date: '2026-11-15',
      recurrence: 'none',
      completedDates: [],
      isArchived: true,
    },
  ];

  it('orders incomplete pinned first, then incomplete normal, then completed', () => {
    const result = getDailyTasksForDate(sampleTasks, '2026-11-15');
    expect(result.map(t => t.taskId)).toEqual(['pinned', 'normal', 'daily', 'weekly', 'biweekly', 'done-pinned']);
  });

  it('excludes inbox, archived, excludedDates, and dates after endDate', () => {
    const day16 = getDailyTasksForDate(sampleTasks, '2026-11-16');
    expect(day16.some(t => t.taskId === 'daily')).toBe(false);
    expect(day16.some(t => t.taskId === 'inbox')).toBe(false);
    expect(day16.some(t => t.taskId === 'archived')).toBe(false);

    const day18 = getDailyTasksForDate(sampleTasks, '2026-11-18');
    expect(day18.some(t => t.taskId === 'daily')).toBe(false);
  });

  it('evaluates weekly and biweekly intervals accurately', () => {
    const week1 = getDailyTasksForDate(sampleTasks, '2026-11-08');
    expect(week1.map(t => t.taskId)).toContain('weekly');
    expect(week1.map(t => t.taskId)).not.toContain('biweekly');

    const week2 = getDailyTasksForDate(sampleTasks, '2026-11-15');
    expect(week2.map(t => t.taskId)).toContain('weekly');
    expect(week2.map(t => t.taskId)).toContain('biweekly');
  });

  it('returns empty array for invalid date input', () => {
    expect(getDailyTasksForDate(sampleTasks, 'invalid')).toEqual([]);
  });

  it('supports weekdays (Mon-Fri) recurrence accurately', () => {
    const weekdayTask: Task = {
      id: 'wkday',
      title: 'Standup',
      date: '2026-11-18', // Wednesday
      recurrence: 'weekdays',
      completedDates: [],
    };

    expect(getDailyTasksForDate([weekdayTask], '2026-11-17')).toEqual([]); // Before start
    expect(getDailyTasksForDate([weekdayTask], '2026-11-18').map(t => t.taskId)).toEqual(['wkday']); // Wed
    expect(getDailyTasksForDate([weekdayTask], '2026-11-19').map(t => t.taskId)).toEqual(['wkday']); // Thu
    expect(getDailyTasksForDate([weekdayTask], '2026-11-20').map(t => t.taskId)).toEqual(['wkday']); // Fri
    expect(getDailyTasksForDate([weekdayTask], '2026-11-21')).toEqual([]); // Saturday
    expect(getDailyTasksForDate([weekdayTask], '2026-11-22')).toEqual([]); // Sunday
    expect(getDailyTasksForDate([weekdayTask], '2026-11-23').map(t => t.taskId)).toEqual(['wkday']); // Monday
  });

  it('supports monthly recurrence with month-end clamping and leap years', () => {
    const midMonth: Task = {
      id: 'mid',
      title: 'Mid month check-in',
      date: '2026-10-15',
      recurrence: 'monthly',
      completedDates: [],
    };
    const monthEnd: Task = {
      id: 'end',
      title: 'Month-end close',
      date: '2026-01-31',
      recurrence: 'monthly',
      completedDates: [],
    };

    expect(getDailyTasksForDate([midMonth], '2026-11-15').map(t => t.taskId)).toEqual(['mid']);
    expect(getDailyTasksForDate([midMonth], '2026-11-16')).toEqual([]);

    expect(getDailyTasksForDate([monthEnd], '2026-02-28').map(t => t.taskId)).toEqual(['end']);
    expect(getDailyTasksForDate([monthEnd], '2026-03-31').map(t => t.taskId)).toEqual(['end']);
    expect(getDailyTasksForDate([monthEnd], '2026-04-30').map(t => t.taskId)).toEqual(['end']);
    expect(getDailyTasksForDate([monthEnd], '2026-04-29')).toEqual([]);
    expect(getDailyTasksForDate([monthEnd], '2028-02-29').map(t => t.taskId)).toEqual(['end']);
  });

  it('propagates notes and reminderTime onto DailyTask entries', () => {
    const detailedTask: Task = {
      id: 'detailed',
      title: 'Prepare brief',
      date: '2026-11-20',
      recurrence: 'none',
      completedDates: [],
      notes: 'Include Q4 metrics\nReview slides',
      reminderTime: '14:30',
    };

    const result = getDailyTasksForDate([detailedTask], '2026-11-20');
    expect(result[0]?.notes).toBe('Include Q4 metrics\nReview slides');
    expect(result[0]?.reminderTime).toBe('14:30');
  });
});

describe('mobile computeCurrentStreak', () => {
  it('counts consecutive perfect days ending today or yesterday while respecting exclusions and inbox/archived tasks', () => {
    const tasks: Task[] = [
      {
        id: 'daily-habit',
        title: 'Meditation',
        date: '2026-11-10',
        recurrence: 'daily',
        completedDates: ['2026-11-13', '2026-11-14', '2026-11-15'],
        excludedDates: ['2026-11-14'],
      },
      {
        id: 'single-14',
        title: 'Finish report',
        date: '2026-11-14',
        recurrence: 'none',
        completedDates: ['2026-11-14'],
      },
      {
        id: 'inbox-noise',
        title: 'Unscheduled inbox',
        date: '2026-11-15',
        recurrence: 'none',
        completedDates: [],
        isInbox: true,
      },
    ];

    // Nov 13, 14, 15 are all perfect -> streak 3 when reference is Nov 15
    expect(computeCurrentStreak(tasks, new Date('2026-11-15T12:00:00Z'))).toBe(3);

    // If Nov 16 has uncompleted daily-habit, yesterday (15), 14, 13 still yield streak 3
    expect(computeCurrentStreak(tasks, new Date('2026-11-16T12:00:00Z'))).toBe(3);

    // Gap on Nov 16 breaks streak when reference is Nov 17
    expect(computeCurrentStreak(tasks, new Date('2026-11-17T12:00:00Z'))).toBe(0);
  });

  it('computes streak for weekdays and monthly recurring tasks', () => {
    const tasks: Task[] = [
      {
        id: 'wkday-task',
        title: 'Weekday journal',
        date: '2026-11-18', // Wed
        recurrence: 'weekdays',
        completedDates: ['2026-11-18', '2026-11-19', '2026-11-20'],
      },
      {
        id: 'monthly-task',
        title: 'Monthly review',
        date: '2026-10-20',
        recurrence: 'monthly',
        completedDates: ['2026-11-20'],
      },
    ];

    expect(computeCurrentStreak(tasks, new Date('2026-11-20T12:00:00Z'))).toBe(3);
  });
});
