import { useCallback } from 'react';
import { useApp, useTimer } from '../../context/AppContext';
import { FocusScreen } from '../../screens/FocusScreen';

export default function FocusRoute() {
  const {
    theme,
    currentStreak,
    setIsThemeModalOpen,
    focusStats,
    setIsSettingsModalOpen,
    setIsSyncModalOpen,
    activeFocusTask,
    setActiveFocusTask,
    canCompleteFocusTask,
    completeActiveFocusTask,
    dismissFocusTaskCompletion,
    isZenBreathingOpen,
    setIsZenBreathingOpen,
  } = useApp();
  const {
    timeLeft,
    initialTime,
    isTimerRunning,
    hasCompletedSession,
    toggleTimer,
    resetTimer,
    setTimerMinutes,
    finishEarlySession,
  } = useTimer();

  const handleClearActiveFocusTask = useCallback(() => {
    dismissFocusTaskCompletion();
    setActiveFocusTask(null);
  }, [dismissFocusTaskCompletion, setActiveFocusTask]);

  const handleOpenZenBreathing = useCallback(() => setIsZenBreathingOpen(true), [setIsZenBreathingOpen]);
  const handleCloseZenBreathing = useCallback(() => setIsZenBreathingOpen(false), [setIsZenBreathingOpen]);
  const handleOpenThemeModal = useCallback(() => setIsThemeModalOpen(true), [setIsThemeModalOpen]);
  const handleOpenSettingsModal = useCallback(() => setIsSettingsModalOpen(true), [setIsSettingsModalOpen]);
  const handleOpenSyncModal = useCallback(() => setIsSyncModalOpen(true), [setIsSyncModalOpen]);

  return (
    <FocusScreen
      theme={theme}
      currentStreak={currentStreak}
      timeLeft={timeLeft}
      initialTime={initialTime}
      isTimerRunning={isTimerRunning}
      focusStats={focusStats}
      activeFocusTask={activeFocusTask}
      onClearActiveFocusTask={handleClearActiveFocusTask}
      showFocusTaskCompletion={hasCompletedSession && canCompleteFocusTask}
      onCompleteFocusTask={completeActiveFocusTask}
      onDismissFocusCompletion={dismissFocusTaskCompletion}
      isZenBreathingOpen={isZenBreathingOpen}
      onOpenZenBreathing={handleOpenZenBreathing}
      onCloseZenBreathing={handleCloseZenBreathing}
      onToggleTimer={toggleTimer}
      onResetTimer={resetTimer}
      onSetMinutes={setTimerMinutes}
      onFinishEarlySession={finishEarlySession}
      onOpenThemeModal={handleOpenThemeModal}
      onOpenSettingsModal={handleOpenSettingsModal}
      onOpenSyncModal={handleOpenSyncModal}
    />
  );
}
