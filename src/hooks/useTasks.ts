import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Task, DailyTask, RecurrenceType, TaskTag, Subtask } from '../types';
import { parseISO, isValid, subDays, addDays, format } from 'date-fns';
import { ITaskStorage, defaultTaskStorage } from '../services/storage/taskStorage';
import { springLayout } from '../utils/animations';
import { computeCurrentStreak, getDailyTasksForDate } from '../utils/taskSchedule';
import { generateSecureId as generateUniqueId } from '../utils/cryptoRandom';

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
    isPinned?: boolean,
    isInbox?: boolean
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
      isInbox: isInbox || undefined,
    };
    springLayout();
    setTasks(prev => [newTask, ...prev]);
    return newTask;
  }, []);

  const deleteTask = useCallback((taskId: string) => {
    springLayout();
    setTasks(prev => prev.filter(t => t.id !== taskId));
  }, []);

  const deleteTaskInstance = useCallback((taskId: string, dateStr: string) => {
    springLayout();
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
    springLayout();
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
    springLayout();
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
    springLayout();
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        return { ...t, isPinned: !t.isPinned };
      }
      return t;
    }));
  }, []);

  const moveToInbox = useCallback((taskId: string) => {
    springLayout();
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        return { ...t, isInbox: true };
      }
      return t;
    }));
  }, []);

  const triageTask = useCallback((taskId: string, decision: 'today' | 'someday' | 'delete', targetDateStr?: string) => {
    springLayout();
    if (decision === 'delete') {
      setTasks(prev => prev.filter(t => t.id !== taskId));
      return;
    }
    const dateToSet = targetDateStr || format(new Date(), 'yyyy-MM-dd');
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        if (decision === 'today') {
          return { ...t, isInbox: false, date: dateToSet };
        }
        if (decision === 'someday') {
          return { ...t, isInbox: true };
        }
      }
      return t;
    }));
  }, []);

  const deferTaskToTomorrow = useCallback((taskId: string, currentDateStr: string) => {
    const targetDate = parseISO(currentDateStr);
    if (!isValid(targetDate)) return;
    const tomorrowStr = format(addDays(targetDate, 1), 'yyyy-MM-dd');

    springLayout();
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

  const getTasksForDate = useCallback((dateStr: string): DailyTask[] => {
    return getDailyTasksForDate(tasks, dateStr);
  }, [tasks]);

  const rolloverOverdueTasks = useCallback((targetDateStr: string): number => {
    let count = 0;
    springLayout();
    setTasks(prev => prev.map(task => {
      if (task.isArchived) return task;
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
      if (task.isArchived) return false;
      const isNonRecurring = !task.recurrence || task.recurrence === 'none';
      const isCompleted = (Array.isArray(task.completedDates) ? task.completedDates : []).includes(task.date);
      return isNonRecurring && !isCompleted && task.date < todayStr;
    }).length;
  }, [tasks]);

  // Streak engine calculation (indexed O(N) over active tasks)
  const currentStreak = useMemo(() => computeCurrentStreak(tasks), [tasks]);

  const clearAllTasks = useCallback(() => {
    springLayout();
    setTasks([]);
  }, []);

  return {
    tasks,
    isLoaded,
    addTask,
    clearAllTasks,
    deleteTask,
    deleteTaskInstance,
    deleteTaskFuture,
    restoreTask,
    toggleTaskCompletion,
    editTask,
    togglePinTask,
    moveToInbox,
    triageTask,
    deferTaskToTomorrow,
    toggleSubtask,
    addTaskFocusTime,
    getTasksForDate,
    rolloverOverdueTasks,
    getOverdueTasksCount,
    currentStreak,
  };
}
