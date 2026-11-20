import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, ReactNode } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { addDays, format, startOfDay } from 'date-fns';
import { router } from 'expo-router';

import { AppTheme, AppToast, Task, CustomList, CustomTag, BuiltinTaskTag, TaskTag, RecurrenceType, DailyTask, Subtask } from '../types';
import { TAGS, normalizeTagId } from '../constants/tags';
import { THEMES, ThemeColors } from '../constants/colors';
import { THEME_STORAGE_KEY, CUSTOM_TAGS_STORAGE_KEY, clearAllWorkspaceData } from '../services/storage/taskStorage';
import { defaultNotificationService } from '../services/notifications/notificationService';
import {
  createReminderCoordinator,
  DEFAULT_EVENING_TIME,
  DEFAULT_MORNING_TIME,
} from '../services/notifications/reminderScheduler';
import { createTaskReminderCoordinator } from '../services/notifications/taskReminderScheduler';
import { pauseAudioForBackground, playBambooTap, resumeAudioFromBackground } from '../services/audio/audioService';
import { defaultBackupService } from '../services/storage/backupService';
import { validateCustomTag, safeJsonParse, sanitizeText } from '../services/validation/validator';

import { useTasks } from '../hooks/useTasks';
import { useLists } from '../hooks/useLists';
import { useZenTimer } from '../hooks/useZenTimer';
import { useFocusStats, DayFocusStat, HeatmapDay } from '../hooks/useFocusStats';
import { hapticSuccess, hapticWarning } from '../hooks/useHaptics';
import {
  LANGUAGE_STORAGE_KEY,
  LanguageContext,
  isLanguagePreference,
  resolveActiveLanguage,
  resolveDeviceLanguage,
  setCurrentActiveLanguage,
  translate,
  type AppLanguage,
  type LanguagePreference,
} from '../i18n';

interface AppContextValue {
  // Language
  language: AppLanguage;

  // Theme
  theme: ThemeColors;
  currentThemeKey: AppTheme;
  setTheme: (theme: AppTheme) => void;
  isThemeModalOpen: boolean;
  setIsThemeModalOpen: (open: boolean) => void;
  autoNightShift: boolean;
  toggleAutoNightShift: (enabled: boolean) => void;

  // Settings & Backup
  isHydrated: boolean;
  workspaceResetCount: number;
  morningBriefingEnabled: boolean;
  eveningReviewEnabled: boolean;
  morningTime: string;
  eveningTime: string;
  toggleMorningBriefing: (enabled: boolean) => Promise<void>;
  toggleEveningReview: (enabled: boolean) => Promise<void>;
  updateMorningTime: (timeStr: string) => Promise<void>;
  updateEveningTime: (timeStr: string) => Promise<void>;
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
  activeFocusTask: { id: string; title: string } | null;
  setActiveFocusTask: (task: { id: string; title: string } | null) => void;
  startTaskFocus: (task: { id: string; title: string }) => void;
  isFocusedTaskCompletedToday: boolean;
  canCompleteFocusTask: boolean;
  completeActiveFocusTask: () => void;
  dismissFocusTaskCompletion: () => void;
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
  addTask: (
    title: string,
    date: string,
    recurrence?: RecurrenceType,
    tag?: TaskTag,
    subtasks?: Subtask[],
    estimatedMinutes?: number,
    isPinned?: boolean,
    notes?: string,
    reminderTime?: string
  ) => Task;
  toggleTaskCompletion: (taskId: string, dateStr: string) => void;
  togglePinTask: (taskId: string) => void;
  unscheduledTasks: Task[];
  deferTaskToTomorrow: (taskId: string, currentDateStr: string) => void;
  toggleSubtask: (taskId: string, subtaskId: string) => void;
  getTasksForDate: (dateStr: string) => DailyTask[];
  getTaskCountForDate: (dateStr: string) => number;
  handleSingleDelete: (taskId: string) => void;
  handleInstanceDelete: (taskId: string, dateStr: string) => void;
  handleFutureDelete: (taskId: string, dateStr: string) => void;
  handleEditTask: (
    taskId: string,
    newTitle: string,
    newTag?: TaskTag,
    subtasks?: Subtask[],
    estimatedMinutes?: number,
    isPinned?: boolean,
    notes?: string,
    reminderTime?: string | null,
    recurrence?: RecurrenceType
  ) => void;
  handleRollover: () => void;

  // Lists Engine
  lists: CustomList[];
  addList: (title: string, folder?: string) => CustomList | undefined;
  updateListFolder: (listId: string, folder?: string) => void;
  addListItem: (listId: string, text: string) => void;
  deleteListItem: (listId: string, itemId: string) => void;
  toggleListItem: (listId: string, itemId: string) => void;
  handleDeleteList: (listId: string) => void;

  // Custom Tags Engine
  customTags: CustomTag[];
  addCustomTag: (label: string, color: string) => TaskTag | null;

  // Zen Focus Timer Engine (boolean flag stays in AppContext; high-freq ticks live in TimerContext)
  hasActiveTimerSession: boolean;
}

interface TimerContextValue {
  timeLeft: number;
  initialTime: number;
  isTimerRunning: boolean;
  hasCompletedSession: boolean;
  toggleTimer: () => void;
  resetTimer: () => void;
  setTimerMinutes: (minutes: number) => void;
  finishEarlySession: () => void;
  clearCompletedSession: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);
const TimerContext = createContext<TimerContextValue | null>(null);

const AUTO_NIGHT_STORAGE_KEY = '@noteapp_auto_night_shift';

export function AppProvider({ children }: { children: ReactNode }) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [languagePreference, setLanguagePreferenceState] = useState<LanguagePreference>('system');
  const [deviceLanguage, setDeviceLanguage] = useState<AppLanguage>(() => resolveDeviceLanguage());
  const [daytimeThemeKey, setDaytimeThemeKey] = useState<AppTheme>('matcha');
  const [autoNightShift, setAutoNightShift] = useState(false);
  const [customTags, setCustomTags] = useState<CustomTag[]>([]);
  const [morningBriefingEnabled, setMorningBriefingEnabled] = useState(false);
  const [eveningReviewEnabled, setEveningReviewEnabled] = useState(false);
  const [morningTime, setMorningTime] = useState(DEFAULT_MORNING_TIME);
  const [eveningTime, setEveningTime] = useState(DEFAULT_EVENING_TIME);
  const [isPrefsLoaded, setIsPrefsLoaded] = useState(false);
  const [workspaceResetCount, setWorkspaceResetCount] = useState(0);
  const [isNightTime, setIsNightTime] = useState(() => {
    const h = new Date().getHours();
    return h >= 20 || h < 7;
  });
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [toast, setToast] = useState<AppToast | null>(null);

  const language = useMemo<AppLanguage>(
    () => resolveActiveLanguage(languagePreference, deviceLanguage),
    [languagePreference, deviceLanguage]
  );

  useEffect(() => {
    setCurrentActiveLanguage(language);
  }, [language]);

  const reminderCoordinatorRef = useRef(
    createReminderCoordinator(AsyncStorage, defaultNotificationService)
  );
  const taskReminderCoordinatorRef = useRef(
    createTaskReminderCoordinator(defaultNotificationService)
  );

  // Focus sessions and analytics engine
  const { stats: focusStats, isLoaded: isFocusLoaded, recordSession: recordFocusSession, clearAllSessions } = useFocusStats();

  // Load theme, auto night, custom tags, language, and notification preferences atomically
  useEffect(() => {
    let mounted = true;
    Promise.all([
      AsyncStorage.getItem(THEME_STORAGE_KEY).catch(() => null),
      AsyncStorage.getItem(AUTO_NIGHT_STORAGE_KEY).catch(() => null),
      AsyncStorage.getItem(CUSTOM_TAGS_STORAGE_KEY).catch(() => null),
      AsyncStorage.getItem(LANGUAGE_STORAGE_KEY).catch(() => null),
      reminderCoordinatorRef.current.loadPreferences(),
    ])
      .then(([savedTheme, savedAutoNight, savedTags, savedLanguage, reminderPrefs]) => {
        if (!mounted) return;
        if (savedTheme && savedTheme in THEMES) {
          setDaytimeThemeKey(savedTheme as AppTheme);
        }
        if (savedAutoNight !== null) {
          setAutoNightShift(savedAutoNight === 'true');
        }
        if (savedTags) {
          const parsed = safeJsonParse<unknown>(savedTags);
          if (Array.isArray(parsed)) {
            const valid = parsed.map(validateCustomTag).filter((t): t is CustomTag => t !== null).slice(0, 50);
            setCustomTags(valid);
          }
        }
        if (isLanguagePreference(savedLanguage)) {
          setLanguagePreferenceState(savedLanguage);
          setCurrentActiveLanguage(resolveActiveLanguage(savedLanguage, resolveDeviceLanguage()));
        }
        setMorningBriefingEnabled(reminderPrefs.morningBriefingEnabled);
        setEveningReviewEnabled(reminderPrefs.eveningReviewEnabled);
        setMorningTime(reminderPrefs.morningTime);
        setEveningTime(reminderPrefs.eveningTime);
      })
      .finally(() => {
        if (mounted) {
          setIsPrefsLoaded(true);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  // Pause/resume active audio and refresh OS locale safely on AppState transitions
  useEffect(() => {
    let previousState: AppStateStatus = AppState.currentState;
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'background' && previousState !== 'background') {
        pauseAudioForBackground();
      } else if (nextState === 'active' && previousState === 'background') {
        resumeAudioFromBackground();
        setDeviceLanguage(resolveDeviceLanguage());
      } else if (nextState === 'active') {
        setDeviceLanguage(resolveDeviceLanguage());
      }
      previousState = nextState;
    });
    return () => subscription.remove();
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
      title: translate(language, enabled ? 'toasts.autoNightOnTitle' : 'toasts.autoNightOffTitle'),
      message: translate(language, enabled ? 'toasts.autoNightOnMessage' : 'toasts.autoNightOffMessage'),
    });
  }, [language, showToast]);

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
      title: translate(language, 'toasts.themeChangedTitle'),
      message: translate(language, 'toasts.themeChangedMessage', {
        theme: translate(language, `themes.${selectedTheme}`),
      }),
    });
  }, [autoNightShift, isNightTime, language, showToast]);

  const currentThemeKey: AppTheme = (autoNightShift && isNightTime) ? 'midnight' : daytimeThemeKey;
  const theme: ThemeColors = THEMES[currentThemeKey] || THEMES.matcha;

  // Task Management Engine
  const {
    tasks,
    isLoaded: isTasksLoaded,
    addTask,
    clearAllTasks,
    deleteTask,
    deleteTaskInstance,
    deleteTaskFuture,
    restoreTask,
    toggleTaskCompletion,
    editTask,
    togglePinTask,
    deferTaskToTomorrow,
    toggleSubtask,
    addTaskFocusTime,
    getTasksForDate,
    rolloverOverdueTasks,
    getOverdueTasksCount,
    currentStreak,
  } = useTasks();

  // Custom Lists Management Engine
  const {
    lists,
    isLoaded: isListsLoaded,
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
  const [completedFocusTaskId, setCompletedFocusTaskId] = useState<string | null>(null);
  const [isEveningReviewOpen, setIsEveningReviewOpen] = useState(false);
  const [isZenBreathingOpen, setIsZenBreathingOpen] = useState(false);
  const [hasActiveTimerSession, setHasActiveTimerSession] = useState(false);

  // Legacy unscheduled (isInbox) tasks preserved from older backups or storage
  const unscheduledTasks = useMemo(
    () => tasks.filter(t => t.isInbox && !t.isArchived),
    [tasks]
  );

  const handleTimerComplete = useCallback((elapsedSeconds: number) => {
    recordFocusSession(elapsedSeconds, activeFocusTask?.id, activeFocusTask?.title);
    if (activeFocusTask) {
      setCompletedFocusTaskId(activeFocusTask.id);
      addTaskFocusTime(activeFocusTask.id, elapsedSeconds);
      const mins = Math.max(1, Math.round(elapsedSeconds / 60));
      showToast({
        type: 'success',
        title: translate(language, 'toasts.focusLoggedTitle'),
        message: translate(language, 'toasts.focusLoggedMessage', {
          minutes: mins,
          title: activeFocusTask.title,
        }),
      });
    }
    // Offer / trigger Zen Breathing break
    setIsZenBreathingOpen(true);
  }, [recordFocusSession, activeFocusTask, addTaskFocusTime, language, showToast]);

  const startTaskFocus = useCallback((task: { id: string; title: string }) => {
    setCompletedFocusTaskId(null);
    setActiveFocusTask(task);
    router.navigate('/(tabs)/focus');
    showToast({
      type: 'info',
      title: translate(language, 'toasts.targetSetTitle'),
      message: translate(language, 'toasts.targetSetMessage', { title: task.title }),
    });
  }, [language, showToast]);

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

  const isFocusedTaskCompletedToday = useMemo(() => {
    if (!activeFocusTask) return false;
    const match = tasks.find(t => t.id === activeFocusTask.id);
    if (!match) return false;
    const completedList = Array.isArray(match.completedDates) ? match.completedDates : [];
    return completedList.includes(todayStr);
  }, [activeFocusTask, tasks, todayStr]);

  const canCompleteFocusTask = Boolean(
    activeFocusTask && completedFocusTaskId === activeFocusTask.id && !isFocusedTaskCompletedToday
  );

  const dismissFocusTaskCompletion = useCallback(() => {
    setCompletedFocusTaskId(null);
  }, []);

  const completeActiveFocusTask = useCallback(() => {
    if (!activeFocusTask) return;
    const match = tasks.find(t => t.id === activeFocusTask.id);
    if (!match) return;
    const completedList = Array.isArray(match.completedDates) ? match.completedDates : [];
    if (!completedList.includes(todayStr)) {
      toggleTaskCompletion(activeFocusTask.id, todayStr);
      playBambooTap();
      hapticSuccess();
    }
    setCompletedFocusTaskId(null);
    showToast({
      type: 'success',
      title: translate(language, 'focus.taskMarkedDone'),
      message: activeFocusTask.title,
    });
  }, [activeFocusTask, tasks, todayStr, toggleTaskCompletion, showToast, language]);

  const isHydrated = isPrefsLoaded && isTasksLoaded && isListsLoaded && isFocusLoaded;

  const toggleMorningBriefing = useCallback(
    async (enabled: boolean) => {
      setMorningBriefingEnabled(enabled);
      await reminderCoordinatorRef.current.setMorningEnabled(
        enabled,
        todayTasksSnapshot.total,
        language,
        morningTime
      );
    },
    [todayTasksSnapshot.total, language, morningTime]
  );

  const toggleEveningReview = useCallback(
    async (enabled: boolean) => {
      setEveningReviewEnabled(enabled);
      await reminderCoordinatorRef.current.setEveningEnabled(
        enabled,
        todayTasksSnapshot.pending,
        language,
        eveningTime
      );
    },
    [todayTasksSnapshot.pending, language, eveningTime]
  );

  const updateMorningTime = useCallback(
    async (timeStr: string) => {
      const resolved = await reminderCoordinatorRef.current.setMorningTime(
        timeStr,
        morningBriefingEnabled,
        todayTasksSnapshot.total,
        language
      );
      setMorningTime(resolved);
    },
    [morningBriefingEnabled, todayTasksSnapshot.total, language]
  );

  const updateEveningTime = useCallback(
    async (timeStr: string) => {
      const resolved = await reminderCoordinatorRef.current.setEveningTime(
        timeStr,
        eveningReviewEnabled,
        todayTasksSnapshot.pending,
        language
      );
      setEveningTime(resolved);
    },
    [eveningReviewEnabled, todayTasksSnapshot.pending, language]
  );

  const setLanguagePreference = useCallback(
    async (nextPref: LanguagePreference) => {
      setLanguagePreferenceState(nextPref);
      const currentDeviceLang = resolveDeviceLanguage();
      setDeviceLanguage(currentDeviceLang);
      const nextLang = resolveActiveLanguage(nextPref, currentDeviceLang);
      setCurrentActiveLanguage(nextLang);
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, nextPref).catch(() => {});

      if (isTasksLoaded && isPrefsLoaded) {
        await reminderCoordinatorRef.current.syncForTaskState({
          isLoaded: true,
          morningBriefingEnabled,
          eveningReviewEnabled,
          morningTime,
          eveningTime,
          totalTodayTasks: todayTasksSnapshot.total,
          pendingTodayTasks: todayTasksSnapshot.pending,
          language: nextLang,
        });
      }
    },
    [
      isTasksLoaded,
      isPrefsLoaded,
      morningBriefingEnabled,
      eveningReviewEnabled,
      morningTime,
      eveningTime,
      todayTasksSnapshot.total,
      todayTasksSnapshot.pending,
    ]
  );

  // Debounced sync for daily & per-task notifications only after hydration
  useEffect(() => {
    if (!isTasksLoaded || !isPrefsLoaded) return;

    let active = true;
    const timer = setTimeout(async () => {
      if (!active) return;
      await Promise.all([
        reminderCoordinatorRef.current.syncForTaskState({
          isLoaded: true,
          morningBriefingEnabled,
          eveningReviewEnabled,
          morningTime,
          eveningTime,
          totalTodayTasks: todayTasksSnapshot.total,
          pendingTodayTasks: todayTasksSnapshot.pending,
          language,
        }),
        taskReminderCoordinatorRef.current.syncTasks(tasks, language),
      ]);
    }, 450);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [
    isTasksLoaded,
    isPrefsLoaded,
    morningBriefingEnabled,
    eveningReviewEnabled,
    morningTime,
    eveningTime,
    todayTasksSnapshot,
    tasks,
    language,
  ]);

  const handleSingleDelete = useCallback(
    (taskId: string) => {
      const taskToDelete = tasks.find(t => t.id === taskId);
      if (taskToDelete) {
        hapticWarning();
        deleteTask(taskId);
        void taskReminderCoordinatorRef.current.cancelForTask(taskId);
        showToast({
          type: 'undo',
          title: translate(language, 'toasts.taskDeletedTitle'),
          message: translate(language, 'toasts.taskDeletedMessage', { title: taskToDelete.title }),
          actionLabel: translate(language, 'common.undo'),
          onAction: () => restoreTask(taskToDelete),
        });
      }
    },
    [tasks, deleteTask, restoreTask, language, showToast]
  );

  const handleInstanceDelete = useCallback(
    (taskId: string, dateStr: string) => {
      const taskToModify = tasks.find(t => t.id === taskId);
      if (taskToModify) {
        hapticWarning();
        deleteTaskInstance(taskId, dateStr);
        showToast({
          type: 'undo',
          title: translate(language, 'toasts.instanceDeletedTitle'),
          message: translate(language, 'toasts.instanceDeletedMessage', { title: taskToModify.title }),
          actionLabel: translate(language, 'common.undo'),
          onAction: () => restoreTask(taskToModify),
        });
      }
    },
    [tasks, deleteTaskInstance, restoreTask, language, showToast]
  );

  const handleFutureDelete = useCallback(
    (taskId: string, dateStr: string) => {
      const taskToModify = tasks.find(t => t.id === taskId);
      if (taskToModify) {
        hapticWarning();
        deleteTaskFuture(taskId, dateStr);
        showToast({
          type: 'undo',
          title: translate(language, 'toasts.futureDeletedTitle'),
          message: translate(language, 'toasts.futureDeletedMessage', { title: taskToModify.title }),
          actionLabel: translate(language, 'common.undo'),
          onAction: () => restoreTask(taskToModify),
        });
      }
    },
    [tasks, deleteTaskFuture, restoreTask, language, showToast]
  );

  const handleEditTask = useCallback(
    (
      taskId: string,
      newTitle: string,
      newTag?: TaskTag,
      subtasks?: Subtask[],
      estimatedMinutes?: number,
      isPinned?: boolean,
      notes?: string,
      reminderTime?: string | null,
      recurrence?: RecurrenceType
    ) => {
      editTask(taskId, newTitle, newTag, subtasks, estimatedMinutes, isPinned, notes, reminderTime, recurrence);
      showToast({
        type: 'info',
        title: translate(language, 'toasts.taskUpdatedTitle'),
        message: translate(language, 'toasts.taskUpdatedMessage', { title: newTitle }),
      });
    },
    [editTask, language, showToast]
  );

  const handleDeleteList = useCallback(
    (listId: string) => {
      const listToDelete = lists.find(l => l.id === listId);
      if (listToDelete) {
        hapticWarning();
        deleteList(listId);
        showToast({
          type: 'undo',
          title: translate(language, 'toasts.listDeletedTitle'),
          message: translate(language, 'toasts.listDeletedMessage', { title: listToDelete.title }),
          actionLabel: translate(language, 'common.undo'),
          onAction: () => restoreList(listToDelete),
        });
      }
    },
    [lists, deleteList, restoreList, language, showToast]
  );

  const handleRollover = useCallback(() => {
    const count = rolloverOverdueTasks(todayStr);
    if (count > 0) {
      hapticSuccess();
      showToast({
        type: 'success',
        title: translate(language, 'toasts.rolloverTitle'),
        message: translate(
          language,
          count === 1 ? 'toasts.rolloverOneMessage' : 'toasts.rolloverOtherMessage',
          { count }
        ),
      });
    }
  }, [rolloverOverdueTasks, todayStr, language, showToast]);

  const handleExportBackup = useCallback(async () => {
    try {
      const success = await defaultBackupService.exportBackup(tasks, lists);
      if (success) {
        showToast({
          type: 'success',
          title: translate(language, 'toasts.backupExportedTitle'),
          message: translate(language, 'toasts.backupExportedMessage', {
            tasks: tasks.length,
            lists: lists.length,
          }),
        });
      }
    } catch {
      showToast({
        type: 'error',
        title: translate(language, 'toasts.backupErrorTitle'),
        message: translate(language, 'toasts.backupErrorMessage'),
      });
    }
  }, [tasks, lists, language, showToast]);

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
        title: translate(language, 'toasts.backupRestoredTitle'),
        message: translate(language, 'toasts.backupRestoredMessage', {
          tasks: imported.tasks.length,
          lists: imported.lists.length,
        }),
      });
      setIsSettingsModalOpen(false);
    } catch {
      showToast({
        type: 'error',
        title: translate(language, 'toasts.importErrorTitle'),
        message: translate(language, 'toasts.importErrorMessage'),
      });
    }
  }, [restoreTask, restoreList, language, showToast]);

  const handleClearAllData = useCallback(async () => {
    try {
      setMorningBriefingEnabled(false);
      setEveningReviewEnabled(false);
      setMorningTime(DEFAULT_MORNING_TIME);
      setEveningTime(DEFAULT_EVENING_TIME);
      await reminderCoordinatorRef.current.resetAll();
      taskReminderCoordinatorRef.current.reset();
      await clearAllWorkspaceData();
      clearAllTasks();
      clearAllLists();
      clearAllSessions();
      setCustomTags([]);
      setActiveFocusTask(null);
      setCompletedFocusTaskId(null);
      setWorkspaceResetCount(prev => prev + 1);
      await defaultNotificationService.cancelAll();
      hapticWarning();
      showToast({
        type: 'info',
        title: translate(language, 'toasts.dataClearedTitle'),
        message: translate(language, 'toasts.dataClearedMessage'),
      });
    } catch {
      showToast({
        type: 'error',
        title: translate(language, 'toasts.resetErrorTitle'),
        message: translate(language, 'toasts.resetErrorMessage'),
      });
    }
  }, [clearAllTasks, clearAllLists, clearAllSessions, language, showToast]);

  const getTaskCountForDate = useCallback(
    (dateStr: string) => {
      return getTasksForDate(dateStr).length;
    },
    [getTasksForDate]
  );

  const languageContextValue = useMemo(
    () => ({
      language,
      languagePreference,
      setLanguagePreference,
    }),
    [language, languagePreference, setLanguagePreference]
  );

  const appValue = useMemo<AppContextValue>(
    () => ({
      language,
      theme,
      currentThemeKey,
      setTheme: handleSelectTheme,
      isThemeModalOpen,
      setIsThemeModalOpen,
      autoNightShift,
      toggleAutoNightShift,
      isSettingsModalOpen,
      setIsSettingsModalOpen,
      isHydrated,
      workspaceResetCount,
      morningBriefingEnabled,
      eveningReviewEnabled,
      morningTime,
      eveningTime,
      toggleMorningBriefing,
      toggleEveningReview,
      updateMorningTime,
      updateEveningTime,
      isSyncModalOpen,
      setIsSyncModalOpen,
      handleExportBackup,
      handleImportBackup,
      handleClearAllData,
      focusStats,
      activeFocusTask,
      setActiveFocusTask,
      startTaskFocus,
      isFocusedTaskCompletedToday,
      canCompleteFocusTask,
      completeActiveFocusTask,
      dismissFocusTaskCompletion,
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
      toggleTaskCompletion,
      togglePinTask,
      unscheduledTasks,
      deferTaskToTomorrow,
      toggleSubtask,
      getTasksForDate,
      getTaskCountForDate,
      handleSingleDelete,
      handleInstanceDelete,
      handleFutureDelete,
      handleEditTask,
      handleRollover,
      lists,
      addList,
      updateListFolder,
      addListItem,
      deleteListItem,
      toggleListItem,
      handleDeleteList,
      customTags,
      addCustomTag,
      hasActiveTimerSession,
    }),
    [
      language,
      theme,
      currentThemeKey,
      handleSelectTheme,
      isThemeModalOpen,
      autoNightShift,
      toggleAutoNightShift,
      isSettingsModalOpen,
      isHydrated,
      workspaceResetCount,
      morningBriefingEnabled,
      eveningReviewEnabled,
      morningTime,
      eveningTime,
      toggleMorningBriefing,
      toggleEveningReview,
      updateMorningTime,
      updateEveningTime,
      isSyncModalOpen,
      handleExportBackup,
      handleImportBackup,
      handleClearAllData,
      focusStats,
      activeFocusTask,
      startTaskFocus,
      isFocusedTaskCompletedToday,
      canCompleteFocusTask,
      completeActiveFocusTask,
      dismissFocusTaskCompletion,
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
      toggleTaskCompletion,
      togglePinTask,
      unscheduledTasks,
      deferTaskToTomorrow,
      toggleSubtask,
      getTasksForDate,
      getTaskCountForDate,
      handleSingleDelete,
      handleInstanceDelete,
      handleFutureDelete,
      handleEditTask,
      handleRollover,
      lists,
      addList,
      updateListFolder,
      addListItem,
      deleteListItem,
      toggleListItem,
      handleDeleteList,
      customTags,
      addCustomTag,
      hasActiveTimerSession,
    ]
  );

  return (
    <LanguageContext.Provider value={languageContextValue}>
      <AppContext.Provider value={appValue}>
        <TimerProvider
          onTimerComplete={handleTimerComplete}
          onActiveSessionChange={setHasActiveTimerSession}
        >
          {children}
        </TimerProvider>
      </AppContext.Provider>
    </LanguageContext.Provider>
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
    hasCompletedSession,
    toggleTimer,
    resetTimer,
    setTimerMinutes,
    finishEarlySession,
    clearCompletedSession,
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
      hasCompletedSession,
      toggleTimer,
      resetTimer,
      setTimerMinutes,
      finishEarlySession,
      clearCompletedSession,
    }),
    [
      timeLeft,
      initialTime,
      isTimerRunning,
      hasCompletedSession,
      toggleTimer,
      resetTimer,
      setTimerMinutes,
      finishEarlySession,
      clearCompletedSession,
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
