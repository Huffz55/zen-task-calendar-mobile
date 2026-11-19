import React from 'react';
import { useApp } from '../../context/AppContext';
import { TodayScreen } from '../../screens/TodayScreen';
import { ZenTriageModal } from '../../components/common/ZenTriageModal';

export default function TodayRoute() {
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
    moveToInbox,
    triageTask,
    inboxTasks,
    isTriageModalOpen,
    setIsTriageModalOpen,
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
    <>
      <TodayScreen
        theme={theme}
        currentStreak={currentStreak}
        tasks={currentDayTasks}
        selectedDate={selectedDate}
        todayStr={todayStr}
        onSelectDate={setSelectedDate}
        getTaskCountForDate={getTaskCountForDate}
        onToggleTask={id => toggleTaskCompletion(id, selectedDateStr)}
        onAddTask={(title, dateStr, rec, tag, subtasks, estimatedMinutes, isPinned, isEvening, isGhost, isInbox) => {
          addTask(title, dateStr, rec, tag, subtasks, estimatedMinutes, isPinned, isEvening, isGhost, isInbox);
          showToast({
            type: 'success',
            title: isInbox ? 'Saved to Inbox' : 'Added',
            message: isInbox ? `"${title}" added to triage queue` : `"${title}" added to your plan`,
          });
        }}
        onEditTask={handleEditTask}
        onTogglePin={togglePinTask}
        onMoveToInbox={moveToInbox}
        onOpenTriage={() => setIsTriageModalOpen(true)}
        inboxCount={inboxTasks.length}
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
      <ZenTriageModal
        visible={isTriageModalOpen}
        theme={theme}
        inboxTasks={inboxTasks}
        onTriageDecision={triageTask}
        onQuickAddTask={(title) => {
          addTask(title, selectedDateStr, 'none', undefined, undefined, undefined, false, false, false, true);
        }}
        onClose={() => setIsTriageModalOpen(false)}
      />
    </>
  );
}
