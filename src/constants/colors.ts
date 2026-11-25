import { AppTheme } from '../types';

export interface ThemeColors {
  name: string;
  icon: string;
  isDark: boolean;
  background: string;
  surface: string;
  surfaceMuted: string;
  surfaceElevated: string;
  card: string;
  border: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  textDim: string;
  primary: string;
  onPrimary: string;
  primaryLight: string;
  primaryDark: string;
  accent: string;
  success: string;
  warning: string;
  danger: string;
  tabBar: string;
  tabBarBorder: string;
}

export const THEMES: Record<AppTheme, ThemeColors> = {
  matcha: {
    name: 'Matcha Garden',
    icon: '🍵',
    isDark: false,
    background: '#f2f7f3',
    surface: '#ffffff',
    surfaceMuted: '#edf5ee',
    surfaceElevated: '#edf5ee',
    card: '#ffffff',
    border: '#dbeade',
    text: '#193022',
    textSecondary: '#546159',
    textMuted: '#526b5c',
    textDim: '#526b5c',
    primary: '#357848',
    onPrimary: '#ffffff',
    primaryLight: '#ebf6ee',
    primaryDark: '#214f2e',
    accent: '#468f5a',
    success: '#0f766e',
    warning: '#b45309',
    danger: '#dc2626',
    tabBar: 'rgba(255, 255, 255, 0.95)',
    tabBarBorder: '#dbeade',
  },
  sakura: {
    name: 'Sakura Rose',
    icon: '🌸',
    isDark: false,
    background: '#fff7fa',
    surface: '#ffffff',
    surfaceMuted: '#fdf2f8',
    surfaceElevated: '#fdf2f8',
    card: '#ffffff',
    border: '#fce7f3',
    text: '#1f2937',
    textSecondary: '#5c6370',
    textMuted: '#5c6370',
    textDim: '#646b78',
    primary: '#d11d6b',
    onPrimary: '#ffffff',
    primaryLight: '#fdf2f8',
    primaryDark: '#9d174d',
    accent: '#e14d8c',
    success: '#0f766e',
    warning: '#b45309',
    danger: '#dc2626',
    tabBar: 'rgba(255, 255, 255, 0.95)',
    tabBarBorder: '#fce7f3',
  },
  nordic: {
    name: 'Nordic Breeze',
    icon: '🌊',
    isDark: false,
    background: '#f1f6fa',
    surface: '#ffffff',
    surfaceMuted: '#e8f2f8',
    surfaceElevated: '#e8f2f8',
    card: '#ffffff',
    border: '#d6e6f2',
    text: '#17283c',
    textSecondary: '#52606e',
    textMuted: '#4f647a',
    textDim: '#4f647a',
    primary: '#2d6fa4',
    onPrimary: '#ffffff',
    primaryLight: '#e9f3fa',
    primaryDark: '#1b4467',
    accent: '#3e80b8',
    success: '#0f766e',
    warning: '#b45309',
    danger: '#dc2626',
    tabBar: 'rgba(255, 255, 255, 0.95)',
    tabBarBorder: '#d6e6f2',
  },
  midnight: {
    name: 'Midnight Silk',
    icon: '🌙',
    isDark: true,
    background: '#121019',
    surface: '#1a1824',
    surfaceMuted: '#242131',
    surfaceElevated: '#282436',
    card: '#1e1c29',
    border: '#2e293f',
    text: '#f3f4f6',
    textSecondary: '#b2b7c2',
    textMuted: '#a7adb9',
    textDim: '#9690ab',
    primary: '#c084fc',
    onPrimary: '#120d1d',
    primaryLight: '#2e283e',
    primaryDark: '#e9d5ff',
    accent: '#a855f7',
    success: '#34d399',
    warning: '#fbbf24',
    danger: '#f87171',
    tabBar: 'rgba(26, 24, 36, 0.95)',
    tabBarBorder: '#2e293f',
  },
};

/**
 * Converts a 6-digit hex color to an rgba() string with bounded opacity.
 * Keeps derived tinted badges/heatmap steps faithful to all 4 themes.
 */
export function withAlpha(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) {
    return hex;
  }
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  const clamped = Math.max(0, Math.min(1, alpha));
  return `rgba(${r}, ${g}, ${b}, ${clamped})`;
}
