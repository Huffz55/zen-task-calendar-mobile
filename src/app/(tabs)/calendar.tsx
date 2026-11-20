import { useApp } from '../../context/AppContext';
import { CalendarScreen } from '../../screens/CalendarScreen';
import { useTranslation } from '../../i18n';

export default function CalendarRoute() {
  const { t } = useTranslation();
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
      onAddTask={(title, dateStr, rec, tag, subtasks, estimatedMinutes, isPinned, isInbox) => {
        addTask(title, dateStr, rec, tag, subtasks, estimatedMinutes, isPinned, isInbox);
        showToast({
          type: 'success',
          title: isInbox ? t('toasts.savedToInboxTitle') : t('toasts.addedTitle'),
          message: isInbox
            ? t('toasts.savedToInboxMessage', { title })
            : t('toasts.addedCalendarMessage', { title }),
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
