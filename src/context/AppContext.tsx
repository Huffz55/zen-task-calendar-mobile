import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { addDays, format, startOfDay } from 'date-fns';
import { router } from 'expo-router';

import { AppTheme, AppToast, Task, CustomList, CustomTag, BuiltinTaskTag, TaskTag, RecurrenceType, DailyTask, Subtask } from '../types';
import { TAGS, normalizeTagId } from '../constants/tags';
import { THEMES, ThemeColors } from '../constants/colors';
import { THEME_STORAGE_KEY, CUSTOM_TAGS_STORAGE_KEY, clearAllWorkspaceData } from '../services/storage/taskStorage';
import { defaultNotificationService } from '../services/notifications/notificationService';
import { defaultBackupService } from '../services/storage/backupService';
import { validateCustomTag, safeJsonParse, sanitizeText } from '../services/validation/validator';

import { useTasks } from '../hooks/useTasks';
import { useLists } from '../hooks/useLists';
import { useZenTimer } from '../hooks/useZenTimer';
import { useFocusStats, DayFocusStat, HeatmapDay } from '../hooks/useFocusStats';
import { hapticSuccess, hapticWarning } from '../hooks/useHaptics';

interface AppContextValue {
  // Theme
  theme: ThemeColors;
  currentThemeKey: AppTheme;
  setTheme: (theme: AppTheme) => void;
  isThemeModalOpen: boolean;
  setIsThemeModalOpen: (open: boolean) => void;
  autoNightShift: boolean;
  toggleAutoNightShift: (enabled: boolean) => void;

  // Settings & Backup
  isSettingsModalOpen: boolean;
  setIsSettingsModalOpen: (open: boolean) => void;
  isSyncModalOpen: boolean;
  setIsSyncModalOpen: (open: boolean) => void;
  handleExportBackup: () => Promise<void>;
  handleImportBackup: () => Promise<void>;
  handleClearAllData: () => Promise<void>;

  // Focus Stats
  focusStats: {
    totalFocusSeconds: number;
    totalSessionsCount: number;
    todayFocusSeconds: number;
    weeklyDays: DayFocusStat[];
    maxDaySeconds: number;
    heatmapDays?: HeatmapDay[];
  };
  recordFocusSession: (durationSeconds: number, taskId?: string, taskTitle?: string) => void;
  activeFocusTask: { id: string; title: string } | null;
  setActiveFocusTask: (task: { id: string; title: string } | null) => void;
  startTaskFocus: (task: { id: string; title: string }) => void;
  isEveningReviewOpen: boolean;
  setIsEveningReviewOpen: (open: boolean) => void;
  isZenBreathingOpen: boolean;
  setIsZenBreathingOpen: (open: boolean) => void;

  // Toast
  toast: AppToast | null;
  showToast: (t: AppToast) => void;
  dismissToast: () => void;

  // Date selection
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  selectedDateStr: string;
  todayStr: string;

  // Tasks Engine
  tasks: Task[];
  currentDayTasks: DailyTask[];
  currentStreak: number;
  overdueCount: number;
  addTask: (title: string, date: string, recurrence?: RecurrenceType, tag?: TaskTag, subtasks?: Subtask[], estimatedMinutes?: number, isPinned?: boolean, isEvening?: boolean, isGhost?: boolean, isInbox?: boolean) => Task;
  deleteTask: (taskId: string) => void;
  deleteTaskInstance: (taskId: string, dateStr: string) => void;
  deleteTaskFuture: (taskId: string, dateStr: string) => void;
  restoreTask: (task: Task) => void;
  toggleTaskCompletion: (taskId: string, dateStr: string) => void;
  editTask: (taskId: string, newTitle: string, newTag?: TaskTag, subtasks?: Subtask[], estimatedMinutes?: number, isPinned?: boolean) => void;
  togglePinTask: (taskId: string) => void;
  toggleEveningTask: (taskId: string) => void;
  toggleGhostTask: (taskId: string) => void;
  moveToInbox: (taskId: string) => void;
  triageTask: (taskId: string, decision: 'today' | 'someday' | 'delete') => void;
  getInboxTasks: () => Task[];
  inboxTasks: Task[];
  isTriageModalOpen: boolean;
  setIsTriageModalOpen: (open: boolean) => void;
  deferTaskToTomorrow: (taskId: string, currentDateStr: string) => void;
  duplicateTask: (taskId: string, dateStr: string) => Task | null;
  toggleSubtask: (taskId: string, subtaskId: string) => void;
  addSubtask: (taskId: string, title: string) => void;
  deleteSubtask: (taskId: string, subtaskId: string) => void;
  addTaskFocusTime: (taskId: string, seconds: number) => void;
  getTasksForDate: (dateStr: string) => DailyTask[];
  getTaskCountForDate: (dateStr: string) => number;
  handleSingleDelete: (taskId: string) => void;
  handleInstanceDelete: (taskId: string, dateStr: string) => void;
  handleFutureDelete: (taskId: string, dateStr: string) => void;
  handleEditTask: (taskId: string, newTitle: string, newTag?: TaskTag, subtasks?: Subtask[], estimatedMinutes?: number, isPinned?: boolean) => void;
  handleRollover: () => void;
  unarchiveTask: (taskId: string, targetDateStr?: string) => void;
  getArchivedTasks: () => Task[];

  // Lists Engine
  lists: CustomList[];
  addList: (title: string, folder?: string) => CustomList | undefined;
  updateListFolder: (listId: string, folder?: string) => void;
  deleteList: (listId: string) => void;
  restoreList: (list: CustomList) => void;
  addListItem: (listId: string, text: string) => void;
  deleteListItem: (listId: string, itemId: string) => void;
  toggleListItem: (listId: string, itemId: string) => void;
  handleDeleteList: (listId: string) => void;

  // Custom Tags Engine
  customTags: CustomTag[];
  addCustomTag: (label: string, color: string) => TaskTag | null;
  deleteCustomTag: (id: string) => void;

  // Zen Focus Timer Engine (boolean flag stays in AppContext; high-freq ticks live in TimerContext)
  hasActiveTimerSession: boolean;
}

interface TimerContextValue {
  timeLeft: number;
  initialTime: number;
  isTimerRunning: boolean;
  toggleTimer: () => void;
  resetTimer: () => void;
  adjustTime: (deltaSeconds: number) => void;
  setTimerMinutes: (minutes: number) => void;
  finishEarlySession: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);
const TimerContext = createContext<TimerContextValue | null>(null);

const AUTO_NIGHT_STORAGE_KEY = '@noteapp_auto_night_shift';

export function AppProvider({ children }: { children: ReactNode }) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [daytimeThemeKey, setDaytimeThemeKey] = useState<AppTheme>('sakura');
  const [autoNightShift, setAutoNightShift] = useState(false);
  const [customTags, setCustomTags] = useState<CustomTag[]>([]);
  const [isNightTime, setIsNightTime] = useState(() => {
    const h = new Date().getHours();
    return h >= 20 || h < 7;
  });
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [toast, setToast] = useState<AppToast | null>(null);

  // Focus sessions and analytics engine
  const { stats: focusStats, recordSession: recordFocusSession, clearAllSessions } = useFocusStats();

  // Load theme and auto night preferences from AsyncStorage
  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY).then(saved => {
      if (saved && saved in THEMES) {
        setDaytimeThemeKey(saved as AppTheme);
      }
    });
    AsyncStorage.getItem(AUTO_NIGHT_STORAGE_KEY).then(saved => {
      if (saved !== null) {
        setAutoNightShift(saved === 'true');
      }
    });
    AsyncStorage.getItem(CUSTOM_TAGS_STORAGE_KEY).then(saved => {
      if (saved) {
        const parsed = safeJsonParse<unknown>(saved);
        if (Array.isArray(parsed)) {
          const valid = parsed.map(validateCustomTag).filter((t): t is CustomTag => t !== null).slice(0, 50);
          setCustomTags(valid);
        }
      }
    });
  }, []);

  const addCustomTag = useCallback((label: string, color: string): TaskTag | null => {
    const cleanLabel = sanitizeText(label, 24).replace(/[\r\n]/g, '');
    const id = normalizeTagId(cleanLabel);
    const cleanColor = /^#[0-9a-fA-F]{6}$/.test(color.trim()) ? color.trim() : '#f43f5e';
    if (!cleanLabel || !id) return null;
    if (id in TAGS) return id as BuiltinTaskTag;

    setCustomTags(prev => {
      const exists = prev.some(t => t.id === id);
      const next = exists
        ? prev.map(t => (t.id === id ? { ...t, label: cleanLabel, color: cleanColor } : t))
        : [...prev.slice(-49), { id, label: cleanLabel, color: cleanColor }];
      AsyncStorage.setItem(CUSTOM_TAGS_STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
    return id as TaskTag;
  }, []);

  const deleteCustomTag = useCallback((id: string) => {
    setCustomTags(prev => {
      const next = prev.filter(t => t.id !== id);
      AsyncStorage.setItem(CUSTOM_TAGS_STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  // Check night hours every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const h = new Date().getHours();
      const night = h >= 20 || h < 7;
      setIsNightTime(prev => (prev !== night ? night : prev));
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const showToast = useCallback((t: AppToast) => {
    setToast(t);
  }, []);

  const dismissToast = useCallback(() => {
    setToast(null);
  }, []);

  const toggleAutoNightShift = useCallback((enabled: boolean) => {
    setAutoNightShift(enabled);
    AsyncStorage.setItem(AUTO_NIGHT_STORAGE_KEY, String(enabled)).catch(() => {});
    showToast({
      type: 'info',
      title: enabled ? 'Auto Dark Mode On' : 'Auto Dark Mode Off',
      message: enabled
        ? 'Theme will switch to dark mode between 20:00 and 07:00'
        : 'App will stay on your selected theme',
    });
  }, [showToast]);

  const handleSelectTheme = useCallback((selectedTheme: AppTheme) => {
    setDaytimeThemeKey(selectedTheme);
    // If autoNightShift is active at night and user explicitly picks a theme,
    // turn off autoNightShift so user's explicit theme takes immediate effect
    if (autoNightShift && isNightTime && selectedTheme !== 'midnight') {
      setAutoNightShift(false);
      AsyncStorage.setItem(AUTO_NIGHT_STORAGE_KEY, 'false').catch(() => {});
    }
    AsyncStorage.setItem(THEME_STORAGE_KEY, selectedTheme).catch(() => {});
    showToast({
      type: 'info',
      title: 'Theme Changed',
      message: `Switched to ${THEMES[selectedTheme].name}`,
    });
  }, [autoNightShift, isNightTime, showToast]);

  const currentThemeKey: AppTheme = (autoNightShift && isNightTime) ? 'midnight' : daytimeThemeKey;
  const theme: ThemeColors = THEMES[currentThemeKey] || THEMES.sakura;

  // Task Management Engine
  const {
    tasks,
    addTask,
    clearAllTasks,
    deleteTask,
    deleteTaskInstance,
    deleteTaskFuture,
    restoreTask,
    toggleTaskCompletion,
    editTask,
    togglePinTask,
    toggleEveningTask,
    toggleGhostTask,
    moveToInbox,
    triageTask,
    getInboxTasks,
    deferTaskToTomorrow,
    duplicateTask,
    toggleSubtask,
    addSubtask,
    deleteSubtask,
    addTaskFocusTime,
    getTasksForDate,
    unarchiveTask,
    getArchivedTasks,
    rolloverOverdueTasks,
    getOverdueTasksCount,
    currentStreak,
  } = useTasks();

  // Custom Lists Management Engine
  const {
    lists,
    addList,
    updateListFolder,
    clearAllLists,
    deleteList,
    restoreList,
    addListItem,
    deleteListItem,
    toggleListItem,
  } = useLists();

  // Active focus task, breathing modal, and evening review states
  const [activeFocusTask, setActiveFocusTask] = useState<{ id: string; title: string } | null>(null);
  const [isEveningReviewOpen, setIsEveningReviewOpen] = useState(false);
  const [isZenBreathingOpen, setIsZenBreathingOpen] = useState(false);
  const [isTriageModalOpen, setIsTriageModalOpen] = useState(false);
  const [hasActiveTimerSession, setHasActiveTimerSession] = useState(false);

  const inboxTasks = useMemo(
    () => tasks.filter(t => t.isInbox && !t.isArchived),
    [tasks]
  );

  const handleTimerComplete = useCallback((elapsedSeconds: number) => {
    recordFocusSession(elapsedSeconds, activeFocusTask?.id, activeFocusTask?.title);
    if (activeFocusTask) {
      addTaskFocusTime(activeFocusTask.id, elapsedSeconds);
      const mins = Math.max(1, Math.round(elapsedSeconds / 60));
      showToast({
        type: 'success',
        title: 'Focus Logged',
        message: `${mins}m dedicated to "${activeFocusTask.title}"`,
      });
    }
    // Offer / trigger Zen Breathing break
    setIsZenBreathingOpen(true);
  }, [recordFocusSession, activeFocusTask, addTaskFocusTime, showToast]);

  const startTaskFocus = useCallback((task: { id: string; title: string }) => {
    setActiveFocusTask(task);
    router.navigate('/(tabs)/focus');
    showToast({
      type: 'info',
      title: 'Target Set',
      message: `Focusing on "${task.title}"`,
    });
  }, [showToast]);

  const [todayStr, setTodayStr] = useState<string>(() => format(new Date(), 'yyyy-MM-dd'));

  const refreshTodayDate = useCallback(() => {
    const now = new Date();
    const nextTodayStr = format(now, 'yyyy-MM-dd');
    if (nextTodayStr !== todayStr) {
      setTodayStr(nextTodayStr);
      setSelectedDate(prevSelected =>
        format(prevSelected, 'yyyy-MM-dd') === todayStr ? now : prevSelected
      );
    }
  }, [todayStr]);

  // Automatically refresh todayStr at local midnight (00:00)
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    const scheduleMidnightCheck = () => {
      const now = new Date();
      const nextMidnight = startOfDay(addDays(now, 1));
      const msUntilMidnight = Math.max(1000, nextMidnight.getTime() - now.getTime() + 100);
      timeoutId = setTimeout(() => {
        refreshTodayDate();
        scheduleMidnightCheck();
      }, msUntilMidnight);
    };

    scheduleMidnightCheck();
    return () => clearTimeout(timeoutId);
  }, [todayStr, refreshTodayDate]);

  // Refresh todayStr (and night-mode state) when returning to foreground on a new day
  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        refreshTodayDate();
        const h = new Date().getHours();
        const night = h >= 20 || h < 7;
        setIsNightTime(prev => (prev !== night ? night : prev));
      }
    };
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [refreshTodayDate]);

  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
  const currentDayTasks = useMemo(
    () => getTasksForDate(selectedDateStr),
    [getTasksForDate, selectedDateStr]
  );
  const overdueCount = useMemo(
    () => getOverdueTasksCount(todayStr),
    [getOverdueTasksCount, todayStr]
  );

  const todayTasksSnapshot = useMemo(() => {
    const todayList = getTasksForDate(todayStr);
    return {
      total: todayList.length,
      pending: todayList.filter(t => !t.isCompleted).length,
    };
  }, [getTasksForDate, todayStr]);

  // Debounced sync for daily notifications when today's task counts actually change
  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      try {
        const pairs = await AsyncStorage.multiGet([
          '@noteapp_setting_morning_summary',
          '@noteapp_setting_evening_winddown',
        ]);
        if (!active) return;

        const morningEnabled = pairs[0]?.[1] === 'true';
        const eveningEnabled = pairs[1]?.[1] === 'true';

        if (morningEnabled) {
          await defaultNotificationService.scheduleDailySummary(9, 0, todayTasksSnapshot.total);
        } else {
          await defaultNotificationService.cancelNotification('daily-summary');
        }

        if (eveningEnabled) {
          await defaultNotificationService.scheduleEveningWindDown(20, 30, todayTasksSnapshot.pending);
        } else {
          await defaultNotificationService.cancelNotification('evening-winddown');
        }
      } catch {
        // Ignore storage read errors silently
      }
    }, 450);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [todayTasksSnapshot]);

  const handleSingleDelete = useCallback(
    (taskId: string) => {
      const taskToDelete = tasks.find(t => t.id === taskId);
      if (taskToDelete) {
        hapticWarning();
        deleteTask(taskId);
        showToast({
          type: 'undo',
          title: 'Task Deleted',
          message: `"${taskToDelete.title}" removed`,
          actionLabel: 'Undo',
          onAction: () => restoreTask(taskToDelete),
        });
      }
    },
    [tasks, deleteTask, restoreTask, showToast]
  );

  const handleInstanceDelete = useCallback(
    (taskId: string, dateStr: string) => {
      const taskToModify = tasks.find(t => t.id === taskId);
      if (taskToModify) {
        hapticWarning();
        deleteTaskInstance(taskId, dateStr);
        showToast({
          type: 'undo',
          title: 'Deleted from Day',
          message: `"${taskToModify.title}" skipped for this date`,
          actionLabel: 'Undo',
          onAction: () => restoreTask(taskToModify),
        });
      }
    },
    [tasks, deleteTaskInstance, restoreTask, showToast]
  );

  const handleFutureDelete = useCallback(
    (taskId: string, dateStr: string) => {
      const taskToModify = tasks.find(t => t.id === taskId);
      if (taskToModify) {
        hapticWarning();
        deleteTaskFuture(taskId, dateStr);
        showToast({
          type: 'undo',
          title: 'Future Occurrences Deleted',
          message: `"${taskToModify.title}" stopped from this date onwards`,
          actionLabel: 'Undo',
          onAction: () => restoreTask(taskToModify),
        });
      }
    },
    [tasks, deleteTaskFuture, restoreTask, showToast]
  );

  const handleEditTask = useCallback(
    (
      taskId: string,
      newTitle: string,
      newTag?: TaskTag,
      subtasks?: Subtask[],
      estimatedMinutes?: number,
      isPinned?: boolean
    ) => {
      editTask(taskId, newTitle, newTag, subtasks, estimatedMinutes, isPinned);
      showToast({
        type: 'info',
        title: 'Task Updated',
        message: `"${newTitle}" updated`,
      });
    },
    [editTask, showToast]
  );

  const handleDeleteList = useCallback(
    (listId: string) => {
      const listToDelete = lists.find(l => l.id === listId);
      if (listToDelete) {
        hapticWarning();
        deleteList(listId);
        showToast({
          type: 'undo',
          title: 'List Deleted',
          message: `"${listToDelete.title}" removed`,
          actionLabel: 'Undo',
          onAction: () => restoreList(listToDelete),
        });
      }
    },
    [lists, deleteList, restoreList, showToast]
  );

  const handleRollover = useCallback(() => {
    const count = rolloverOverdueTasks(todayStr);
    if (count > 0) {
      hapticSuccess();
      showToast({
        type: 'success',
        title: 'Tasks Rolled Over',
        message: `${count} overdue task${count > 1 ? 's' : ''} moved to today`,
      });
    }
  }, [rolloverOverdueTasks, todayStr, showToast]);

  const handleExportBackup = useCallback(async () => {
    try {
      const success = await defaultBackupService.exportBackup(tasks, lists);
      if (success) {
        showToast({
          type: 'success',
          title: 'Backup Exported',
          message: `${tasks.length} tasks and ${lists.length} lists exported`,
        });
      }
    } catch {
      showToast({
        type: 'error',
        title: 'Backup Error',
        message: 'Backup file could not be exported.',
      });
    }
  }, [tasks, lists, showToast]);

  const handleImportBackup = useCallback(async () => {
    try {
      const imported = await defaultBackupService.importBackup();
      if (!imported) return;

      for (const t of imported.tasks) {
        restoreTask(t);
      }
      for (const l of imported.lists) {
        restoreList(l);
      }

      showToast({
        type: 'success',
        title: 'Backup Restored',
        message: `${imported.tasks.length} tasks and ${imported.lists.length} lists restored`,
      });
      setIsSettingsModalOpen(false);
    } catch {
      showToast({
        type: 'error',
        title: 'Import Error',
        message: 'Invalid or corrupted backup file.',
      });
    }
  }, [restoreTask, restoreList, showToast]);

  const handleClearAllData = useCallback(async () => {
    try {
      await clearAllWorkspaceData();
      clearAllTasks();
      clearAllLists();
      clearAllSessions();
      setCustomTags([]);
      setActiveFocusTask(null);
      await defaultNotificationService.cancelAll();
      hapticWarning();
      showToast({
        type: 'info',
        title: 'Data Cleared',
        message: 'All local and synced data has been erased',
      });
    } catch {
      showToast({
        type: 'error',
        title: 'Reset Error',
        message: 'Could not erase all workspace data.',
      });
    }
  }, [clearAllTasks, clearAllLists, clearAllSessions, showToast]);

  const getTaskCountForDate = useCallback(
    (dateStr: string) => {
      return getTasksForDate(dateStr).length;
    },
    [getTasksForDate]
  );

  const appValue = useMemo<AppContextValue>(
    () => ({
      theme,
      currentThemeKey,
      setTheme: handleSelectTheme,
      isThemeModalOpen,
      setIsThemeModalOpen,
      autoNightShift,
      toggleAutoNightShift,
      isSettingsModalOpen,
      setIsSettingsModalOpen,
      isSyncModalOpen,
      setIsSyncModalOpen,
      handleExportBackup,
      handleImportBackup,
      handleClearAllData,
      focusStats,
      recordFocusSession,
      activeFocusTask,
      setActiveFocusTask,
      startTaskFocus,
      isEveningReviewOpen,
      setIsEveningReviewOpen,
      isZenBreathingOpen,
      setIsZenBreathingOpen,
      toast,
      showToast,
      dismissToast,
      selectedDate,
      setSelectedDate,
      selectedDateStr,
      todayStr,
      tasks,
      currentDayTasks,
      currentStreak,
      overdueCount,
      addTask,
      deleteTask,
      deleteTaskInstance,
      deleteTaskFuture,
      restoreTask,
      toggleTaskCompletion,
      editTask,
      togglePinTask,
      toggleEveningTask,
      toggleGhostTask,
      moveToInbox,
      triageTask,
      getInboxTasks,
      inboxTasks,
      isTriageModalOpen,
      setIsTriageModalOpen,
      deferTaskToTomorrow,
      duplicateTask,
      toggleSubtask,
      addSubtask,
      deleteSubtask,
      addTaskFocusTime,
      getTasksForDate,
      getTaskCountForDate,
      handleSingleDelete,
      handleInstanceDelete,
      handleFutureDelete,
      handleEditTask,
      handleRollover,
      unarchiveTask,
      getArchivedTasks,
      lists,
      addList,
      updateListFolder,
      deleteList,
      restoreList,
      addListItem,
      deleteListItem,
      toggleListItem,
      handleDeleteList,
      customTags,
      addCustomTag,
      deleteCustomTag,
      hasActiveTimerSession,
    }),
    [
      theme,
      currentThemeKey,
      handleSelectTheme,
      isThemeModalOpen,
      autoNightShift,
      toggleAutoNightShift,
      isSettingsModalOpen,
      isSyncModalOpen,
      handleExportBackup,
      handleImportBackup,
      handleClearAllData,
      focusStats,
      recordFocusSession,
      activeFocusTask,
      startTaskFocus,
      isEveningReviewOpen,
      isZenBreathingOpen,
      toast,
      showToast,
      dismissToast,
      selectedDate,
      selectedDateStr,
      todayStr,
      tasks,
      currentDayTasks,
      currentStreak,
      overdueCount,
      addTask,
      deleteTask,
      deleteTaskInstance,
      deleteTaskFuture,
      restoreTask,
      toggleTaskCompletion,
      editTask,
      togglePinTask,
      toggleEveningTask,
      toggleGhostTask,
      moveToInbox,
      triageTask,
      getInboxTasks,
      inboxTasks,
      isTriageModalOpen,
      deferTaskToTomorrow,
      duplicateTask,
      toggleSubtask,
      addSubtask,
      deleteSubtask,
      addTaskFocusTime,
      getTasksForDate,
      getTaskCountForDate,
      handleSingleDelete,
      handleInstanceDelete,
      handleFutureDelete,
      handleEditTask,
      handleRollover,
      unarchiveTask,
      getArchivedTasks,
      lists,
      addList,
      updateListFolder,
      deleteList,
      restoreList,
      addListItem,
      deleteListItem,
      toggleListItem,
      handleDeleteList,
      customTags,
      addCustomTag,
      deleteCustomTag,
      hasActiveTimerSession,
    ]
  );

  return (
    <AppContext.Provider value={appValue}>
      <TimerProvider
        onTimerComplete={handleTimerComplete}
        onActiveSessionChange={setHasActiveTimerSession}
      >
        {children}
      </TimerProvider>
    </AppContext.Provider>
  );
}

function TimerProvider({
  onTimerComplete,
  onActiveSessionChange,
  children,
}: {
  onTimerComplete: (durationSeconds: number) => void;
  onActiveSessionChange: (active: boolean) => void;
  children: ReactNode;
}) {
  const {
    timeLeft,
    initialTime,
    isTimerRunning,
    toggleTimer,
    resetTimer,
    adjustTime,
    setTimerMinutes,
    finishEarlySession,
  } = useZenTimer(25, onTimerComplete);

  const hasActive = isTimerRunning || (timeLeft < initialTime && timeLeft > 0);
  useEffect(() => {
    onActiveSessionChange(hasActive);
  }, [hasActive, onActiveSessionChange]);

  const value = useMemo<TimerContextValue>(
    () => ({
      timeLeft,
      initialTime,
      isTimerRunning,
      toggleTimer,
      resetTimer,
      adjustTime,
      setTimerMinutes,
      finishEarlySession,
    }),
    [
      timeLeft,
      initialTime,
      isTimerRunning,
      toggleTimer,
      resetTimer,
      adjustTime,
      setTimerMinutes,
      finishEarlySession,
    ]
  );

  return <TimerContext.Provider value={value}>{children}</TimerContext.Provider>;
}

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

export function useTimer(): TimerContextValue {
  const context = useContext(TimerContext);
  if (!context) {
    throw new Error('useTimer must be used within an AppProvider');
  }
  return context;
}
