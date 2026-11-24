import { useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { CalendarScreen } from '../../screens/CalendarScreen';
import { useTranslation } from '../../i18n';
import type { RecurrenceType, Subtask, TaskTag } from '../../types';

export default function CalendarRoute() {
  const { t } = useTranslation();
  const {
    theme,
    currentStreak,
    customTags,
    selectedDate,
    setSelectedDate,
    todayStr,
    getTasksForDate,
    getTaskCountForDate,
    toggleTaskCompletion,
    selectedDateStr,
    addTask,
    showToast,
    handleSingleDelete,
    handleInstanceDelete,
    handleFutureDelete,
    handleEditTask,
    toggleSubtask,
    startTaskFocus,
    setIsThemeModalOpen,
    setIsSettingsModalOpen,
    setIsSyncModalOpen,
  } = useApp();

  const handleToggleTask = useCallback(
    (id: string) => toggleTaskCompletion(id, selectedDateStr),
    [toggleTaskCompletion, selectedDateStr]
  );

  const handleAddTask = useCallback(
    (
      title: string,
      dateStr: string,
      rec: RecurrenceType,
      tag?: TaskTag,
      subtasks?: Subtask[],
      estimatedMinutes?: number,
      isPinned?: boolean,
      notes?: string,
      reminderTime?: string
    ) => {
      addTask(title, dateStr, rec, tag, subtasks, estimatedMinutes, isPinned, notes, reminderTime);
      showToast({
        type: 'success',
        title: t('toasts.addedTitle'),
        message: t('toasts.addedCalendarMessage', { title }),
      });
    },
    [addTask, showToast, t]
  );

  const handleOpenThemeModal = useCallback(() => setIsThemeModalOpen(true), [setIsThemeModalOpen]);
  const handleOpenSettingsModal = useCallback(() => setIsSettingsModalOpen(true), [setIsSettingsModalOpen]);
  const handleOpenSyncModal = useCallback(() => setIsSyncModalOpen(true), [setIsSyncModalOpen]);

  return (
    <CalendarScreen
      theme={theme}
      currentStreak={currentStreak}
      customTags={customTags}
      selectedDate={selectedDate}
      todayStr={todayStr}
      onSelectDate={setSelectedDate}
      getTasksForDate={getTasksForDate}
      getTaskCountForDate={getTaskCountForDate}
      onToggleTask={handleToggleTask}
      onAddTask={handleAddTask}
      onEditTask={handleEditTask}
      onDeleteSingle={handleSingleDelete}
      onDeleteInstance={handleInstanceDelete}
      onDeleteFuture={handleFutureDelete}
      onToggleSubtask={toggleSubtask}
      onStartFocus={startTaskFocus}
      onOpenThemeModal={handleOpenThemeModal}
      onOpenSettingsModal={handleOpenSettingsModal}
      onOpenSyncModal={handleOpenSyncModal}
    />
  );
}
