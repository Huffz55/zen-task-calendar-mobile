export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'biweekly';

export type TaskTag = 'work' | 'personal' | 'health' | 'ideas' | 'priority';

export type AppTheme = 'sakura' | 'matcha' | 'nordic' | 'midnight';

export type MobileTab = 'today' | 'calendar' | 'lists' | 'focus';

export interface Subtask {
  id: string;
  title: string;
  isCompleted: boolean;
}

export interface Task {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  recurrence: RecurrenceType;
  tag?: TaskTag;
  completedDates: string[]; // YYYY-MM-DD list when completed
  excludedDates?: string[]; // YYYY-MM-DD list when skipped/deleted for single day
  endDate?: string; // YYYY-MM-DD when recurrence ends
  subtasks?: Subtask[];
  focusedSeconds?: number; // total focus time logged to this task
  isPinned?: boolean; // One Big Thing / Focus of the Day
  estimatedMinutes?: number; // Estimated duration in minutes
  updatedAt?: number; // epoch ms for conflict resolution
}

export interface DailyTask {
  id: string;
  title: string;
  isCompleted: boolean;
  taskId: string;
  recurrence: RecurrenceType;
  tag?: TaskTag;
  subtasks?: Subtask[];
  focusedSeconds?: number;
  isPinned?: boolean;
  estimatedMinutes?: number;
}

export interface ListItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface CustomList {
  id: string;
  title: string;
  items: ListItem[];
  updatedAt?: number; // epoch ms for conflict resolution
}

export interface SyncDocState<T> {
  items: T[];
  deletedIds: string[];
  updatedAt: number;
}

export interface BackupPayload {
  tasks: Task[];
  lists: CustomList[];
  version: string;
  exportedAt: string;
}

export interface FocusSession {
  id: string;
  date: string; // YYYY-MM-DD
  durationSeconds: number;
  timestamp: number;
  taskId?: string;
  taskTitle?: string;
}

export interface AppToast {
  type: 'success' | 'info' | 'warning' | 'error' | 'undo';
  title?: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export interface ZenMilestone {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
}
