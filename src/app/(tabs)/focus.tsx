import React from 'react';
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
    isZenBreathingOpen,
    setIsZenBreathingOpen,
  } = useApp();
  const {
    timeLeft,
    initialTime,
    isTimerRunning,
    toggleTimer,
    resetTimer,
    adjustTime,
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
      onClearActiveFocusTask={() => setActiveFocusTask(null)}
      isZenBreathingOpen={isZenBreathingOpen}
      onOpenZenBreathing={() => setIsZenBreathingOpen(true)}
      onCloseZenBreathing={() => setIsZenBreathingOpen(false)}
      onToggleTimer={toggleTimer}
      onResetTimer={resetTimer}
      onAdjustTime={adjustTime}
      onSetMinutes={setTimerMinutes}
      onFinishEarlySession={finishEarlySession}
      onOpenThemeModal={() => setIsThemeModalOpen(true)}
      onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
      onOpenSyncModal={() => setIsSyncModalOpen(true)}
    />
  );
}
