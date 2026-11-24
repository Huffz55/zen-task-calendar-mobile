import { useSyncExternalStore } from 'react';
import { AccessibilityInfo } from 'react-native';

let cachedReduceMotion = false;
let initialized = false;
const listeners = new Set<() => void>();

function ensureInitialized() {
  if (initialized) return;
  initialized = true;

  try {
    AccessibilityInfo.isReduceMotionEnabled?.()
      .then(enabled => {
        const next = Boolean(enabled);
        if (next !== cachedReduceMotion) {
          cachedReduceMotion = next;
          listeners.forEach(fn => fn());
        }
      })
      .catch(() => {});

    AccessibilityInfo.addEventListener?.('reduceMotionChanged', (enabled: boolean) => {
      const next = Boolean(enabled);
      if (next !== cachedReduceMotion) {
        cachedReduceMotion = next;
        listeners.forEach(fn => fn());
      }
    });
  } catch {
    // Fallback gracefully in environments without AccessibilityInfo
  }
}

function subscribe(listener: () => void): () => void {
  ensureInitialized();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): boolean {
  ensureInitialized();
  return cachedReduceMotion;
}

export function isReduceMotionEnabled(): boolean {
  return getSnapshot();
}

/**
 * React hook returning the OS Reduce Motion / Remove Animations preference.
 * Uses useSyncExternalStore for tear-free, zero-effect-cascade updates.
 */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
