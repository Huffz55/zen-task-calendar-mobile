import { useState, useEffect, useRef, useCallback } from 'react';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { hapticSuccess, hapticMedium } from './useHaptics';
import { defaultNotificationService } from '../services/notifications/notificationService';
import { playZenChime } from '../services/audio/audioService';

export function useZenTimer(
  defaultMinutes = 25,
  onTimerComplete?: (durationSeconds: number) => void
) {
  const [initialTime, setInitialTime] = useState(defaultMinutes * 60);
  const [timeLeft, setTimeLeft] = useState(defaultMinutes * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  const endTimeRef = useRef<number | null>(null);
  const timeLeftMsRef = useRef<number | null>(null);

  // Keep screen awake while focusing on mobile
  useEffect(() => {
    if (isTimerRunning) {
      activateKeepAwakeAsync('zen-timer-tag').catch(() => {});
    } else {
      deactivateKeepAwake('zen-timer-tag').catch(() => {});
    }
    return () => {
      deactivateKeepAwake('zen-timer-tag').catch(() => {});
    };
  }, [isTimerRunning]);

  const startTimer = useCallback(() => {
    const remainingMs = timeLeftMsRef.current ?? (timeLeft <= 0 ? initialTime * 1000 : timeLeft * 1000);
    endTimeRef.current = Date.now() + remainingMs;
    timeLeftMsRef.current = null;
    setIsTimerRunning(true);
    hapticMedium();

    // Schedule background notification for when user backgrounds app
    defaultNotificationService.scheduleFocusTimerEnd(remainingMs / 1000);
  }, [initialTime, timeLeft]);

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
    setTimeLeft(initialTime);
    hapticMedium();
    defaultNotificationService.cancelNotification('zen-timer-end');
  }, [initialTime]);

  const adjustTime = useCallback((deltaSeconds: number) => {
    setInitialTime(prev => Math.max(60, prev + deltaSeconds));
    if (isTimerRunning) {
      const currentEnd = endTimeRef.current ?? (Date.now() + (timeLeftMsRef.current ?? timeLeft * 1000));
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
  }, [isTimerRunning, timeLeft]);

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

  // High-precision interval ticker with background drift compensation
  useEffect(() => {
    if (!isTimerRunning) return;

    if (endTimeRef.current === null) {
      const remainingMs = timeLeftMsRef.current ?? (timeLeft <= 0 ? initialTime * 1000 : timeLeft * 1000);
      endTimeRef.current = Date.now() + remainingMs;
      timeLeftMsRef.current = null;
    }

    const interval = setInterval(() => {
      if (endTimeRef.current === null) return;
      const remainingMs = Math.max(0, endTimeRef.current - Date.now());
      const remainingSecs = Math.max(0, Math.ceil(remainingMs / 1000));

      setTimeLeft(remainingSecs);

      if (remainingMs <= 0) {
        hapticSuccess();
        playZenChime();
        defaultNotificationService.cancelNotification('zen-timer-end');
        if (onTimerComplete) {
          onTimerComplete(initialTime);
        }
        setIsTimerRunning(false);
        endTimeRef.current = null;
        timeLeftMsRef.current = null;
      }
    }, 500);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTimerRunning, initialTime, onTimerComplete]);

  const finishEarlySession = useCallback(() => {
    let elapsedSeconds = 0;
    if (endTimeRef.current !== null) {
      const remainingMs = Math.max(0, endTimeRef.current - Date.now());
      const remainingSecs = Math.max(0, Math.ceil(remainingMs / 1000));
      elapsedSeconds = Math.max(0, initialTime - remainingSecs);
    } else {
      elapsedSeconds = Math.max(0, initialTime - timeLeft);
    }

    if (elapsedSeconds >= 10 && onTimerComplete) {
      onTimerComplete(elapsedSeconds);
      hapticSuccess();
      playZenChime();
    } else {
      hapticMedium();
    }

    endTimeRef.current = null;
    timeLeftMsRef.current = null;
    setIsTimerRunning(false);
    setTimeLeft(initialTime);
    defaultNotificationService.cancelNotification('zen-timer-end');
  }, [initialTime, timeLeft, onTimerComplete]);

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
