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

  return (
    <FocusScreen
      theme={theme}
      currentStreak={currentStreak}
      timeLeft={timeLeft}
      initialTime={initialTime}
      isTimerRunning={isTimerRunning}
      focusStats={focusStats}
      activeFocusTask={activeFocusTask}
      onClearActiveFocusTask={() => {
        dismissFocusTaskCompletion();
        setActiveFocusTask(null);
      }}
      showFocusTaskCompletion={hasCompletedSession && canCompleteFocusTask}
      onCompleteFocusTask={completeActiveFocusTask}
      onDismissFocusCompletion={dismissFocusTaskCompletion}
      isZenBreathingOpen={isZenBreathingOpen}
      onOpenZenBreathing={() => setIsZenBreathingOpen(true)}
      onCloseZenBreathing={() => setIsZenBreathingOpen(false)}
      onToggleTimer={toggleTimer}
      onResetTimer={resetTimer}
      onSetMinutes={setTimerMinutes}
      onFinishEarlySession={finishEarlySession}
      onOpenThemeModal={() => setIsThemeModalOpen(true)}
      onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
      onOpenSyncModal={() => setIsSyncModalOpen(true)}
    />
  );
}
