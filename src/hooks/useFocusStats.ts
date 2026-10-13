import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format, subDays } from 'date-fns';
import { FocusSession } from '../types';

export const FOCUS_SESSIONS_STORAGE_KEY = '@noteapp_mobile_focus_sessions_v1';

function generateUniqueId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`;
}

export interface DayFocusStat {
  dayName: string;
  dateStr: string;
  seconds: number;
  isToday: boolean;
}

export function useFocusStats() {
  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(FOCUS_SESSIONS_STORAGE_KEY)
      .then(stored => {
        if (!mounted) return;
        if (stored) {
          try {
            const raw = JSON.parse(stored);
            if (Array.isArray(raw)) {
              setSessions(raw);
            }
          } catch {}
        }
        setIsLoaded(true);
      })
      .catch(() => setIsLoaded(true));

    return () => {
      mounted = false;
    };
  }, []);

  const saveSessions = useCallback((updated: FocusSession[]) => {
    setSessions(updated);
    AsyncStorage.setItem(FOCUS_SESSIONS_STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
  }, []);

  const recordSession = useCallback(
    (durationSeconds: number) => {
      if (durationSeconds <= 0) return;
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      const newSession: FocusSession = {
        id: generateUniqueId(),
        date: todayStr,
        durationSeconds,
        timestamp: Date.now(),
      };
      saveSessions([newSession, ...sessions]);
    },
    [sessions, saveSessions]
  );

  const stats = useMemo(() => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    let totalSeconds = 0;
    let todaySeconds = 0;

    for (const s of sessions) {
      totalSeconds += s.durationSeconds;
      if (s.date === todayStr) {
        todaySeconds += s.durationSeconds;
      }
    }

    // Last 7 days breakdown (6 days ago -> today)
    const days: DayFocusStat[] = [];
    const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (let i = 6; i >= 0; i--) {
      const d = subDays(new Date(), i);
      const dStr = format(d, 'yyyy-MM-dd');
      const dayIndex = d.getDay();
      const dayName = WEEK_DAYS[dayIndex];

      const daySecs = sessions
        .filter(s => s.date === dStr)
        .reduce((sum, s) => sum + s.durationSeconds, 0);

      days.push({
        dayName,
        dateStr: dStr,
        seconds: daySecs,
        isToday: i === 0,
      });
    }

    const maxDaySeconds = Math.max(1, ...days.map(d => d.seconds));

    return {
      totalFocusSeconds: totalSeconds,
      totalSessionsCount: sessions.length,
      todayFocusSeconds: todaySeconds,
      weeklyDays: days,
      maxDaySeconds,
    };
  }, [sessions]);

  return {
    sessions,
    isLoaded,
    recordSession,
    stats,
  };
}
