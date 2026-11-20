import { Task } from '../types';

function stripControlChars(raw: string): string {
  let out = '';
  for (let i = 0; i < raw.length; i++) {
    const code = raw.charCodeAt(i);
    if (code >= 32 && code !== 127) {
      out += raw[i];
    } else {
      out += ' ';
    }
  }
  return out;
}

function sanitizeIcsValue(raw: string): string {
  // Strip CR/LF/NUL to prevent iCalendar property/event injection (RFC 5545)
  return stripControlChars(raw).replace(/[\\,;]/g, ' ');
}

function sanitizeMarkdownInline(raw: string): string {
  // Strip line breaks and control chars so a single task cannot forge headings or blocks
  return stripControlChars(raw).trim();
}

export function generateICSContent(tasks: Task[]): string {
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  const now = new Date();
  const dtstamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;

  const events = tasks
    .filter(t => !t.isArchived)
    .map(t => {
      const cleanDate = (t.date || '').replace(/[^0-9]/g, '');
      if (!/^\d{8}$/.test(cleanDate)) return '';
      const isDone = Array.isArray(t.completedDates) && t.completedDates.length > 0;
      const status = isDone ? 'COMPLETED' : 'CONFIRMED';
      const cleanUid = (t.id || 'task').replace(/[^A-Za-z0-9_.-]/g, '_');
      const cleanTitle = sanitizeIcsValue(t.title || 'Untitled Task');
      const descParts = [];
      if (t.tag) descParts.push(`Tag: ${sanitizeIcsValue(String(t.tag))}`);
      if (t.estimatedMinutes) descParts.push(`Est: ${Math.floor(t.estimatedMinutes)}m`);
      const description = descParts.join(' | ');

      return [
        'BEGIN:VEVENT',
        `UID:${cleanUid}@kanso.app`,
        `DTSTAMP:${dtstamp}`,
        `DTSTART;VALUE=DATE:${cleanDate}`,
        `SUMMARY:${cleanTitle}`,
        description ? `DESCRIPTION:${description}` : '',
        `STATUS:${status}`,
        'END:VEVENT',
      ]
        .filter(Boolean)
        .join('\r\n');
    })
    .filter(Boolean);

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Kanso Mobile//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Kanso Calendar',
    ...events,
    'END:VCALENDAR',
  ].join('\r\n');
}

export function generateMarkdownContent(tasks: Task[]): string {
  const tasksByDate = new Map<string, Task[]>();
  const unscheduledTasks: Task[] = [];

  for (const t of tasks) {
    if (t.isArchived) continue;
    if (t.isInbox || !t.date) {
      unscheduledTasks.push(t);
      continue;
    }
    const current = tasksByDate.get(t.date) || [];
    current.push(t);
    tasksByDate.set(t.date, current);
  }

  const sortedDates = Array.from(tasksByDate.keys()).sort();
  const lines: string[] = [
    '# Kanso Notes & Tasks Export',
    `*Exported on ${new Date().toISOString().split('T')[0]} - Obsidian & Local-first Ready*`,
    '',
  ];

  for (const date of sortedDates) {
    lines.push(`## ${date}`);
    const dateTasks = tasksByDate.get(date) || [];
    for (const t of dateTasks) {
      const isDone = Array.isArray(t.completedDates) && t.completedDates.includes(date);
      const mark = isDone ? 'x' : ' ';
      let meta = '';
      if (t.tag) meta += ` #${sanitizeMarkdownInline(String(t.tag))}`;
      if (t.estimatedMinutes) meta += ` (${Math.floor(t.estimatedMinutes)}m)`;
      lines.push(`- [${mark}] ${sanitizeMarkdownInline(t.title || 'Untitled')}${meta}`);
    }
    lines.push('');
  }

  if (unscheduledTasks.length > 0) {
    lines.push('## Unscheduled');
    for (const t of unscheduledTasks) {
      let meta = '';
      if (t.tag) meta += ` #${sanitizeMarkdownInline(String(t.tag))}`;
      if (t.estimatedMinutes) meta += ` (${Math.floor(t.estimatedMinutes)}m)`;
      lines.push(`- [ ] ${sanitizeMarkdownInline(t.title || 'Untitled')}${meta}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
