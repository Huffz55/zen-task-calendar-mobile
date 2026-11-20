import { describe, it, expect } from 'vitest';
import type { Task } from '../types';
import { generateICSContent, generateMarkdownContent } from './zenExport';

const sampleTasks: Task[] = [
  {
    id: 'm1',
    title: 'Plan, sprint; review\\notes',
    date: '2026-11-15',
    recurrence: 'none',
    tag: 'work',
    completedDates: ['2026-11-15'],
    estimatedMinutes: 45,
  },
  {
    id: 'm2',
    title: 'Archived item',
    date: '2026-11-14',
    recurrence: 'none',
    completedDates: [],
    isArchived: true,
  },
  {
    id: 'm3',
    title: 'Triage thought',
    date: '2026-11-10',
    recurrence: 'none',
    completedDates: [],
    isInbox: true,
    tag: 'ideas',
  },
];

describe('mobile zenExport', () => {
  it('generates valid iCalendar events excluding archived tasks', () => {
    const ics = generateICSContent(sampleTasks);

    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('PRODID:-//Zen NoteApp Mobile//EN');
    expect(ics).toContain('UID:m1@zen.app');
    expect(ics).toContain('SUMMARY:Plan  sprint  review notes');
    expect(ics).toContain('STATUS:COMPLETED');
    expect(ics).toContain('DESCRIPTION:Tag: work | Est: 45m');
    expect(ics).not.toContain('Archived item');
  });

  it('generates Markdown grouped by date and inbox section', () => {
    const md = generateMarkdownContent(sampleTasks);

    expect(md).toContain('## 2026-11-15');
    expect(md).toContain('- [x] Plan, sprint; review\\notes #work (45m)');
    expect(md).toContain('## Inbox / Triage');
    expect(md).toContain('- [ ] Triage thought #ideas');
    expect(md).not.toContain('Archived item');
  });
});
