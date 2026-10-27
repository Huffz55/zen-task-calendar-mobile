import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { ThemeColors } from '../constants/colors';
import { Header } from '../components/common/Header';
import { ZenTimerView } from '../components/timer/ZenTimerView';
import { AmbientSoundBar } from '../components/timer/AmbientSoundBar';
import { FocusAnalyticsCard } from '../components/timer/FocusAnalyticsCard';
import { ZenHeatmap } from '../components/timer/ZenHeatmap';
import { ZenBreathingModal } from '../components/timer/ZenBreathingModal';
import { DayFocusStat, HeatmapDay } from '../hooks/useFocusStats';
import { Ionicons } from '@expo/vector-icons';
import { hapticLight } from '../hooks/useHaptics';
import { useSwipeTabNavigation } from '../hooks/useSwipeTabNavigation';

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
    heatmapDays?: HeatmapDay[];
  };
  activeFocusTask?: { id: string; title: string } | null;
  onClearActiveFocusTask?: () => void;
  isZenBreathingOpen?: boolean;
  onOpenZenBreathing?: () => void;
  onCloseZenBreathing?: () => void;
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
  activeFocusTask,
  onClearActiveFocusTask,
  isZenBreathingOpen = false,
  onOpenZenBreathing,
  onCloseZenBreathing,
  onToggleTimer,
  onResetTimer,
  onAdjustTime,
  onSetMinutes,
  onFinishEarlySession,
  onOpenThemeModal,
  onOpenSettingsModal,
  onOpenSyncModal,
}: FocusScreenProps) {
  const swipeHandlers = useSwipeTabNavigation('focus');

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]} {...swipeHandlers}>
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
        {/* Linked Focus Target Banner */}
        {activeFocusTask && (
          <View style={[styles.targetBanner, { backgroundColor: theme.primaryLight, borderColor: theme.primary }]}>
            <View style={styles.targetBannerLeft}>
              <Text style={styles.targetEmoji}>🎯</Text>
              <View style={styles.targetTexts}>
                <Text style={[styles.targetSubtitle, { color: theme.primary }]}>FOCUSING ON TARGET</Text>
                <Text style={[styles.targetTitle, { color: theme.text }]} numberOfLines={1}>
                  {activeFocusTask.title}
                </Text>
              </View>
            </View>
            {onClearActiveFocusTask && (
              <TouchableOpacity
                onPress={() => {
                  hapticLight();
                  onClearActiveFocusTask();
                }}
                style={styles.targetClearBtn}
              >
                <Ionicons name="close-circle" size={20} color={theme.primary} />
              </TouchableOpacity>
            )}
          </View>
        )}

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

        {/* Breathing Break Shortcut */}
        {onOpenZenBreathing && (
          <TouchableOpacity
            style={[styles.breathingShortcutBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}
            onPress={() => {
              hapticLight();
              onOpenZenBreathing();
            }}
            activeOpacity={0.7}
          >
            <View style={styles.breathingShortcutLeft}>
              <Ionicons name="leaf-outline" size={18} color={theme.primary} />
              <View>
                <Text style={[styles.breathingTitle, { color: theme.text }]}>Zen Box Breathing</Text>
                <Text style={[styles.breathingSubtitle, { color: theme.textDim }]}>Take a guided 3-minute mindful pause</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.textDim} />
          </TouchableOpacity>
        )}

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

        {/* 12-Week Activity Heatmap */}
        {focusStats.heatmapDays && (
          <ZenHeatmap theme={theme} days={focusStats.heatmapDays} />
        )}
      </ScrollView>

      {/* Breathing Break Modal */}
      {onCloseZenBreathing && (
        <ZenBreathingModal
          isOpen={isZenBreathingOpen}
          onClose={onCloseZenBreathing}
          theme={theme}
        />
      )}
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
  targetBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 24,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
  },
  targetBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  targetEmoji: {
    fontSize: 20,
  },
  targetTexts: {
    flex: 1,
  },
  targetSubtitle: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  targetTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 1,
  },
  targetClearBtn: {
    padding: 4,
    marginLeft: 8,
  },
  breathingShortcutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 24,
    marginTop: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
    borderWidth: 1,
  },
  breathingShortcutLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  breathingTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  breathingSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
});

