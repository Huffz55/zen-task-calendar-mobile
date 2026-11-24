import { useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { TodayScreen } from '../../screens/TodayScreen';
import { useTranslation } from '../../i18n';
import type { RecurrenceType, Subtask, TaskTag } from '../../types';

export default function TodayRoute() {
  const { t } = useTranslation();
  const {
    theme,
    currentStreak,
    currentDayTasks,
    customTags,
    selectedDate,
    setSelectedDate,
    todayStr,
    getTaskCountForDate,
    toggleTaskCompletion,
    selectedDateStr,
    addTask,
    showToast,
    handleSingleDelete,
    handleInstanceDelete,
    handleFutureDelete,
    handleEditTask,
    togglePinTask,
    deferTaskToTomorrow,
    toggleSubtask,
    startTaskFocus,
    setIsThemeModalOpen,
    setIsSettingsModalOpen,
    setIsSyncModalOpen,
    isEveningReviewOpen,
    setIsEveningReviewOpen,
    focusStats,
    overdueCount,
    handleRollover,
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
        message: t('toasts.addedPlanMessage', { title }),
      });
    },
    [addTask, showToast, t]
  );

  const handleOpenThemeModal = useCallback(() => setIsThemeModalOpen(true), [setIsThemeModalOpen]);
  const handleOpenSettingsModal = useCallback(() => setIsSettingsModalOpen(true), [setIsSettingsModalOpen]);
  const handleOpenSyncModal = useCallback(() => setIsSyncModalOpen(true), [setIsSyncModalOpen]);
  const handleOpenEveningReview = useCallback(() => setIsEveningReviewOpen(true), [setIsEveningReviewOpen]);
  const handleCloseEveningReview = useCallback(() => setIsEveningReviewOpen(false), [setIsEveningReviewOpen]);

  return (
    <TodayScreen
      theme={theme}
      currentStreak={currentStreak}
      tasks={currentDayTasks}
      customTags={customTags}
      selectedDate={selectedDate}
      todayStr={todayStr}
      onSelectDate={setSelectedDate}
      getTaskCountForDate={getTaskCountForDate}
      onToggleTask={handleToggleTask}
      onAddTask={handleAddTask}
      onEditTask={handleEditTask}
      onTogglePin={togglePinTask}
      onDeferTask={deferTaskToTomorrow}
      onDeleteSingle={handleSingleDelete}
      onDeleteInstance={handleInstanceDelete}
      onDeleteFuture={handleFutureDelete}
      onToggleSubtask={toggleSubtask}
      onStartFocus={startTaskFocus}
      onOpenThemeModal={handleOpenThemeModal}
      onOpenSettingsModal={handleOpenSettingsModal}
      onOpenSyncModal={handleOpenSyncModal}
      isEveningReviewOpen={isEveningReviewOpen}
      onOpenEveningReview={handleOpenEveningReview}
      onCloseEveningReview={handleCloseEveningReview}
      todayFocusSeconds={focusStats.todayFocusSeconds}
      overdueCount={overdueCount}
      onRolloverTasks={handleRollover}
    />
  );
}
