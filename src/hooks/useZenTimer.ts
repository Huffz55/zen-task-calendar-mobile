import { useState, useEffect, useRef, useCallback } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { hapticSuccess, hapticMedium } from './useHaptics';
import { defaultNotificationService } from '../services/notifications/notificationService';
import { isCompletionChimeEnabled, playZenChime } from '../services/audio/audioService';
import {
  clearPersistedTimerState,
  loadPersistedTimerState,
  savePersistedTimerState,
  type PersistedFocusTask,
} from '../utils/zenTimerPersistence';

interface UseZenTimerOptions {
  activeFocusTask?: PersistedFocusTask | null;
  onRestoreFocusTask?: (task: PersistedFocusTask | null) => void;
  resetSignal?: number;
}

export function useZenTimer(
  defaultMinutes = 25,
  onTimerComplete?: (durationSeconds: number, restoredTask?: PersistedFocusTask | null) => void,
  options?: UseZenTimerOptions
) {
  const defaultSeconds = defaultMinutes * 60;
  const [initialTime, setInitialTime] = useState(defaultSeconds);
  const [timeLeft, setTimeLeft] = useState(defaultSeconds);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [hasCompletedSession, setHasCompletedSession] = useState(false);
  const [isAppActive, setIsAppActive] = useState(() => AppState.currentState === 'active');

  const endTimeRef = useRef<number | null>(null);
  const timeLeftMsRef = useRef<number | null>(null);
  const initialTimeRef = useRef(initialTime);
  const timeLeftRef = useRef(timeLeft);
  const isRunningRef = useRef(isTimerRunning);
  const onTimerCompleteRef = useRef(onTimerComplete);
  const activeFocusTaskRef = useRef<PersistedFocusTask | null>(options?.activeFocusTask ?? null);
  const onRestoreFocusTaskRef = useRef(options?.onRestoreFocusTask);
  const hasUserInteractedRef = useRef(false);
  const prevResetSignalRef = useRef(options?.resetSignal ?? 0);

  useEffect(() => {
    initialTimeRef.current = initialTime;
  }, [initialTime]);

  useEffect(() => {
    timeLeftRef.current = timeLeft;
  }, [timeLeft]);

  useEffect(() => {
    isRunningRef.current = isTimerRunning;
  }, [isTimerRunning]);

  useEffect(() => {
    onTimerCompleteRef.current = onTimerComplete;
  }, [onTimerComplete]);

  useEffect(() => {
    activeFocusTaskRef.current = options?.activeFocusTask ?? null;
  }, [options?.activeFocusTask]);

  useEffect(() => {
    onRestoreFocusTaskRef.current = options?.onRestoreFocusTask;
  }, [options?.onRestoreFocusTask]);

  // Recover running/paused timer state after Android Process Death
  useEffect(() => {
    let mounted = true;
    loadPersistedTimerState(AsyncStorage, Date.now(), defaultSeconds).then(reconciled => {
      if (!mounted || !reconciled || hasUserInteractedRef.current) return;

      if (reconciled.activeTask && !activeFocusTaskRef.current) {
        activeFocusTaskRef.current = reconciled.activeTask;
        onRestoreFocusTaskRef.current?.(reconciled.activeTask);
      }

      if (reconciled.status === 'running') {
        const remainingSecs = Math.max(1, Math.ceil(reconciled.remainingMs / 1000));
        initialTimeRef.current = reconciled.initialTime;
        timeLeftRef.current = remainingSecs;
        endTimeRef.current = reconciled.endTimeMs;
        timeLeftMsRef.current = null;
        isRunningRef.current = true;
        setInitialTime(reconciled.initialTime);
        setTimeLeft(remainingSecs);
        setHasCompletedSession(false);
        setIsTimerRunning(true);
      } else if (reconciled.status === 'paused') {
        const remainingSecs = Math.max(1, Math.ceil(reconciled.remainingMs / 1000));
        initialTimeRef.current = reconciled.initialTime;
        timeLeftRef.current = remainingSecs;
        endTimeRef.current = null;
        timeLeftMsRef.current = reconciled.remainingMs;
        isRunningRef.current = false;
        setInitialTime(reconciled.initialTime);
        setTimeLeft(remainingSecs);
        setHasCompletedSession(false);
        setIsTimerRunning(false);
      } else if (reconciled.status === 'completed') {
        void clearPersistedTimerState(AsyncStorage);
        initialTimeRef.current = reconciled.initialTime;
        timeLeftRef.current = 0;
        endTimeRef.current = null;
        timeLeftMsRef.current = null;
        isRunningRef.current = false;
        setInitialTime(reconciled.initialTime);
        setTimeLeft(0);
        setIsTimerRunning(false);
        setHasCompletedSession(true);
        onTimerCompleteRef.current?.(reconciled.elapsedSeconds, reconciled.activeTask);
      } else if (reconciled.initialTime !== defaultSeconds) {
        initialTimeRef.current = reconciled.initialTime;
        timeLeftRef.current = reconciled.initialTime;
        setInitialTime(reconciled.initialTime);
        setTimeLeft(reconciled.initialTime);
      }
    });
    return () => {
      mounted = false;
    };
  }, [defaultSeconds]);

  // Reset in-memory timer when workspace data is explicitly cleared
  useEffect(() => {
    const nextSignal = options?.resetSignal ?? 0;
    if (nextSignal !== prevResetSignalRef.current) {
      prevResetSignalRef.current = nextSignal;
      endTimeRef.current = null;
      timeLeftMsRef.current = null;
      isRunningRef.current = false;
      initialTimeRef.current = defaultSeconds;
      timeLeftRef.current = defaultSeconds;
      setHasCompletedSession(false);
      setIsTimerRunning(false);
      setInitialTime(defaultSeconds);
      setTimeLeft(defaultSeconds);
      void clearPersistedTimerState(AsyncStorage);
    }
  }, [options?.resetSignal, defaultSeconds]);

  // Track foreground/background transitions so JS intervals and keep-awake pause safely
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      setIsAppActive(nextState === 'active');
    });
    return () => subscription.remove();
  }, []);

  // Keep screen awake only while actively running in foreground
  useEffect(() => {
    if (isTimerRunning && isAppActive) {
      activateKeepAwakeAsync('zen-timer-tag').catch(() => {});
    } else {
      deactivateKeepAwake('zen-timer-tag').catch(() => {});
    }
    return () => {
      deactivateKeepAwake('zen-timer-tag').catch(() => {});
    };
  }, [isTimerRunning, isAppActive]);

  const startTimer = useCallback(() => {
    if (isRunningRef.current) return;
    hasUserInteractedRef.current = true;
    const currentInitial = initialTimeRef.current;
    const currentLeft = timeLeftRef.current;
    const remainingMs = timeLeftMsRef.current ?? (currentLeft <= 0 ? currentInitial * 1000 : currentLeft * 1000);
    const nextEndTime = Date.now() + remainingMs;
    endTimeRef.current = nextEndTime;
    timeLeftMsRef.current = null;
    isRunningRef.current = true;
    setHasCompletedSession(false);
    setIsTimerRunning(true);
    hapticMedium();

    void savePersistedTimerState(AsyncStorage, {
      initialTime: currentInitial,
      isRunning: true,
      endTimeMs: nextEndTime,
      pausedRemainingMs: null,
      activeTask: activeFocusTaskRef.current,
    });

    // Schedule background notification for when user backgrounds app
    defaultNotificationService.scheduleFocusTimerEnd(remainingMs / 1000, activeFocusTaskRef.current?.title);
  }, []);

  const pauseTimer = useCallback(() => {
    if (!isRunningRef.current) return;
    hasUserInteractedRef.current = true;
    let remainingMs = timeLeftRef.current * 1000;
    if (endTimeRef.current !== null) {
      remainingMs = Math.max(0, endTimeRef.current - Date.now());
      const remainingSecs = Math.max(0, Math.ceil(remainingMs / 1000));
      timeLeftMsRef.current = remainingMs;
      timeLeftRef.current = remainingSecs;
      setTimeLeft(remainingSecs);
    }
    endTimeRef.current = null;
    isRunningRef.current = false;
    setIsTimerRunning(false);
    hapticMedium();

    if (remainingMs > 0 && remainingMs < initialTimeRef.current * 1000) {
      void savePersistedTimerState(AsyncStorage, {
        initialTime: initialTimeRef.current,
        isRunning: false,
        endTimeMs: null,
        pausedRemainingMs: remainingMs,
        activeTask: activeFocusTaskRef.current,
      });
    } else {
      void clearPersistedTimerState(AsyncStorage);
    }

    // Cancel scheduled background notification
    defaultNotificationService.cancelNotification('zen-timer-end');
  }, []);

  const toggleTimer = useCallback(() => {
    if (isRunningRef.current) {
      pauseTimer();
    } else {
      startTimer();
    }
  }, [pauseTimer, startTimer]);

  const resetTimer = useCallback(() => {
    hasUserInteractedRef.current = true;
    endTimeRef.current = null;
    timeLeftMsRef.current = null;
    isRunningRef.current = false;
    timeLeftRef.current = initialTimeRef.current;
    setHasCompletedSession(false);
    setIsTimerRunning(false);
    setTimeLeft(initialTimeRef.current);
    hapticMedium();
    void clearPersistedTimerState(AsyncStorage);
    defaultNotificationService.cancelNotification('zen-timer-end');
  }, []);

  const setTimerMinutes = useCallback((minutes: number) => {
    hasUserInteractedRef.current = true;
    const newSeconds = minutes * 60;
    endTimeRef.current = null;
    timeLeftMsRef.current = null;
    isRunningRef.current = false;
    initialTimeRef.current = newSeconds;
    timeLeftRef.current = newSeconds;
    setHasCompletedSession(false);
    setIsTimerRunning(false);
    setInitialTime(newSeconds);
    setTimeLeft(newSeconds);
    hapticMedium();
    void clearPersistedTimerState(AsyncStorage);
    defaultNotificationService.cancelNotification('zen-timer-end');
  }, []);

  // Foreground interval ticker with wall-clock background drift compensation
  useEffect(() => {
    if (!isTimerRunning || !isAppActive) return;

    if (endTimeRef.current === null) {
      const currentInitial = initialTimeRef.current;
      const currentLeft = timeLeftRef.current;
      const remainingMs = timeLeftMsRef.current ?? (currentLeft <= 0 ? currentInitial * 1000 : currentLeft * 1000);
      endTimeRef.current = Date.now() + remainingMs;
      timeLeftMsRef.current = null;
    }

    const syncTick = (): boolean => {
      if (endTimeRef.current === null) return true;
      const remainingMs = Math.max(0, endTimeRef.current - Date.now());
      const remainingSecs = Math.max(0, Math.ceil(remainingMs / 1000));

      timeLeftRef.current = remainingSecs;
      setTimeLeft(prev => (prev !== remainingSecs ? remainingSecs : prev));

      if (remainingMs <= 0) {
        endTimeRef.current = null;
        timeLeftMsRef.current = null;
        isRunningRef.current = false;
        void clearPersistedTimerState(AsyncStorage);
        hapticSuccess();
        if (isCompletionChimeEnabled()) {
          void playZenChime();
        }
        defaultNotificationService.cancelNotification('zen-timer-end');
        setHasCompletedSession(true);
        onTimerCompleteRef.current?.(initialTimeRef.current);
        setIsTimerRunning(false);
        return true;
      }
      return false;
    };

    // Immediately reconcile elapsed background time on foreground return
    if (syncTick()) {
      return;
    }

    const interval = setInterval(() => {
      if (syncTick()) {
        clearInterval(interval);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [isTimerRunning, isAppActive]);

  const finishEarlySession = useCallback(() => {
    hasUserInteractedRef.current = true;
    const currentInitial = initialTimeRef.current;
    let elapsedSeconds = 0;
    if (endTimeRef.current !== null) {
      const remainingMs = Math.max(0, endTimeRef.current - Date.now());
      const remainingSecs = Math.max(0, Math.ceil(remainingMs / 1000));
      elapsedSeconds = Math.max(0, currentInitial - remainingSecs);
    } else {
      elapsedSeconds = Math.max(0, currentInitial - timeLeftRef.current);
    }

    // Immediately reset refs synchronously so rapid double-taps cannot log duplicate sessions
    endTimeRef.current = null;
    timeLeftMsRef.current = null;
    isRunningRef.current = false;
    timeLeftRef.current = currentInitial;
    setIsTimerRunning(false);
    setTimeLeft(currentInitial);
    void clearPersistedTimerState(AsyncStorage);
    defaultNotificationService.cancelNotification('zen-timer-end');

    if (elapsedSeconds >= 10 && onTimerCompleteRef.current) {
      setHasCompletedSession(true);
      onTimerCompleteRef.current(elapsedSeconds);
      hapticSuccess();
      if (isCompletionChimeEnabled()) {
        void playZenChime();
      }
    } else {
      hapticMedium();
    }
  }, []);

  const clearCompletedSession = useCallback(() => {
    setHasCompletedSession(false);
  }, []);

  return {
    timeLeft,
    initialTime,
    isTimerRunning,
    hasCompletedSession,
    toggleTimer,
    resetTimer,
    setTimerMinutes,
    finishEarlySession,
    clearCompletedSession,
  };
}
