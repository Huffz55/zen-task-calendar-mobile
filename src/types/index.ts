export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'biweekly';

export type TaskTag = 'work' | 'personal' | 'health' | 'ideas' | 'priority';

export type AppTheme = 'sakura' | 'matcha' | 'nordic' | 'midnight';

export type MobileTab = 'today' | 'calendar' | 'lists' | 'focus';

export interface Task {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  recurrence: RecurrenceType;
  tag?: TaskTag;
  completedDates: string[]; // YYYY-MM-DD list when completed
  excludedDates?: string[]; // YYYY-MM-DD list when skipped/deleted for single day
  endDate?: string; // YYYY-MM-DD when recurrence ends
  updatedAt?: number; // epoch ms for conflict resolution
}

export interface DailyTask {
  id: string;
  title: string;
  isCompleted: boolean;
  taskId: string;
  recurrence: RecurrenceType;
  tag?: TaskTag;
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
}

export interface AppToast {
  type: 'success' | 'info' | 'warning' | 'error' | 'undo';
  title?: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}
