import { describe, expect, it } from 'vitest';
import { normalizeAsciiSlug, normalizeMachineKey, normalizeSearchText } from './localeText';
import { normalizeTagId, resolveTagConfig } from '../constants/tags';
import { validateCustomTag } from '../services/validation/validator';
import { isValidSyncKey } from '../services/storage/syncKeyFormat';

describe('localeText & Turkish İ/ı resilience', () => {
  it('matches Turkish dotted İ and dotless I/ı reliably during user search', () => {
    expect(normalizeSearchText('İstanbul toplantısı', 'tr')).toContain(
      normalizeSearchText('istanbul', 'tr')
    );
    expect(normalizeSearchText('İSTANBUL', 'tr')).toBe('istanbul');
    expect(normalizeSearchText('IĞDIR raporu', 'tr')).toContain(
      normalizeSearchText('ığdır', 'tr')
    );
    expect(normalizeSearchText('Iğdır', 'tr')).toBe(normalizeSearchText('IĞDIR', 'tr'));

    // Even under English UI, Turkish İ should not leave dangling combining dot U+0307
    expect(normalizeSearchText('İstanbul', 'en')).toBe('istanbul');
  });

  it('normalizes machine sync keys without Turkish İ corruption', () => {
    expect(normalizeMachineKey('zen-ab23-cd45')).toBe('ZEN-AB23-CD45');
    expect(normalizeMachineKey('zen-i234-ı567')).toBe('ZEN-I234-I567');
    expect(normalizeMachineKey('ZEN-İ234-5678')).toBe('ZEN-I234-5678');
    expect(isValidSyncKey('zen-ab23-cd45')).toBe(true);
    expect(isValidSyncKey('ZEN-İ234-5678')).toBe(true);
  });

  it('produces SAFE_ID_REGEX-compatible ASCII slugs for Turkish & Unicode custom tags so they survive app restart', () => {
    const labels = ['İş', 'Sağlık Planı', 'İngilizce', 'Öğrenme & Kitap', '日本語'];
    for (const label of labels) {
      const id = normalizeTagId(label);
      expect(id.length).toBeGreaterThan(0);
      const validated = validateCustomTag({ id, label, color: '#6366f1' });
      expect(validated).not.toBeNull();
      expect(validated?.id).toBe(id);
      expect(validated?.label).toBe(label);
    }

    expect(normalizeAsciiSlug('İngilizce Çalışma')).toBe('ingilizce-calisma');
    const resolved = resolveTagConfig(
      'ingilizce-calisma',
      [{ id: 'ingilizce-calisma', label: 'İngilizce Çalışma', color: '#6366f1' }],
      'tr'
    );
    expect(resolved.label).toBe('İngilizce Çalışma');
  });
});
