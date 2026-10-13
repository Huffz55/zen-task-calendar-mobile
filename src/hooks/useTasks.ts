import { useState, useEffect, useCallback, useMemo } from 'react';
import { Task, DailyTask, RecurrenceType, TaskTag } from '../types';
import { differenceInDays, parseISO, isValid, subDays, format } from 'date-fns';
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

  const addTask = useCallback((title: string, date: string, recurrence: RecurrenceType = 'none', tag?: TaskTag) => {
    const newTask: Task = {
      id: generateUniqueId(),
      title: title.trim(),
      date,
      recurrence,
      tag,
      completedDates: [],
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

  const editTask = useCallback((taskId: string, newTitle: string, newTag?: TaskTag) => {
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        return { ...t, title: newTitle.trim(), tag: newTag !== undefined ? newTag : t.tag };
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

    return tasks.filter(task => {
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
    }));
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
    rescheduleTask,
    getTasksForDate,
    rolloverOverdueTasks,
    getOverdueTasksCount,
    currentStreak,
  };
}
