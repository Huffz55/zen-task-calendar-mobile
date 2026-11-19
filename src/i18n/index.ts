import { createContext, useCallback, useContext } from 'react';
import type { Locale } from 'date-fns';
import { enUS } from 'date-fns/locale/en-US';
import { tr as trDateLocale } from 'date-fns/locale/tr';

import { en, type TranslationDictionary } from './en';
import { tr } from './tr';

export const LANGUAGE_STORAGE_KEY = '@noteapp_setting_language';

export type LanguagePreference = 'system' | 'en' | 'tr';
export type AppLanguage = 'en' | 'tr';

type NestedKeyOf<T> = T extends object
  ? {
      [K in keyof T & string]: T[K] extends string
        ? K
        : `${K}.${NestedKeyOf<T[K]>}`;
    }[keyof T & string]
  : never;

export type TranslationKey = NestedKeyOf<typeof en>;
export type TranslationParams = Record<string, string | number>;
export type TranslateFn = (key: TranslationKey, params?: TranslationParams) => string;

const DICTIONARIES: Record<AppLanguage, TranslationDictionary> = {
  en,
  tr,
};

let currentActiveLanguage: AppLanguage | null = null;

export function isLanguagePreference(value: unknown): value is LanguagePreference {
  return value === 'system' || value === 'en' || value === 'tr';
}

export function normalizeLanguageCode(code?: string | null): AppLanguage {
  if (!code) return 'en';
  const normalized = code.trim().toLowerCase();
  return normalized.startsWith('tr') ? 'tr' : 'en';
}

/**
 * Detects the device's primary language via expo-localization (`getLocales()[0]?.languageCode`),
 * with a safe fallback to Intl / English for older OTA binaries and Node test environments.
 */
export function resolveDeviceLanguage(): AppLanguage {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const localization = require('expo-localization') as typeof import('expo-localization');
    const locales = localization.getLocales?.();
    const languageCode = locales?.[0]?.languageCode;
    if (languageCode) {
      return normalizeLanguageCode(languageCode);
    }
  } catch {
    // Ignore when native ExpoLocalization module is unavailable (e.g., OTA on older binary or Vitest)
  }

  try {
    const intlLocale = Intl.DateTimeFormat().resolvedOptions().locale;
    if (intlLocale) {
      return normalizeLanguageCode(intlLocale);
    }
  } catch {
    // Ignore Intl errors
  }

  return 'en';
}

export function resolveActiveLanguage(
  preference: LanguagePreference,
  deviceLanguage: AppLanguage = resolveDeviceLanguage()
): AppLanguage {
  if (preference === 'en' || preference === 'tr') {
    return preference;
  }
  return deviceLanguage;
}

export function setCurrentActiveLanguage(language: AppLanguage): void {
  currentActiveLanguage = language;
}

export function getActiveLanguage(): AppLanguage {
  return currentActiveLanguage ?? resolveDeviceLanguage();
}

export function getDateFnsLocale(language: AppLanguage): Locale {
  return language === 'tr' ? trDateLocale : enUS;
}

export function getWeekStartsOn(language: AppLanguage): 0 | 1 {
  return language === 'tr' ? 1 : 0;
}

function getNestedValue(dict: TranslationDictionary, key: string): string {
  const parts = key.split('.');
  let current: unknown = dict;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return key;
    }
  }
  return typeof current === 'string' ? current : key;
}

export function translate(
  language: AppLanguage,
  key: TranslationKey,
  params?: TranslationParams
): string {
  const dict = DICTIONARIES[language] ?? DICTIONARIES.en;
  let template = getNestedValue(dict, key);
  if (template === key && language !== 'en') {
    template = getNestedValue(DICTIONARIES.en, key);
  }
  if (!params) return template;

  return template.replace(/\{\{(\w+)\}\}/g, (_, paramName: string) => {
    if (Object.prototype.hasOwnProperty.call(params, paramName)) {
      return String(params[paramName]);
    }
    return '';
  });
}

export function formatDurationCompact(totalSeconds: number, language: AppLanguage): string {
  const mins = Math.round(totalSeconds / 60);
  const hUnit = translate(language, 'units.hourShort');
  const mUnit = translate(language, 'units.minuteShort');
  if (mins >= 60) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}${hUnit} ${m}${mUnit}` : `${h}${hUnit}`;
  }
  return `${mins}${mUnit}`;
}

export function formatMinutesCompact(totalMinutes: number, language: AppLanguage): string {
  const hUnit = translate(language, 'units.hourShort');
  const mUnit = translate(language, 'units.minuteShort');
  if (totalMinutes >= 60) {
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return m > 0 ? `${h}${hUnit} ${m}${mUnit}` : `${h}${hUnit}`;
  }
  return `${totalMinutes}${mUnit}`;
}

export interface LanguageContextValue {
  language: AppLanguage;
  languagePreference: LanguagePreference;
  setLanguagePreference: (preference: LanguagePreference) => Promise<void>;
}

const defaultLanguage = resolveDeviceLanguage();

export const LanguageContext = createContext<LanguageContextValue>({
  language: defaultLanguage,
  languagePreference: 'system',
  setLanguagePreference: async () => {},
});

export function useTranslation() {
  const { language, languagePreference, setLanguagePreference } = useContext(LanguageContext);

  const t = useCallback<TranslateFn>(
    (key, params) => translate(language, key, params),
    [language]
  );

  const dateLocale = getDateFnsLocale(language);
  const weekStartsOn = getWeekStartsOn(language);

  return {
    t,
    language,
    locale: language,
    languagePreference,
    setLanguagePreference,
    dateLocale,
    weekStartsOn,
  };
}

export { en, tr };
export type { TranslationDictionary };
