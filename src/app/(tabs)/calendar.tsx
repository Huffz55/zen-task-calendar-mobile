import React from 'react';
import { useApp } from '../../context/AppContext';
import { CalendarScreen } from '../../screens/CalendarScreen';

export default function CalendarRoute() {
  const {
    theme,
    currentStreak,
    selectedDate,
    setSelectedDate,
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
    setIsThemeModalOpen,
    setIsSettingsModalOpen,
    setIsSyncModalOpen,
  } = useApp();

  return (
    <CalendarScreen
      theme={theme}
      currentStreak={currentStreak}
      selectedDate={selectedDate}
      onSelectDate={setSelectedDate}
      getTasksForDate={getTasksForDate}
      getTaskCountForDate={getTaskCountForDate}
      onToggleTask={id => toggleTaskCompletion(id, selectedDateStr)}
      onAddTask={(title, dateStr, rec, tag) => {
        addTask(title, dateStr, rec, tag);
        showToast({
          type: 'success',
          title: 'Added',
          message: `"${title}" added to plan 🌸`,
        });
      }}
      onEditTask={handleEditTask}
      onDeleteSingle={handleSingleDelete}
      onDeleteInstance={handleInstanceDelete}
      onDeleteFuture={handleFutureDelete}
      onOpenThemeModal={() => setIsThemeModalOpen(true)}
      onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
      onOpenSyncModal={() => setIsSyncModalOpen(true)}
    />
  );
}
