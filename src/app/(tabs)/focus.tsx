import React from 'react';
import { useApp } from '../../context/AppContext';
import { FocusScreen } from '../../screens/FocusScreen';

export default function FocusRoute() {
  const {
    theme,
    currentStreak,
    timeLeft,
    initialTime,
    isTimerRunning,
    toggleTimer,
    resetTimer,
    adjustTime,
    setTimerMinutes,
    setIsThemeModalOpen,
    focusStats,
    setIsSettingsModalOpen,
    setIsSyncModalOpen,
  } = useApp();

  return (
    <FocusScreen
      theme={theme}
      currentStreak={currentStreak}
      timeLeft={timeLeft}
      initialTime={initialTime}
      isTimerRunning={isTimerRunning}
      focusStats={focusStats}
      onToggleTimer={toggleTimer}
      onResetTimer={resetTimer}
      onAdjustTime={adjustTime}
      onSetMinutes={setTimerMinutes}
      onOpenThemeModal={() => setIsThemeModalOpen(true)}
      onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
      onOpenSyncModal={() => setIsSyncModalOpen(true)}
    />
  );
}
