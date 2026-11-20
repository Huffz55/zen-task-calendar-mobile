import { describe, expect, it } from 'vitest';
import { format, startOfWeek } from 'date-fns';
import {
  en,
  tr,
  translate,
  normalizeLanguageCode,
  resolveActiveLanguage,
  isLanguagePreference,
  getDateFnsLocale,
  getWeekStartsOn,
  formatDurationCompact,
  formatMinutesCompact,
} from './index';

function collectKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  const keys: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object') {
      keys.push(...collectKeys(v as Record<string, unknown>, full));
    } else {
      keys.push(full);
    }
  }
  return keys.sort();
}

describe('i18n', () => {
  it('keeps en and tr translation dictionaries in complete key parity', () => {
    const enKeys = collectKeys(en as unknown as Record<string, unknown>);
    const trKeys = collectKeys(tr as unknown as Record<string, unknown>);
    expect(trKeys).toEqual(enKeys);
  });

  it('normalizes language codes and validates preferences', () => {
    expect(normalizeLanguageCode('tr')).toBe('tr');
    expect(normalizeLanguageCode('tr-TR')).toBe('tr');
    expect(normalizeLanguageCode('en')).toBe('en');
    expect(normalizeLanguageCode('en-US')).toBe('en');
    expect(normalizeLanguageCode('de-DE')).toBe('en');
    expect(normalizeLanguageCode(undefined)).toBe('en');

    expect(isLanguagePreference('system')).toBe(true);
    expect(isLanguagePreference('tr')).toBe(true);
    expect(isLanguagePreference('en')).toBe(true);
    expect(isLanguagePreference('fr')).toBe(false);
  });

  it('resolves active language for system and explicit overrides', () => {
    expect(resolveActiveLanguage('system', 'tr')).toBe('tr');
    expect(resolveActiveLanguage('system', 'en')).toBe('en');
    expect(resolveActiveLanguage('tr', 'en')).toBe('tr');
    expect(resolveActiveLanguage('en', 'tr')).toBe('en');
  });

  it('interpolates parameters cleanly in both English and Turkish', () => {
    expect(translate('en', 'today.progressCompleted', { completed: 2, total: 5 })).toBe(
      '2 of 5 completed'
    );
    expect(translate('tr', 'today.progressCompleted', { completed: 2, total: 5 })).toBe(
      '2 / 5 tamamlandı'
    );
    expect(
      translate('tr', 'notifications.morningBodyOther', { count: 4 })
    ).toContain('4 görevin var');
  });

  it('configures date-fns locale and Monday week start for Turkish', () => {
    const sampleDate = new Date(2026, 10, 20); // Friday, Nov 20, 2026
    const trLocale = getDateFnsLocale('tr');
    const enLocale = getDateFnsLocale('en');

    expect(getWeekStartsOn('tr')).toBe(1);
    expect(getWeekStartsOn('en')).toBe(0);

    const trWeekStart = startOfWeek(sampleDate, {
      locale: trLocale,
      weekStartsOn: getWeekStartsOn('tr'),
    });
    const enWeekStart = startOfWeek(sampleDate, {
      locale: enLocale,
      weekStartsOn: getWeekStartsOn('en'),
    });

    expect(trWeekStart.getDay()).toBe(1); // Monday
    expect(enWeekStart.getDay()).toBe(0); // Sunday
    expect(format(sampleDate, 'MMMM', { locale: trLocale })).toBe('Kasım');
  });

  it('formats durations with localized short units', () => {
    expect(formatDurationCompact(5400, 'en')).toBe('1h 30m');
    expect(formatDurationCompact(5400, 'tr')).toBe('1sa 30dk');
    expect(formatMinutesCompact(45, 'tr')).toBe('45dk');
  });

  it('formats TodayScreen subtitle and keeps concise Focus/Settings Turkish copy', () => {
    const sampleDate = new Date(2026, 10, 20); // Friday, Nov 20, 2026
    expect(format(sampleDate, tr.dates.todaySubtitle, { locale: getDateFnsLocale('tr') })).toBe(
      '20 Kasım, Cuma'
    );
    expect(format(sampleDate, en.dates.todaySubtitle, { locale: getDateFnsLocale('en') })).toBe(
      'Friday, Nov 20'
    );
    expect(tr.focus.title).toBe('Odak');
    expect(en.focus.title).toBe('Focus');
    expect(tr.focus.boxBreathing).toBe('Nefes Egzersizi');
    expect(tr.focus.boxBreathingSub).toBe('3 dakikalık odak molası');
    expect(tr.settings.hapticFeedback).toBe('Titreşim');
    expect(tr.settings.completionChime).toBe('Bitiş Sesi');
  });
});
