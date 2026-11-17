import type { Task, CustomList, ListItem, RecurrenceType, TaskTag, Subtask, FocusSession, CustomTag } from '../../types';
import { parseISO, isValid } from 'date-fns';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const SAFE_ID_REGEX = /^[A-Za-z0-9_.:-]{1,100}$/;
const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;
const VALID_RECURRENCES: Set<RecurrenceType> = new Set(['none', 'daily', 'weekly', 'biweekly']);
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

export const MAX_BACKUP_BYTES = 5 * 1024 * 1024; // 5 MB DoS guard
export const MAX_TASKS_LIMIT = 5000;
export const MAX_LISTS_LIMIT = 500;
export const MAX_FOCUS_SESSIONS_LIMIT = 10000;
export const MAX_SUBTASKS_PER_TASK = 100;
export const MAX_LIST_ITEMS = 500;
export const MAX_DATES_LIST = 2000;

export function isValidDateString(str: unknown): str is string {
  if (typeof str !== 'string' || !DATE_REGEX.test(str)) return false;
  const parsed = parseISO(str);
  return isValid(parsed);
}

export function sanitizeId(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed || FORBIDDEN_KEYS.has(trimmed)) return null;
  if (!SAFE_ID_REGEX.test(trimmed)) return null;
  return trimmed;
}

export function sanitizeText(str: unknown, maxLen = 500): string {
  if (typeof str !== 'string') return '';
  return str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim().slice(0, maxLen);
}

/**
 * Parses JSON safely and strips prototype-pollution keys (__proto__, constructor, prototype).
 */
export function safeJsonParse<T = unknown>(raw: string, maxBytes = MAX_BACKUP_BYTES): T | null {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > maxBytes) {
    return null;
  }
  try {
    return JSON.parse(raw, (key, value) => {
      if (FORBIDDEN_KEYS.has(key)) {
        return undefined;
      }
      return value;
    }) as T;
  } catch {
    return null;
  }
}

export function sanitizeDeletedIds(raw: unknown, maxItems = 2000): string[] {
  if (!Array.isArray(raw)) return [];
  const valid: string[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const clean = sanitizeId(item);
    if (clean && !seen.has(clean)) {
      seen.add(clean);
      valid.push(clean);
      if (valid.length >= maxItems) break;
    }
  }
  return valid;
}

export function validateTask(raw: unknown): Task | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const candidate = raw as Record<string, unknown>;

  if (
    Object.prototype.hasOwnProperty.call(candidate, '__proto__') ||
    Object.prototype.hasOwnProperty.call(candidate, 'constructor') ||
    Object.prototype.hasOwnProperty.call(candidate, 'prototype')
  ) {
    return null;
  }

  const id = sanitizeId(candidate.id);
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
  if (typeof candidate.tag === 'string') {
    const cleanTag = sanitizeText(candidate.tag, 32).replace(/[\r\n]/g, '');
    if (cleanTag) {
      tag = cleanTag as TaskTag;
    }
  }

  const completedDates: string[] = Array.isArray(candidate.completedDates)
    ? candidate.completedDates.filter(isValidDateString).slice(0, MAX_DATES_LIST)
    : [];

  const excludedDates: string[] | undefined = Array.isArray(candidate.excludedDates)
    ? candidate.excludedDates.filter(isValidDateString).slice(0, MAX_DATES_LIST)
    : undefined;

  const endDate: string | undefined = isValidDateString(candidate.endDate)
    ? candidate.endDate
    : undefined;

  let subtasks: Subtask[] | undefined = undefined;
  if (Array.isArray(candidate.subtasks)) {
    const validSubs: Subtask[] = [];
    for (const sub of candidate.subtasks.slice(0, MAX_SUBTASKS_PER_TASK)) {
      if (sub && typeof sub === 'object' && !Array.isArray(sub)) {
        const subRecord = sub as Record<string, unknown>;
        const sId = sanitizeId(subRecord.id);
        const sTitle = sanitizeText(subRecord.title, 200);
        if (sId && sTitle) {
          validSubs.push({
            id: sId,
            title: sTitle,
            isCompleted: Boolean(subRecord.isCompleted),
          });
        }
      }
    }
    subtasks = validSubs;
  }

  const focusedSeconds =
    typeof candidate.focusedSeconds === 'number' &&
    Number.isFinite(candidate.focusedSeconds) &&
    candidate.focusedSeconds >= 0 &&
    candidate.focusedSeconds <= 8640000
      ? Math.floor(candidate.focusedSeconds)
      : undefined;

  const isPinned = Boolean(candidate.isPinned);
  const isInbox = Boolean(candidate.isInbox);
  const isArchived = Boolean(candidate.isArchived);
  const archivedAt = isValidDateString(candidate.archivedAt) ? candidate.archivedAt : undefined;
  const estimatedMinutes =
    typeof candidate.estimatedMinutes === 'number' &&
    Number.isFinite(candidate.estimatedMinutes) &&
    candidate.estimatedMinutes > 0 &&
    candidate.estimatedMinutes <= 1440
      ? Math.floor(candidate.estimatedMinutes)
      : undefined;

  const updatedAt =
    typeof candidate.updatedAt === 'number' &&
    Number.isFinite(candidate.updatedAt) &&
    candidate.updatedAt > 0
      ? Math.floor(candidate.updatedAt)
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
    subtasks,
    focusedSeconds,
    isPinned: isPinned || undefined,
    isInbox: isInbox || undefined,
    isArchived: isArchived || undefined,
    archivedAt,
    estimatedMinutes,
    ...(updatedAt ? { updatedAt } : {}),
  };
}

export function validateCustomList(raw: unknown): CustomList | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const candidate = raw as Record<string, unknown>;

  if (
    Object.prototype.hasOwnProperty.call(candidate, '__proto__') ||
    Object.prototype.hasOwnProperty.call(candidate, 'constructor') ||
    Object.prototype.hasOwnProperty.call(candidate, 'prototype')
  ) {
    return null;
  }

  const id = sanitizeId(candidate.id);
  if (!id) return null;

  const title = sanitizeText(candidate.title, 200);
  if (!title) return null;

  const folder = sanitizeText(candidate.folder, 60) || undefined;

  const rawItems = Array.isArray(candidate.items) ? candidate.items.slice(0, MAX_LIST_ITEMS) : [];
  const items: ListItem[] = [];

  for (const item of rawItems) {
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      const itemRecord = item as Record<string, unknown>;
      const itemId = sanitizeId(itemRecord.id);
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

  const updatedAt =
    typeof candidate.updatedAt === 'number' &&
    Number.isFinite(candidate.updatedAt) &&
    candidate.updatedAt > 0
      ? Math.floor(candidate.updatedAt)
      : undefined;

  return {
    id,
    title,
    ...(folder ? { folder } : {}),
    items,
    ...(updatedAt ? { updatedAt } : {}),
  };
}

export function validateFocusSession(raw: unknown): FocusSession | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const candidate = raw as Record<string, unknown>;

  if (
    Object.prototype.hasOwnProperty.call(candidate, '__proto__') ||
    Object.prototype.hasOwnProperty.call(candidate, 'constructor') ||
    Object.prototype.hasOwnProperty.call(candidate, 'prototype')
  ) {
    return null;
  }

  const id = sanitizeId(candidate.id);
  if (!id) return null;

  const date = isValidDateString(candidate.date) ? candidate.date : null;
  if (!date) return null;

  if (
    typeof candidate.durationSeconds !== 'number' ||
    !Number.isFinite(candidate.durationSeconds) ||
    candidate.durationSeconds <= 0 ||
    candidate.durationSeconds > 86400
  ) {
    return null;
  }

  if (
    typeof candidate.timestamp !== 'number' ||
    !Number.isFinite(candidate.timestamp) ||
    candidate.timestamp <= 0
  ) {
    return null;
  }

  const taskId = candidate.taskId !== undefined ? sanitizeId(candidate.taskId) ?? undefined : undefined;
  const taskTitle = candidate.taskTitle !== undefined ? sanitizeText(candidate.taskTitle, 200) || undefined : undefined;

  return {
    id,
    date,
    durationSeconds: Math.floor(candidate.durationSeconds),
    timestamp: Math.floor(candidate.timestamp),
    ...(taskId ? { taskId } : {}),
    ...(taskTitle ? { taskTitle } : {}),
  };
}

export function validateCustomTag(raw: unknown): CustomTag | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const candidate = raw as Record<string, unknown>;

  const id = sanitizeId(candidate.id);
  const label = sanitizeText(candidate.label, 24).replace(/[\r\n]/g, '');
  const color = typeof candidate.color === 'string' && HEX_COLOR_REGEX.test(candidate.color.trim())
    ? candidate.color.trim()
    : null;

  if (!id || !label || !color) return null;
  return { id, label, color };
}
