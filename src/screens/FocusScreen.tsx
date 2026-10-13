import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { ThemeColors } from '../constants/colors';
import { Header } from '../components/common/Header';
import { ZenTimerView } from '../components/timer/ZenTimerView';
import { AmbientSoundBar } from '../components/timer/AmbientSoundBar';
import { FocusAnalyticsCard } from '../components/timer/FocusAnalyticsCard';
import { DayFocusStat } from '../hooks/useFocusStats';
import { Ionicons } from '@expo/vector-icons';

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

        {/* Focus Tip Card */}
        <View style={[styles.tipCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.tipHeader}>
            <Ionicons name="sunny-outline" size={18} color={theme.primary} />
            <Text style={[styles.tipTitle, { color: theme.text }]}>Deep Focus Tip</Text>
          </View>
          <Text style={[styles.tipText, { color: theme.textDim }]}>
            Screen sleep is kept awake while the timer is running. Mute notifications and immerse yourself in one goal.
          </Text>
        </View>
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
  tipCard: {
    marginHorizontal: 24,
    marginTop: 20,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  tipText: {
    fontSize: 12,
    lineHeight: 18,
  },
});
