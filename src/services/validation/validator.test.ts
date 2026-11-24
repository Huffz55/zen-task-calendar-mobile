import { describe, it, expect } from 'vitest';
import {
  isValidDateString,
  sanitizeText,
  validateCustomList,
  validateFocusSession,
  validateTask,
} from './validator';

describe('mobile validator', () => {
  it('validates YYYY-MM-DD date strings', () => {
    expect(isValidDateString('2026-11-15')).toBe(true);
    expect(isValidDateString('2026-02-31')).toBe(false);
    expect(isValidDateString('15-11-2026')).toBe(false);
    expect(isValidDateString(null)).toBe(false);
  });

  it('sanitizes control characters and respects maxLen', () => {
    expect(sanitizeText('  Buy\u0000 Milk\u0007  ')).toBe('Buy Milk');
    expect(sanitizeText('abcdef', 3)).toBe('abc');
    expect(sanitizeText(123)).toBe('');
  });

  it('validates and normalizes valid task objects', () => {
    const task = validateTask({
      id: '  t-1 ',
      title: '  Read\u0000 book ',
      date: '2026-11-15',
      recurrence: 'weekdays',
      tag: 'health',
      completedDates: ['2026-11-15', 'bad-date'],
      isPinned: true,
      estimatedMinutes: 30.8,
      notes: '  Chapter 1\nKey points  ',
      reminderTime: '09:30',
      subtasks: [
        { id: 's1', title: 'Chapter 1', isCompleted: 1 },
        { id: '', title: 'Missing id', isCompleted: false },
      ],
    });

    expect(task).not.toBeNull();
    expect(task?.id).toBe('t-1');
    expect(task?.title).toBe('Read book');
    expect(task?.recurrence).toBe('weekdays');
    expect(task?.tag).toBe('health');
    expect(task?.completedDates).toEqual(['2026-11-15']);
    expect(task?.estimatedMinutes).toBe(30);
    expect(task?.isPinned).toBe(true);
    expect(task?.notes).toBe('Chapter 1\nKey points');
    expect(task?.reminderTime).toBe('09:30');
    expect(task?.subtasks).toEqual([{ id: 's1', title: 'Chapter 1', isCompleted: true }]);

    const monthlyInvalidTime = validateTask({
      id: 't-2',
      title: 'Pay bills',
      date: '2026-11-15',
      recurrence: 'monthly',
      reminderTime: '25:99',
    });
    expect(monthlyInvalidTime?.recurrence).toBe('monthly');
    expect(monthlyInvalidTime?.reminderTime).toBeUndefined();
  });

  it('rejects malformed task objects', () => {
    expect(validateTask(null)).toBeNull();
    expect(validateTask([])).toBeNull();
    expect(validateTask({ id: '', title: 'A', date: '2026-11-15' })).toBeNull();
    expect(validateTask({ id: '1', title: '   ', date: '2026-11-15' })).toBeNull();
    expect(validateTask({ id: '1', title: 'A', date: '2026-99-99' })).toBeNull();
  });

  it('validates custom checklists, preserves folder, and ignores invalid items', () => {
    const list = validateCustomList({
      id: 'l-1',
      title: 'Groceries',
      folder: '  Market  ',
      items: [
        { id: 'i1', text: 'Apples', completed: false },
        { id: 42, text: 'Invalid', completed: true },
        { id: 'i2', text: '   ', completed: false },
      ],
    });

    expect(list).toEqual({
      id: 'l-1',
      title: 'Groceries',
      folder: 'Market',
      items: [{ id: 'i1', text: 'Apples', completed: false }],
    });
  });

  it('migrates legacy AsyncStorage task, list, and focus session schemas gracefully', () => {
    const legacyTask = validateTask({
      id: 'legacy-1',
      title: 'Old completed task',
      date: '2025-05-01T14:30:00.000Z',
      completed: true,
      updatedAt: '2025-05-01T15:00:00.000Z',
    });
    expect(legacyTask).not.toBeNull();
    expect(legacyTask?.date).toBe('2025-05-01');
    expect(legacyTask?.completedDates).toEqual(['2025-05-01']);
    expect(legacyTask?.updatedAt).toBe(Date.parse('2025-05-01T15:00:00.000Z'));

    const legacyList = validateCustomList({
      id: 'legacy-list-1',
      title: 'Legacy Checklist',
      items: [{ id: 'li-1', title: 'Legacy item', isCompleted: true }],
    });
    expect(legacyList?.items).toEqual([{ id: 'li-1', text: 'Legacy item', completed: true }]);

    const legacySession = validateFocusSession({
      id: 'fs-legacy',
      date: '2025-05-01T09:00:00.000Z',
      duration: 1500,
      createdAt: '2025-05-01T09:25:00.000Z',
    });
    expect(legacySession).toEqual({
      id: 'fs-legacy',
      date: '2025-05-01',
      durationSeconds: 1500,
      timestamp: Date.parse('2025-05-01T09:25:00.000Z'),
    });
  });
});
