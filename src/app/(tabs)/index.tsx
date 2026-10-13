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
    setIsThemeModalOpen,
    setIsSettingsModalOpen,
    setIsSyncModalOpen,
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
      onAddTask={(title, dateStr, rec, tag) => {
        addTask(title, dateStr, rec, tag);
        showToast({
          type: 'success',
          title: 'Added',
          message: `"${title}" added to your plan 🌸`,
        });
      }}
      onEditTask={handleEditTask}
      onDeleteSingle={handleSingleDelete}
      onDeleteInstance={handleInstanceDelete}
      onDeleteFuture={handleFutureDelete}
      onOpenThemeModal={() => setIsThemeModalOpen(true)}
      onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
      onOpenSyncModal={() => setIsSyncModalOpen(true)}
      overdueCount={overdueCount}
      onRolloverTasks={handleRollover}
    />
  );
}
