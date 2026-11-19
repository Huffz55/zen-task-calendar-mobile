import { useState, useEffect, useRef, useCallback } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { hapticSuccess, hapticMedium } from './useHaptics';
import { defaultNotificationService } from '../services/notifications/notificationService';
import { isCompletionChimeEnabled, playZenChime } from '../services/audio/audioService';

export function useZenTimer(
  defaultMinutes = 25,
  onTimerComplete?: (durationSeconds: number) => void
) {
  const [initialTime, setInitialTime] = useState(defaultMinutes * 60);
  const [timeLeft, setTimeLeft] = useState(defaultMinutes * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isAppActive, setIsAppActive] = useState(() => AppState.currentState !== 'background');

  const endTimeRef = useRef<number | null>(null);
  const timeLeftMsRef = useRef<number | null>(null);
  const initialTimeRef = useRef(initialTime);
  const timeLeftRef = useRef(timeLeft);
  const onTimerCompleteRef = useRef(onTimerComplete);

  useEffect(() => {
    initialTimeRef.current = initialTime;
  }, [initialTime]);

  useEffect(() => {
    timeLeftRef.current = timeLeft;
  }, [timeLeft]);

  useEffect(() => {
    onTimerCompleteRef.current = onTimerComplete;
  }, [onTimerComplete]);

  // Track foreground/background transitions so JS intervals and keep-awake pause safely
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'background') {
        setIsAppActive(false);
      } else if (nextState === 'active') {
        setIsAppActive(true);
      }
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
    const currentInitial = initialTimeRef.current;
    const currentLeft = timeLeftRef.current;
    const remainingMs = timeLeftMsRef.current ?? (currentLeft <= 0 ? currentInitial * 1000 : currentLeft * 1000);
    endTimeRef.current = Date.now() + remainingMs;
    timeLeftMsRef.current = null;
    setIsTimerRunning(true);
    hapticMedium();

    // Schedule background notification for when user backgrounds app
    defaultNotificationService.scheduleFocusTimerEnd(remainingMs / 1000);
  }, []);

  const pauseTimer = useCallback(() => {
    if (endTimeRef.current !== null) {
      const remainingMs = Math.max(0, endTimeRef.current - Date.now());
      timeLeftMsRef.current = remainingMs;
      setTimeLeft(Math.max(0, Math.ceil(remainingMs / 1000)));
    }
    endTimeRef.current = null;
    setIsTimerRunning(false);
    hapticMedium();

    // Cancel scheduled background notification
    defaultNotificationService.cancelNotification('zen-timer-end');
  }, []);

  const toggleTimer = useCallback(() => {
    if (isTimerRunning) {
      pauseTimer();
    } else {
      startTimer();
    }
  }, [isTimerRunning, pauseTimer, startTimer]);

  const resetTimer = useCallback(() => {
    endTimeRef.current = null;
    timeLeftMsRef.current = null;
    setIsTimerRunning(false);
    setTimeLeft(initialTimeRef.current);
    hapticMedium();
    defaultNotificationService.cancelNotification('zen-timer-end');
  }, []);

  const adjustTime = useCallback((deltaSeconds: number) => {
    setInitialTime(prev => Math.max(60, prev + deltaSeconds));
    if (isTimerRunning) {
      const currentEnd = endTimeRef.current ?? (Date.now() + (timeLeftMsRef.current ?? timeLeftRef.current * 1000));
      const newEnd = Math.max(Date.now(), currentEnd + deltaSeconds * 1000);
      endTimeRef.current = newEnd;
      timeLeftMsRef.current = null;
      const remainingMs = Math.max(0, newEnd - Date.now());
      setTimeLeft(Math.max(0, Math.ceil(remainingMs / 1000)));
      defaultNotificationService.scheduleFocusTimerEnd(remainingMs / 1000);
    } else {
      timeLeftMsRef.current = null;
      setTimeLeft(prev => Math.max(60, prev + deltaSeconds));
    }
    hapticMedium();
  }, [isTimerRunning]);

  const setTimerMinutes = useCallback((minutes: number) => {
    const newSeconds = minutes * 60;
    endTimeRef.current = null;
    timeLeftMsRef.current = null;
    setIsTimerRunning(false);
    setInitialTime(newSeconds);
    setTimeLeft(newSeconds);
    hapticMedium();
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

      setTimeLeft(prev => (prev !== remainingSecs ? remainingSecs : prev));

      if (remainingMs <= 0) {
        hapticSuccess();
        if (isCompletionChimeEnabled()) {
          void playZenChime();
        }
        defaultNotificationService.cancelNotification('zen-timer-end');
        onTimerCompleteRef.current?.(initialTimeRef.current);
        setIsTimerRunning(false);
        endTimeRef.current = null;
        timeLeftMsRef.current = null;
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
    const currentInitial = initialTimeRef.current;
    let elapsedSeconds = 0;
    if (endTimeRef.current !== null) {
      const remainingMs = Math.max(0, endTimeRef.current - Date.now());
      const remainingSecs = Math.max(0, Math.ceil(remainingMs / 1000));
      elapsedSeconds = Math.max(0, currentInitial - remainingSecs);
    } else {
      elapsedSeconds = Math.max(0, currentInitial - timeLeftRef.current);
    }

    if (elapsedSeconds >= 10 && onTimerCompleteRef.current) {
      onTimerCompleteRef.current(elapsedSeconds);
      hapticSuccess();
      if (isCompletionChimeEnabled()) {
        void playZenChime();
      }
    } else {
      hapticMedium();
    }

    endTimeRef.current = null;
    timeLeftMsRef.current = null;
    setIsTimerRunning(false);
    setTimeLeft(currentInitial);
    defaultNotificationService.cancelNotification('zen-timer-end');
  }, []);

  return {
    timeLeft,
    initialTime,
    isTimerRunning,
    toggleTimer,
    resetTimer,
    adjustTime,
    setTimerMinutes,
    finishEarlySession,
  };
}
