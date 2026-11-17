import { describe, it, expect } from 'vitest';
import { isValidDateString, sanitizeText, validateCustomList, validateTask } from './validator';

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
      recurrence: 'daily',
      tag: 'health',
      completedDates: ['2026-11-15', 'bad-date'],
      isPinned: true,
      estimatedMinutes: 30.8,
      subtasks: [
        { id: 's1', title: 'Chapter 1', isCompleted: 1 },
        { id: '', title: 'Missing id', isCompleted: false },
      ],
    });

    expect(task).not.toBeNull();
    expect(task?.id).toBe('t-1');
    expect(task?.title).toBe('Read book');
    expect(task?.recurrence).toBe('daily');
    expect(task?.tag).toBe('health');
    expect(task?.completedDates).toEqual(['2026-11-15']);
    expect(task?.estimatedMinutes).toBe(30);
    expect(task?.isPinned).toBe(true);
    expect(task?.subtasks).toEqual([{ id: 's1', title: 'Chapter 1', isCompleted: true }]);
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
});
