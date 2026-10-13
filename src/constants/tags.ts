import { TaskTag } from '../types';

export interface TagConfig {
  label: string;
  icon: string;
  color: string;
  bgLight: string;
  bgDark: string;
}

export const TAGS: Record<TaskTag, TagConfig> = {
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
