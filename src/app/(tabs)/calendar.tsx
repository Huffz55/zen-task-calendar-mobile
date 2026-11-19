import React from 'react';
import { useApp } from '../../context/AppContext';
import { CalendarScreen } from '../../screens/CalendarScreen';

export default function CalendarRoute() {
  const {
    theme,
    currentStreak,
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

  return (
    <CalendarScreen
      theme={theme}
      currentStreak={currentStreak}
      selectedDate={selectedDate}
      todayStr={todayStr}
      onSelectDate={setSelectedDate}
      getTasksForDate={getTasksForDate}
      getTaskCountForDate={getTaskCountForDate}
      onToggleTask={id => toggleTaskCompletion(id, selectedDateStr)}
      onAddTask={(title, dateStr, rec, tag, subtasks, estimatedMinutes, isPinned, isEvening, isGhost, isInbox) => {
        addTask(title, dateStr, rec, tag, subtasks, estimatedMinutes, isPinned, isEvening, isGhost, isInbox);
        showToast({
          type: 'success',
          title: isInbox ? 'Saved to Inbox' : 'Added',
          message: isInbox ? `"${title}" added to triage queue` : `"${title}" added to plan`,
        });
      }}
      onEditTask={handleEditTask}
      onDeleteSingle={handleSingleDelete}
      onDeleteInstance={handleInstanceDelete}
      onDeleteFuture={handleFutureDelete}
      onToggleSubtask={toggleSubtask}
      onStartFocus={startTaskFocus}
      onOpenThemeModal={() => setIsThemeModalOpen(true)}
      onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
      onOpenSyncModal={() => setIsSyncModalOpen(true)}
    />
  );
}
