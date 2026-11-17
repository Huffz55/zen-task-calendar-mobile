import { describe, it, expect } from 'vitest';
import { getSecureRandomInt, generateSecureId } from '../../utils/cryptoRandom';
import { generateSyncKey, isValidSyncKey } from '../storage/syncKeyFormat';
import { cleanUndefined, mergeItemsWithTombstones } from '../storage/syncEngine';
import {
  validateTask,
  validateCustomList,
  validateFocusSession,
  validateCustomTag,
  safeJsonParse,
  sanitizeDeletedIds,
  MAX_DATES_LIST,
  MAX_SUBTASKS_PER_TASK,
} from '../validation/validator';
import { generateICSContent, generateMarkdownContent } from '../../utils/zenExport';

describe('Security & Penetration Test Suite', () => {
  describe('CSPRNG & Sync Key Hardening', () => {
    it('generates high-entropy unambiguous ZEN-XXXX-XXXX keys without collisions', () => {
      const seen = new Set<string>();
      for (let i = 0; i < 200; i++) {
        const key = generateSyncKey();
        expect(isValidSyncKey(key)).toBe(true);
        expect(key).not.toMatch(/[01OI]/);
        seen.add(key);
      }
      expect(seen.size).toBe(200);
    });

    it('rejects path-traversal, Firestore collection escapes, and malformed sync keys', () => {
      const payloads = [
        '',
        '   ',
        'ZEN-../.-AAAA',
        'ZEN-AAAA-BBBB/tasks',
        'ZEN-AAAA-BBBB?foo=bar',
        'ZEN-AAAA-BBBB\n',
        'ZEN-AAA-BBBB',
        'ZEN-AAAA-BBBBB',
        '../../workspaces',
        '*',
      ];
      for (const payload of payloads) {
        expect(isValidSyncKey(payload)).toBe(false);
      }
    });

    it('enforces valid bounds on getSecureRandomInt and produces unique secure IDs', () => {
      expect(() => getSecureRandomInt(0)).toThrow(RangeError);
      expect(() => getSecureRandomInt(-1)).toThrow(RangeError);
      expect(() => getSecureRandomInt(257)).toThrow(RangeError);

      for (let i = 0; i < 50; i++) {
        const val = getSecureRandomInt(30);
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThan(30);
      }

      const ids = new Set(Array.from({ length: 100 }, () => generateSecureId()));
      expect(ids.size).toBe(100);
    });
  });

  describe('Prototype Pollution & Malicious JSON Defense', () => {
    it('strips __proto__, constructor, and prototype keys in safeJsonParse and cleanUndefined', () => {
      const maliciousJson =
        '{"__proto__":{"polluted":true},"constructor":{"prototype":{"pwned":true}},"tasks":[{"id":"t1","title":"Safe","date":"2026-11-17","completedDates":[]}]}';

      const parsed = safeJsonParse<Record<string, unknown>>(maliciousJson);
      expect(parsed).not.toBeNull();
      expect(({} as Record<string, unknown>).polluted).toBeUndefined();
      expect(({} as Record<string, unknown>).pwned).toBeUndefined();
      expect(Object.prototype.hasOwnProperty.call(parsed, '__proto__')).toBe(false);
      expect(Object.prototype.hasOwnProperty.call(parsed, 'constructor')).toBe(false);

      const cleaned = cleanUndefined(parsed);
      expect(Object.prototype.hasOwnProperty.call(cleaned, '__proto__')).toBe(false);
    });

    it('rejects objects explicitly carrying prototype-pollution own properties', () => {
      const poisonedTask = JSON.parse('{"__proto__":{"x":1},"id":"t1","title":"Test","date":"2026-11-17"}');
      expect(validateTask(poisonedTask)).toBeNull();

      const poisonedList = JSON.parse('{"constructor":{"y":2},"id":"l1","title":"Test","items":[]}');
      expect(validateCustomList(poisonedList)).toBeNull();

      const poisonedFocus = JSON.parse(
        '{"prototype":{"z":3},"id":"f1","date":"2026-11-17","durationSeconds":60,"timestamp":1700000000000}'
      );
      expect(validateFocusSession(poisonedFocus)).toBeNull();
    });
  });

  describe('Injection & Resource-Exhaustion Prevention', () => {
    it('prevents iCalendar CRLF injection and forged VEVENT/VALARM blocks', () => {
      const maliciousTasks = [
        {
          id: 't1\r\nUID:forged',
          title: 'Meeting\r\nBEGIN:VALARM\r\nACTION:DISPLAY\r\nDESCRIPTION:PWNED',
          date: '2026-11-17',
          recurrence: 'none' as const,
          tag: 'work\nLOCATION:Evil',
          completedDates: [],
        },
      ];

      const ics = generateICSContent(maliciousTasks);
      const valarmCount = (ics.match(/^BEGIN:VALARM/gm) || []).length;
      const veventCount = (ics.match(/^BEGIN:VEVENT/gm) || []).length;
      const uidCount = (ics.match(/^UID:/gm) || []).length;

      expect(valarmCount).toBe(0);
      expect(veventCount).toBe(1);
      expect(uidCount).toBe(1);
      expect(ics).toContain('UID:t1__UID_forged@zen.app');

      const md = generateMarkdownContent(maliciousTasks);
      expect(md.split('\n').filter(line => line.startsWith('- [ ]'))).toHaveLength(1);
      expect(md).not.toContain('\nBEGIN:VALARM');
    });

    it('enforces payload size limits and bounds on tasks, lists, focus sessions, and custom tags', () => {
      // Oversized JSON DoS rejection
      expect(safeJsonParse('a'.repeat(1024), 100)).toBeNull();

      // Bad numeric / date bounds
      const validated = validateTask({
        id: 't-bounds',
        title: 'Valid Task',
        date: '2026-11-17',
        recurrence: 'invalid-recurrence',
        completedDates: Array.from({ length: MAX_DATES_LIST + 50 }, () => '2026-11-17'),
        subtasks: Array.from({ length: MAX_SUBTASKS_PER_TASK + 20 }, (_, idx) => ({
          id: `s-${idx}`,
          title: `Step ${idx}`,
          isCompleted: false,
        })),
        estimatedMinutes: 999999,
        focusedSeconds: -50,
      });

      expect(validated).not.toBeNull();
      expect(validated?.recurrence).toBe('none');
      expect(validated?.completedDates.length).toBe(MAX_DATES_LIST);
      expect(validated?.subtasks?.length).toBe(MAX_SUBTASKS_PER_TASK);
      expect(validated?.estimatedMinutes).toBeUndefined();
      expect(validated?.focusedSeconds).toBeUndefined();

      // Strict hex validation for CustomTag
      expect(validateCustomTag({ id: 'tag1', label: 'Study', color: '#ec4899' })).toEqual({
        id: 'tag1',
        label: 'Study',
        color: '#ec4899',
      });
      expect(validateCustomTag({ id: 'tag2', label: 'Bad', color: 'red; url(javascript:1)' })).toBeNull();

      // FocusSession bounds
      expect(
        validateFocusSession({
          id: 'fs1',
          date: '2026-11-17',
          durationSeconds: -10,
          timestamp: Date.now(),
        })
      ).toBeNull();
      expect(
        validateFocusSession({
          id: 'fs2',
          date: '2026-11-17',
          durationSeconds: 1500,
          timestamp: 1700000000000,
        })
      ).not.toBeNull();

      // Tombstone IDs sanitization
      expect(sanitizeDeletedIds(['valid-1', '__proto__', '../etc', 'valid-1'])).toEqual(['valid-1']);
    });

    it('blocks resurrection of deleted items even with manipulated future timestamps', () => {
      const merged = mergeItemsWithTombstones(
        [{ id: 'keep', title: 'Keep', updatedAt: 100 }],
        [
          { id: 'deleted-id', title: 'Attacker Resurrection', updatedAt: Number.MAX_SAFE_INTEGER },
          { id: 'keep', title: 'Updated', updatedAt: 200 },
        ],
        new Set(['deleted-id'])
      );
      expect(merged).toEqual([{ id: 'keep', title: 'Updated', updatedAt: 200 }]);
    });
  });
});
