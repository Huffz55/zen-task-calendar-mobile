import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { ThemeColors } from '../constants/colors';
import { Header } from '../components/common/Header';
import { ZenTimerView } from '../components/timer/ZenTimerView';
import { AmbientSoundBar } from '../components/timer/AmbientSoundBar';
import { FocusAnalyticsCard } from '../components/timer/FocusAnalyticsCard';
import { DayFocusStat } from '../hooks/useFocusStats';

interface FocusScreenProps {
  theme: ThemeColors;
  currentStreak: number;
  timeLeft: number;
  initialTime: number;
  isTimerRunning: boolean;
  focusStats: {
    totalFocusSeconds: number;
    totalSessionsCount: number;
    todayFocusSeconds: number;
    weeklyDays: DayFocusStat[];
    maxDaySeconds: number;
  };
  onToggleTimer: () => void;
  onResetTimer: () => void;
  onAdjustTime: (deltaSeconds: number) => void;
  onSetMinutes: (minutes: number) => void;
  onFinishEarlySession?: () => void;
  onOpenThemeModal: () => void;
  onOpenSettingsModal?: () => void;
  onOpenSyncModal?: () => void;
}

export function FocusScreen({
  theme,
  currentStreak,
  timeLeft,
  initialTime,
  isTimerRunning,
  focusStats,
  onToggleTimer,
  onResetTimer,
  onAdjustTime,
  onSetMinutes,
  onFinishEarlySession,
  onOpenThemeModal,
  onOpenSettingsModal,
  onOpenSyncModal,
}: FocusScreenProps) {
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Header
        theme={theme}
        currentStreak={currentStreak}
        onOpenThemeModal={onOpenThemeModal}
        onOpenSettingsModal={onOpenSettingsModal}
        onOpenSyncModal={onOpenSyncModal}
        title="Zen Focus"
        subtitle="Clear Mind & Deep Focus"
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <ZenTimerView
          timeLeft={timeLeft}
          initialTime={initialTime}
          isTimerRunning={isTimerRunning}
          theme={theme}
          onToggleTimer={onToggleTimer}
          onResetTimer={onResetTimer}
          onAdjustTime={onAdjustTime}
          onSetMinutes={onSetMinutes}
          onFinishEarly={onFinishEarlySession}
        />

        {/* Ambient Sound Selector */}
        <AmbientSoundBar theme={theme} isTimerRunning={isTimerRunning} />

        {/* Weekly Focus Analytics Card */}
        <FocusAnalyticsCard
          theme={theme}
          totalFocusSeconds={focusStats.totalFocusSeconds}
          totalSessionsCount={focusStats.totalSessionsCount}
          todayFocusSeconds={focusStats.todayFocusSeconds}
          weeklyDays={focusStats.weeklyDays}
          maxDaySeconds={focusStats.maxDaySeconds}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 10,
    paddingBottom: 110,
  },
});
