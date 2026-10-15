import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format } from 'date-fns';

import { AppTheme, AppToast, Task, CustomList, TaskTag, RecurrenceType, DailyTask } from '../types';
import { THEMES, ThemeColors } from '../constants/colors';
import { THEME_STORAGE_KEY } from '../services/storage/taskStorage';
import { defaultNotificationService } from '../services/notifications/notificationService';
import { defaultBackupService } from '../services/storage/backupService';

import { useTasks } from '../hooks/useTasks';
import { useLists } from '../hooks/useLists';
import { useZenTimer } from '../hooks/useZenTimer';
import { useFocusStats, DayFocusStat } from '../hooks/useFocusStats';
import { hapticSuccess, hapticWarning } from '../hooks/useHaptics';

interface AppContextValue {
  // Theme
  theme: ThemeColors;
  currentThemeKey: AppTheme;
  setTheme: (theme: AppTheme) => void;
  isThemeModalOpen: boolean;
  setIsThemeModalOpen: (open: boolean) => void;

  // Settings & Backup
  isSettingsModalOpen: boolean;
  setIsSettingsModalOpen: (open: boolean) => void;
  isSyncModalOpen: boolean;
  setIsSyncModalOpen: (open: boolean) => void;
  handleExportBackup: () => Promise<void>;
  handleImportBackup: () => Promise<void>;

  // Focus Stats
  focusStats: {
    totalFocusSeconds: number;
    totalSessionsCount: number;
    todayFocusSeconds: number;
    weeklyDays: DayFocusStat[];
    maxDaySeconds: number;
  };
  recordFocusSession: (durationSeconds: number) => void;

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
  addTask: (title: string, date: string, recurrence?: RecurrenceType, tag?: TaskTag) => Task;
  deleteTask: (taskId: string) => void;
  deleteTaskInstance: (taskId: string, dateStr: string) => void;
  deleteTaskFuture: (taskId: string, dateStr: string) => void;
  restoreTask: (task: Task) => void;
  toggleTaskCompletion: (taskId: string, dateStr: string) => void;
  editTask: (taskId: string, newTitle: string, newTag?: TaskTag) => void;
  getTasksForDate: (dateStr: string) => DailyTask[];
  getTaskCountForDate: (dateStr: string) => number;
  handleSingleDelete: (taskId: string) => void;
  handleInstanceDelete: (taskId: string, dateStr: string) => void;
  handleFutureDelete: (taskId: string, dateStr: string) => void;
  handleEditTask: (taskId: string, newTitle: string, newTag?: TaskTag) => void;
  handleRollover: () => void;

  // Lists Engine
  lists: CustomList[];
  addList: (title: string) => CustomList | undefined;
  deleteList: (listId: string) => void;
  restoreList: (list: CustomList) => void;
  addListItem: (listId: string, text: string) => void;
  deleteListItem: (listId: string, itemId: string) => void;
  toggleListItem: (listId: string, itemId: string) => void;
  handleDeleteList: (listId: string) => void;

  // Zen Focus Timer Engine
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

export function AppProvider({ children }: { children: ReactNode }) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentThemeKey, setCurrentThemeKey] = useState<AppTheme>('sakura');
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [toast, setToast] = useState<AppToast | null>(null);

  // Focus sessions and analytics engine
  const { stats: focusStats, recordSession: recordFocusSession } = useFocusStats();

  // Load theme preference from AsyncStorage
  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY).then(saved => {
      if (saved && saved in THEMES) {
        setCurrentThemeKey(saved as AppTheme);
      }
    });
  }, []);

  const showToast = useCallback((t: AppToast) => {
    setToast(t);
  }, []);

  const dismissToast = useCallback(() => {
    setToast(null);
  }, []);

  const handleSelectTheme = (theme: AppTheme) => {
    setCurrentThemeKey(theme);
    AsyncStorage.setItem(THEME_STORAGE_KEY, theme).catch(() => {});
    showToast({
      type: 'info',
      title: 'Theme Changed',
      message: `Switched to ${THEMES[theme].name} theme ${THEMES[theme].icon}`,
    });
  };

  const theme: ThemeColors = THEMES[currentThemeKey] || THEMES.sakura;

  // Task Management Engine
  const {
    tasks,
    addTask,
    deleteTask,
    deleteTaskInstance,
    deleteTaskFuture,
    restoreTask,
    toggleTaskCompletion,
    editTask,
    getTasksForDate,
    rolloverOverdueTasks,
    getOverdueTasksCount,
    currentStreak,
  } = useTasks();

  // Custom Lists Management Engine
  const {
    lists,
    addList,
    deleteList,
    restoreList,
    addListItem,
    deleteListItem,
    toggleListItem,
  } = useLists();

  // Zen Focus Timer Engine (auto-records completed sessions to analytics)
  const {
    timeLeft,
    initialTime,
    isTimerRunning,
    toggleTimer,
    resetTimer,
    adjustTime,
    setTimerMinutes,
    finishEarlySession,
  } = useZenTimer(25, recordFocusSession);

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
  const currentDayTasks = getTasksForDate(selectedDateStr);
  const overdueCount = getOverdueTasksCount(todayStr);

  // Sync morning daily notification with today's tasks
  useEffect(() => {
    const todayCount = getTasksForDate(todayStr).length;
    defaultNotificationService.scheduleDailySummary(9, 0, todayCount).catch(() => {});
  }, [getTasksForDate, todayStr, tasks]);

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
    (taskId: string, newTitle: string, newTag?: TaskTag) => {
      editTask(taskId, newTitle, newTag);
      showToast({
        type: 'info',
        title: 'Task Updated',
        message: `"${newTitle}" updated successfully 🌸`,
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
        title: 'Tasks Rolled Over!',
        message: `${count} overdue task${count > 1 ? 's' : ''} moved to today 🌸`,
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
          message: `${tasks.length} tasks and ${lists.length} lists prepared for export 🌸`,
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
        message: `${imported.tasks.length} tasks and ${imported.lists.length} lists restored successfully 🌸`,
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

  const getTaskCountForDate = useCallback(
    (dateStr: string) => {
      return getTasksForDate(dateStr).length;
    },
    [getTasksForDate]
  );

  return (
    <AppContext.Provider
      value={{
        theme,
        currentThemeKey,
        setTheme: handleSelectTheme,
        isThemeModalOpen,
        setIsThemeModalOpen,
        isSettingsModalOpen,
        setIsSettingsModalOpen,
        isSyncModalOpen,
        setIsSyncModalOpen,
        handleExportBackup,
        handleImportBackup,
        focusStats,
        recordFocusSession,
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
        getTasksForDate,
        getTaskCountForDate,
        handleSingleDelete,
        handleInstanceDelete,
        handleFutureDelete,
        handleEditTask,
        handleRollover,
        lists,
        addList,
        deleteList,
        restoreList,
        addListItem,
        deleteListItem,
        toggleListItem,
        handleDeleteList,
        timeLeft,
        initialTime,
        isTimerRunning,
        toggleTimer,
        resetTimer,
        adjustTime,
        setTimerMinutes,
        finishEarlySession,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
