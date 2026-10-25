import { useState, useEffect, useCallback, useMemo } from 'react';
import { Task, DailyTask, RecurrenceType, TaskTag, Subtask } from '../types';
import { differenceInDays, parseISO, isValid, subDays, addDays, format } from 'date-fns';
import { ITaskStorage, defaultTaskStorage } from '../services/storage/taskStorage';

function generateUniqueId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`;
}

export function useTasks(storage: ITaskStorage = defaultTaskStorage) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Initial load from AsyncStorage
  useEffect(() => {
    let mounted = true;
    storage.loadTasks().then(loaded => {
      if (mounted) {
        setTasks(loaded);
        setIsLoaded(true);
      }
    });
    return () => { mounted = false; };
  }, [storage]);

  // Persist to storage whenever tasks change (after initial load)
  useEffect(() => {
    if (isLoaded) {
      storage.saveTasks(tasks);
    }
  }, [tasks, isLoaded, storage]);

  // Real-time cloud subscription
  useEffect(() => {
    if (storage.subscribeTasks) {
      const unsubscribe = storage.subscribeTasks((remoteTasks) => {
        setTasks(remoteTasks);
      });
      return unsubscribe;
    }
  }, [storage]);

  const addTask = useCallback((
    title: string,
    date: string,
    recurrence: RecurrenceType = 'none',
    tag?: TaskTag,
    subtasks?: Subtask[],
    estimatedMinutes?: number,
    isPinned?: boolean
  ) => {
    const newTask: Task = {
      id: generateUniqueId(),
      title: title.trim(),
      date,
      recurrence,
      tag,
      completedDates: [],
      subtasks: subtasks && subtasks.length > 0 ? subtasks : undefined,
      estimatedMinutes: estimatedMinutes && estimatedMinutes > 0 ? estimatedMinutes : undefined,
      isPinned: isPinned || undefined,
    };
    setTasks(prev => [newTask, ...prev]);
    return newTask;
  }, []);

  const deleteTask = useCallback((taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
  }, []);

  const deleteTaskInstance = useCallback((taskId: string, dateStr: string) => {
    setTasks(prev => prev.map(task => {
      if (task.id === taskId) {
        return {
          ...task,
          excludedDates: [...(task.excludedDates || []), dateStr],
        };
      }
      return task;
    }));
  }, []);

  const deleteTaskFuture = useCallback((taskId: string, dateStr: string) => {
    setTasks(prev => prev.map(task => {
      if (task.id === taskId) {
        const targetDate = parseISO(dateStr);
        if (!isValid(targetDate)) return task;
        const prevDayStr = format(subDays(targetDate, 1), 'yyyy-MM-dd');
        return {
          ...task,
          endDate: prevDayStr,
        };
      }
      return task;
    }));
  }, []);

  const toggleTaskCompletion = useCallback((taskId: string, dateStr: string) => {
    setTasks(prev => prev.map(task => {
      if (task.id === taskId) {
        const completedList = Array.isArray(task.completedDates) ? task.completedDates : [];
        const isCompleted = completedList.includes(dateStr);
        const newCompletedDates = isCompleted
          ? completedList.filter(d => d !== dateStr)
          : [...completedList, dateStr];

        return { ...task, completedDates: newCompletedDates };
      }
      return task;
    }));
  }, []);

  const editTask = useCallback((
    taskId: string,
    newTitle: string,
    newTag?: TaskTag,
    subtasks?: Subtask[],
    estimatedMinutes?: number,
    isPinned?: boolean
  ) => {
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          title: newTitle.trim(),
          tag: newTag !== undefined ? newTag : t.tag,
          subtasks: subtasks !== undefined ? subtasks : t.subtasks,
          estimatedMinutes: estimatedMinutes !== undefined ? estimatedMinutes : t.estimatedMinutes,
          isPinned: isPinned !== undefined ? isPinned : t.isPinned,
        };
      }
      return t;
    }));
  }, []);

  const togglePinTask = useCallback((taskId: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        return { ...t, isPinned: !t.isPinned };
      }
      return t;
    }));
  }, []);

  const deferTaskToTomorrow = useCallback((taskId: string, currentDateStr: string) => {
    const targetDate = parseISO(currentDateStr);
    if (!isValid(targetDate)) return;
    const tomorrowStr = format(addDays(targetDate, 1), 'yyyy-MM-dd');

    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        if (t.recurrence !== 'none') {
          return {
            ...t,
            excludedDates: [...(t.excludedDates || []), currentDateStr],
          };
        }
        return { ...t, date: tomorrowStr };
      }
      return t;
    }));
  }, []);

  const duplicateTask = useCallback((taskId: string, dateStr: string) => {
    let duplicated: Task | null = null;
    setTasks(prev => {
      const original = prev.find(t => t.id === taskId);
      if (!original) return prev;
      duplicated = {
        ...original,
        id: generateUniqueId(),
        title: `${original.title} (Copy)`,
        date: dateStr,
        recurrence: 'none',
        completedDates: [],
        subtasks: original.subtasks?.map(s => ({ ...s, id: generateUniqueId(), isCompleted: false })),
        isPinned: false,
      };
      return [duplicated, ...prev];
    });
    return duplicated;
  }, []);

  const toggleSubtask = useCallback((taskId: string, subtaskId: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === taskId && t.subtasks) {
        const updatedSubs = t.subtasks.map(s =>
          s.id === subtaskId ? { ...s, isCompleted: !s.isCompleted } : s
        );
        return { ...t, subtasks: updatedSubs };
      }
      return t;
    }));
  }, []);

  const addSubtask = useCallback((taskId: string, title: string) => {
    const cleanTitle = title.trim();
    if (!cleanTitle) return;
    const newSub: Subtask = {
      id: generateUniqueId(),
      title: cleanTitle,
      isCompleted: false,
    };
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        return { ...t, subtasks: [...(t.subtasks || []), newSub] };
      }
      return t;
    }));
  }, []);

  const deleteSubtask = useCallback((taskId: string, subtaskId: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === taskId && t.subtasks) {
        return { ...t, subtasks: t.subtasks.filter(s => s.id !== subtaskId) };
      }
      return t;
    }));
  }, []);

  const addTaskFocusTime = useCallback((taskId: string, seconds: number) => {
    if (seconds <= 0) return;
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          focusedSeconds: (t.focusedSeconds || 0) + seconds,
        };
      }
      return t;
    }));
  }, []);

  const restoreTask = useCallback((task: Task) => {
    setTasks(prev => {
      const exists = prev.some(t => t.id === task.id);
      if (exists) {
        return prev.map(t => t.id === task.id ? task : t);
      }
      return [task, ...prev];
    });
  }, []);

  const rescheduleTask = useCallback((taskId: string, newDateStr: string) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, date: newDateStr } : t));
  }, []);

  const getTasksForDate = useCallback((dateStr: string): DailyTask[] => {
    const targetDate = parseISO(dateStr);
    if (!isValid(targetDate)) return [];

    const mapped: DailyTask[] = tasks.filter(task => {
      const startDate = parseISO(task.date);
      if (!isValid(startDate)) return false;

      if (dateStr < task.date) return false;
      if (task.excludedDates && task.excludedDates.includes(dateStr)) return false;
      if (task.endDate && dateStr > task.endDate) return false;

      const diffDays = differenceInDays(targetDate, startDate);

      if (task.recurrence === 'none') {
        return dateStr === task.date;
      } else if (task.recurrence === 'daily') {
        return true;
      } else if (task.recurrence === 'weekly') {
        return diffDays % 7 === 0;
      } else if (task.recurrence === 'biweekly') {
        return diffDays % 14 === 0;
      }
      return false;
    }).map(task => ({
      id: `${task.id}-${dateStr}`,
      taskId: task.id,
      title: task.title,
      isCompleted: (Array.isArray(task.completedDates) ? task.completedDates : []).includes(dateStr),
      recurrence: task.recurrence,
      tag: task.tag,
      subtasks: task.subtasks,
      focusedSeconds: task.focusedSeconds,
      isPinned: task.isPinned,
      estimatedMinutes: task.estimatedMinutes,
    }));

    return mapped.sort((a, b) => {
      if (a.isCompleted !== b.isCompleted) {
        return a.isCompleted ? 1 : -1;
      }
      if (a.isPinned !== b.isPinned) {
        return a.isPinned ? -1 : 1;
      }
      return 0;
    });
  }, [tasks]);

  const rolloverOverdueTasks = useCallback((targetDateStr: string): number => {
    let count = 0;
    setTasks(prev => prev.map(task => {
      const isNonRecurring = !task.recurrence || task.recurrence === 'none';
      const isCompleted = (Array.isArray(task.completedDates) ? task.completedDates : []).includes(task.date);
      const isOverdue = task.date < targetDateStr;

      if (isNonRecurring && !isCompleted && isOverdue) {
        count++;
        return { ...task, date: targetDateStr };
      }
      return task;
    }));
    return count;
  }, []);

  const getOverdueTasksCount = useCallback((todayStr: string): number => {
    return tasks.filter(task => {
      const isNonRecurring = !task.recurrence || task.recurrence === 'none';
      const isCompleted = (Array.isArray(task.completedDates) ? task.completedDates : []).includes(task.date);
      return isNonRecurring && !isCompleted && task.date < todayStr;
    }).length;
  }, [tasks]);

  // Streak engine calculation
  const currentStreak = useMemo(() => {
    let streak = 0;
    const today = new Date();
    let checkDate = today;

    const todayStr = format(today, 'yyyy-MM-dd');
    const todayTasks = getTasksForDate(todayStr);
    const todayIsDone = todayTasks.length > 0 && todayTasks.every(t => t.isCompleted);

    if (todayIsDone) {
      streak++;
    }
    checkDate = subDays(checkDate, 1);

    const MAX_DAYS = 365;
    let daysChecked = 0;

    while (daysChecked < MAX_DAYS) {
      daysChecked++;
      const dateStr = format(checkDate, 'yyyy-MM-dd');
      const dayTasks = getTasksForDate(dateStr);
      const isPerfect = dayTasks.length > 0 && dayTasks.every(t => t.isCompleted);

      if (isPerfect) {
        streak++;
        checkDate = subDays(checkDate, 1);
      } else {
        break;
      }
    }

    return streak;
  }, [getTasksForDate]);

  return {
    tasks,
    isLoaded,
    addTask,
    deleteTask,
    deleteTaskInstance,
    deleteTaskFuture,
    restoreTask,
    toggleTaskCompletion,
    editTask,
    togglePinTask,
    deferTaskToTomorrow,
    duplicateTask,
    toggleSubtask,
    addSubtask,
    deleteSubtask,
    addTaskFocusTime,
    rescheduleTask,
    getTasksForDate,
    rolloverOverdueTasks,
    getOverdueTasksCount,
    currentStreak,
  };
}
