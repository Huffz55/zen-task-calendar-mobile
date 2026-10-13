import { AppTheme } from '../types';

export interface ThemeColors {
  name: string;
  subtitle: string;
  icon: string;
  isDark: boolean;
  background: string;
  surface: string;
  surfaceMuted: string;
  card: string;
  border: string;
  text: string;
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
    subtitle: 'Soft pink & warm peach',
    icon: '🌸',
    isDark: false,
    background: '#fff7fa',
    surface: '#ffffff',
    surfaceMuted: '#fdf2f8',
    card: '#ffffff',
    border: '#fce7f3',
    text: '#1f2937',
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
    subtitle: 'Calm sage green & ivory milk',
    icon: '🍵',
    isDark: false,
    background: '#f2f7f3',
    surface: '#ffffff',
    surfaceMuted: '#edf5ee',
    card: '#ffffff',
    border: '#dbeade',
    text: '#193022',
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
    subtitle: 'Minimalist foggy blue & slate',
    icon: '🌊',
    isDark: false,
    background: '#f1f6fa',
    surface: '#ffffff',
    surfaceMuted: '#e8f2f8',
    card: '#ffffff',
    border: '#d6e6f2',
    text: '#17283c',
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
    subtitle: 'Deep dark mode & lavender',
    icon: '🌙',
    isDark: true,
    background: '#121019',
    surface: '#1a1824',
    surfaceMuted: '#242131',
    card: '#1e1c29',
    border: '#2e293f',
    text: '#f3f4f6',
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
