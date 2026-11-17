import type { BuiltinTaskTag, CustomTag, TaskTag } from '../types';

export interface TagConfig {
  label: string;
  icon: string;
  color: string;
  bgLight: string;
  bgDark: string;
}

export const CUSTOM_TAG_COLORS: { color: string; bgLight: string; bgDark: string }[] = [
  { color: '#6366f1', bgLight: '#eef2ff', bgDark: '#1e1b4b' },
  { color: '#0d9488', bgLight: '#f0fdfa', bgDark: '#134e4a' },
  { color: '#0284c7', bgLight: '#e0f2fe', bgDark: '#0c4a6e' },
  { color: '#7c3aed', bgLight: '#f5f3ff', bgDark: '#2e1065' },
  { color: '#db2777', bgLight: '#fdf2f8', bgDark: '#500724' },
  { color: '#ea580c', bgLight: '#fff7ed', bgDark: '#431407' },
];

export const TAGS: Record<BuiltinTaskTag, TagConfig> = {
  work: {
    label: 'Work',
    icon: 'briefcase-outline',
    color: '#2563eb',
    bgLight: '#eff6ff',
    bgDark: '#1e293b',
  },
  personal: {
    label: 'Personal',
    icon: 'leaf-outline',
    color: '#059669',
    bgLight: '#ecfdf5',
    bgDark: '#064e3b',
  },
  health: {
    label: 'Health',
    icon: 'heart-outline',
    color: '#d97706',
    bgLight: '#fffbeb',
    bgDark: '#451a03',
  },
  ideas: {
    label: 'Idea',
    icon: 'bulb-outline',
    color: '#9333ea',
    bgLight: '#faf5ff',
    bgDark: '#3b0764',
  },
  priority: {
    label: 'Priority',
    icon: 'star-outline',
    color: '#e11d48',
    bgLight: '#fff1f2',
    bgDark: '#4c0519',
  },
};

export function normalizeTagId(label: string): string {
  return label.trim().toLowerCase().replace(/\s+/g, '-').slice(0, 32);
}

function hashTagColor(tag: string) {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = (hash * 31 + tag.charCodeAt(i)) >>> 0;
  }
  return CUSTOM_TAG_COLORS[hash % CUSTOM_TAG_COLORS.length];
}

export function resolveTagConfig(tag: TaskTag, customTags: CustomTag[] = []): TagConfig {
  if (tag in TAGS) {
    return TAGS[tag as BuiltinTaskTag];
  }
  const found = customTags.find(t => t.id === tag || t.label.toLowerCase() === tag.toLowerCase());
  const palette = found
    ? CUSTOM_TAG_COLORS.find(c => c.color === found.color) || hashTagColor(tag)
    : hashTagColor(tag);
  const label =
    found?.label ||
    tag
      .split('-')
      .map(part => (part ? part[0].toUpperCase() + part.slice(1) : ''))
      .join(' ');
  return {
    label,
    icon: 'pricetag-outline',
    color: found?.color || palette.color,
    bgLight: palette.bgLight,
    bgDark: palette.bgDark,
  };
}
