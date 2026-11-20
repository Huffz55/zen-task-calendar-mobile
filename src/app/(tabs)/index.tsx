import { useApp } from '../../context/AppContext';
import { TodayScreen } from '../../screens/TodayScreen';
import { useTranslation } from '../../i18n';

export default function TodayRoute() {
  const { t } = useTranslation();
  const {
    theme,
    currentStreak,
    currentDayTasks,
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

  return (
    <TodayScreen
      theme={theme}
      currentStreak={currentStreak}
      tasks={currentDayTasks}
      selectedDate={selectedDate}
      todayStr={todayStr}
      onSelectDate={setSelectedDate}
      getTaskCountForDate={getTaskCountForDate}
      onToggleTask={id => toggleTaskCompletion(id, selectedDateStr)}
      onAddTask={(title, dateStr, rec, tag, subtasks, estimatedMinutes, isPinned) => {
        addTask(title, dateStr, rec, tag, subtasks, estimatedMinutes, isPinned);
        showToast({
          type: 'success',
          title: t('toasts.addedTitle'),
          message: t('toasts.addedPlanMessage', { title }),
        });
      }}
      onEditTask={handleEditTask}
      onTogglePin={togglePinTask}
      onDeferTask={deferTaskToTomorrow}
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
