import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const SETTINGS_HAPTIC_KEY = '@noteapp_setting_haptic';

let isHapticsEnabled = true;
let hasExplicitHapticOverride = false;

// Pre-load persisted haptic preference without clobbering explicit user toggles
AsyncStorage.getItem(SETTINGS_HAPTIC_KEY)
  .then(val => {
    if (val !== null && !hasExplicitHapticOverride) {
      isHapticsEnabled = val === 'true';
    }
  })
  .catch(() => {});

export function setGlobalHapticsEnabled(enabled: boolean) {
  hasExplicitHapticOverride = true;
  isHapticsEnabled = enabled;
  AsyncStorage.setItem(SETTINGS_HAPTIC_KEY, String(enabled)).catch(() => {});
}

export function hapticLight() {
  if (!isHapticsEnabled || Platform.OS === 'web') return;
  try {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  } catch {}
}

export function hapticMedium() {
  if (!isHapticsEnabled || Platform.OS === 'web') return;
  try {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  } catch {}
}

export function hapticSuccess() {
  if (!isHapticsEnabled || Platform.OS === 'web') return;
  try {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  } catch {}
}

export function hapticWarning() {
  if (!isHapticsEnabled || Platform.OS === 'web') return;
  try {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
  } catch {}
}

export function hapticSelection() {
  if (!isHapticsEnabled || Platform.OS === 'web') return;
  try {
    Haptics.selectionAsync().catch(() => {});
  } catch {}
}
