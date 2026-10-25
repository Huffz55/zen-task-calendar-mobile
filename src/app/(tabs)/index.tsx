import React from 'react';
import { useApp } from '../../context/AppContext';
import { TodayScreen } from '../../screens/TodayScreen';

export default function TodayRoute() {
  const {
    theme,
    currentStreak,
    currentDayTasks,
    selectedDate,
    setSelectedDate,
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
    duplicateTask,
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

  return (
    <TodayScreen
      theme={theme}
      currentStreak={currentStreak}
      tasks={currentDayTasks}
      selectedDate={selectedDate}
      onSelectDate={setSelectedDate}
      getTaskCountForDate={getTaskCountForDate}
      onToggleTask={id => toggleTaskCompletion(id, selectedDateStr)}
      onAddTask={(title, dateStr, rec, tag, subtasks, estimatedMinutes, isPinned) => {
        addTask(title, dateStr, rec, tag, subtasks, estimatedMinutes, isPinned);
        showToast({
          type: 'success',
          title: 'Added',
          message: `"${title}" added to your plan 🌸`,
        });
      }}
      onEditTask={handleEditTask}
      onTogglePin={togglePinTask}
      onDeferTask={deferTaskToTomorrow}
      onDuplicateTask={(taskId, dateStr) => {
        const dup = duplicateTask(taskId, dateStr);
        if (dup) {
          showToast({
            type: 'success',
            title: 'Task Duplicated 📋',
            message: `Created copy of "${dup.title.replace(' (Copy)', '')}"`,
          });
        }
      }}
      onDeleteSingle={handleSingleDelete}
      onDeleteInstance={handleInstanceDelete}
      onDeleteFuture={handleFutureDelete}
      onToggleSubtask={toggleSubtask}
      onStartFocus={startTaskFocus}
      onOpenThemeModal={() => setIsThemeModalOpen(true)}
      onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
      onOpenSyncModal={() => setIsSyncModalOpen(true)}
      isEveningReviewOpen={isEveningReviewOpen}
      onOpenEveningReview={() => setIsEveningReviewOpen(true)}
      onCloseEveningReview={() => setIsEveningReviewOpen(false)}
      todayFocusSeconds={focusStats.todayFocusSeconds}
      overdueCount={overdueCount}
      onRolloverTasks={handleRollover}
    />
  );
}
