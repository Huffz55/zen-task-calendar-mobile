import { Task, CustomList, ListItem, RecurrenceType, TaskTag } from '../../types';
import { parseISO, isValid } from 'date-fns';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const VALID_RECURRENCES: Set<RecurrenceType> = new Set(['none', 'daily', 'weekly', 'biweekly']);
const VALID_TAGS: Set<TaskTag> = new Set(['work', 'personal', 'health', 'ideas', 'priority']);

export function isValidDateString(str: unknown): str is string {
  if (typeof str !== 'string' || !DATE_REGEX.test(str)) return false;
  const parsed = parseISO(str);
  return isValid(parsed);
}

export function sanitizeText(str: unknown, maxLen = 500): string {
  if (typeof str !== 'string') return '';
  return str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim().slice(0, maxLen);
}

export function validateTask(raw: unknown): Task | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const candidate = raw as Record<string, unknown>;

  const id = typeof candidate.id === 'string' && candidate.id.trim().length > 0
    ? candidate.id.trim().slice(0, 100)
    : null;
  if (!id) return null;

  const title = sanitizeText(candidate.title);
  if (!title) return null;

  const date = isValidDateString(candidate.date) ? candidate.date : null;
  if (!date) return null;

  let recurrence: RecurrenceType = 'none';
  if (typeof candidate.recurrence === 'string' && VALID_RECURRENCES.has(candidate.recurrence as RecurrenceType)) {
    recurrence = candidate.recurrence as RecurrenceType;
  }

  let tag: TaskTag | undefined = undefined;
  if (typeof candidate.tag === 'string' && VALID_TAGS.has(candidate.tag as TaskTag)) {
    tag = candidate.tag as TaskTag;
  }

  const completedDates: string[] = Array.isArray(candidate.completedDates)
    ? candidate.completedDates.filter(isValidDateString)
    : [];

  const excludedDates: string[] | undefined = Array.isArray(candidate.excludedDates)
    ? candidate.excludedDates.filter(isValidDateString)
    : undefined;

  const endDate: string | undefined = isValidDateString(candidate.endDate)
    ? candidate.endDate
    : undefined;

  return {
    id,
    title,
    date,
    recurrence,
    tag,
    completedDates,
    excludedDates,
    endDate,
  };
}

export function validateCustomList(raw: unknown): CustomList | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const candidate = raw as Record<string, unknown>;

  const id = typeof candidate.id === 'string' && candidate.id.trim().length > 0
    ? candidate.id.trim().slice(0, 100)
    : null;
  if (!id) return null;

  const title = sanitizeText(candidate.title, 200);
  if (!title) return null;

  const rawItems = Array.isArray(candidate.items) ? candidate.items : [];
  const items: ListItem[] = [];

  for (const item of rawItems) {
    if (item && typeof item === 'object') {
      const itemRecord = item as Record<string, unknown>;
      const itemId = typeof itemRecord.id === 'string' ? itemRecord.id.slice(0, 100) : null;
      const text = sanitizeText(itemRecord.text, 300);
      if (itemId && text) {
        items.push({
          id: itemId,
          text,
          completed: Boolean(itemRecord.completed),
        });
      }
    }
  }

  return {
    id,
    title,
    items,
  };
}
