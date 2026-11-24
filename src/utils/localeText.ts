import type { AppLanguage } from '../i18n';

const TURKISH_LATIN_MAP: Record<string, string> = {
  ç: 'c',
  Ç: 'c',
  ğ: 'g',
  Ğ: 'g',
  ı: 'i',
  I: 'i',
  İ: 'i',
  ö: 'o',
  Ö: 'o',
  ş: 's',
  Ş: 's',
  ü: 'u',
  Ü: 'u',
};

/**
 * Locale-aware text normalization for user-facing search and filtering.
 * Prevents the classic Turkish İ/I/ı mismatch where "İstanbul".toLowerCase()
 * emits "i\u0307stanbul" and fails to match "istanbul", and ensures "IĞDIR" matches "ığdır".
 */
export function normalizeSearchText(input: string, language?: AppLanguage): string {
  if (typeof input !== 'string') return '';
  const trimmed = input.trim();
  if (!trimmed) return '';

  if (language === 'tr') {
    return trimmed
      .replace(/\u0130/g, 'i')
      .replace(/I/g, 'ı')
      .toLocaleLowerCase('tr-TR')
      .replace(/\u0307/g, '');
  }

  return trimmed
    .replace(/\u0130/g, 'i')
    .replace(/\u0307/g, '')
    .toLowerCase();
}

/**
 * Locale-independent ASCII uppercase normalization for machine identifiers
 * such as sync keys (ZEN-XXXX-XXXX), protocol tokens, and storage keys.
 * Maps Turkish dotted/dotless I variants cleanly to ASCII 'I' instead of 'İ'.
 */
export function normalizeMachineKey(input: string): string {
  if (typeof input !== 'string') return '';
  return input
    .trim()
    .replace(/[\u0130\u0131]/g, 'I')
    .replace(/\u0307/g, '')
    .toUpperCase();
}

/**
 * Produces an ASCII-safe slug matching SAFE_ID_REGEX (/^[A-Za-z0-9_.:-]{1,100}$/)
 * from arbitrary user-entered labels (including Turkish İ/ı/ş/ğ/ç/ö/ü and Unicode).
 * Falls back to a deterministic ASCII hash id when a label contains only non-Latin glyphs.
 */
export function normalizeAsciiSlug(label: string, maxLen = 32): string {
  if (typeof label !== 'string') return '';
  const trimmed = label.trim();
  if (!trimmed) return '';

  const transliterated = trimmed
    .replace(/[çÇğĞıIİöÖşŞüÜ]/g, ch => TURKISH_LATIN_MAP[ch] ?? ch)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLen);

  if (transliterated) {
    return transliterated;
  }

  let hash = 2166136261;
  for (let i = 0; i < trimmed.length; i++) {
    hash ^= trimmed.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return `tag-${hash.toString(36)}`.slice(0, maxLen);
}
