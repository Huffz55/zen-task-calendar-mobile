import { AppTheme } from '../types';

export interface ThemeColors {
  name: string;
  icon: string;
  isDark: boolean;
  background: string;
  surface: string;
  surfaceMuted: string;
  card: string;
  border: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  textDim: string;
  primary: string;
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
  sakura: {
    name: 'Sakura Rose',
    icon: '🌸',
    isDark: false,
    background: '#fff7fa',
    surface: '#ffffff',
    surfaceMuted: '#fdf2f8',
    card: '#ffffff',
    border: '#fce7f3',
    text: '#1f2937',
    textSecondary: '#6b7280',
    textMuted: '#6b7280',
    textDim: '#9ca3af',
    primary: '#ec4899',
    primaryLight: '#fdf2f8',
    primaryDark: '#be185d',
    accent: '#f472b6',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    tabBar: 'rgba(255, 255, 255, 0.95)',
    tabBarBorder: '#fce7f3',
  },
  matcha: {
    name: 'Matcha Garden',
    icon: '🍵',
    isDark: false,
    background: '#f2f7f3',
    surface: '#ffffff',
    surfaceMuted: '#edf5ee',
    card: '#ffffff',
    border: '#dbeade',
    text: '#193022',
    textSecondary: '#5c6660',
    textMuted: '#587462',
    textDim: '#8ea797',
    primary: '#387e4c',
    primaryLight: '#ebf6ee',
    primaryDark: '#214f2e',
    accent: '#4e9e64',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    tabBar: 'rgba(255, 255, 255, 0.95)',
    tabBarBorder: '#dbeade',
  },
  nordic: {
    name: 'Nordic Breeze',
    icon: '🌊',
    isDark: false,
    background: '#f1f6fa',
    surface: '#ffffff',
    surfaceMuted: '#e8f2f8',
    card: '#ffffff',
    border: '#d6e6f2',
    text: '#17283c',
    textSecondary: '#5b6670',
    textMuted: '#576c82',
    textDim: '#899fb6',
    primary: '#2d6fa4',
    primaryLight: '#e9f3fa',
    primaryDark: '#1b4467',
    accent: '#498ec4',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
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
    card: '#1e1c29',
    border: '#2e293f',
    text: '#f3f4f6',
    textSecondary: '#9ca3af',
    textMuted: '#9ca3af',
    textDim: '#6b6580',
    primary: '#c084fc',
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
