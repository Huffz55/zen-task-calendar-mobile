import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors } from '../../constants/colors';
import { hapticLight, hapticSuccess } from '../../hooks/useHaptics';

interface MiniFocusPlayerProps {
  timeLeft: number;
  initialTime: number;
  isTimerRunning: boolean;
  onToggleTimer: () => void;
  onOpenFocus: () => void;
  activeTaskTitle?: string;
  theme: ThemeColors;
}

export function MiniFocusPlayer({
  timeLeft,
  initialTime,
  isTimerRunning,
  onToggleTimer,
  onOpenFocus,
  activeTaskTitle,
  theme,
}: MiniFocusPlayerProps) {
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeFormatted = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  const progressPercent = initialTime > 0 ? Math.min(100, Math.max(0, ((initialTime - timeLeft) / initialTime) * 100)) : 0;

  return (
    <View style={[styles.outerContainer, { backgroundColor: theme.background }]}>
      <TouchableOpacity
        style={[
          styles.container,
          {
            backgroundColor: theme.card,
            borderColor: isTimerRunning ? (theme.accent || theme.primary) : theme.border,
          },
        ]}
        onPress={() => {
          hapticLight();
          onOpenFocus();
        }}
        activeOpacity={0.88}
        accessibilityLabel="Open Zen Focus timer"
      >
        {/* Play / Pause Toggle Button */}
        <TouchableOpacity
          style={[styles.playBtn, { backgroundColor: theme.primaryLight }]}
          onPress={() => {
            if (isTimerRunning) hapticLight();
            else hapticSuccess();
            onToggleTimer();
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel={isTimerRunning ? 'Pause focus timer' : 'Start focus timer'}
        >
          <Ionicons
            name={isTimerRunning ? 'pause' : 'play'}
            size={16}
            color={theme.primary}
            style={!isTimerRunning ? { marginLeft: 2 } : undefined}
          />
        </TouchableOpacity>

        {/* Info & Micro Progress */}
        <View style={styles.centerInfo}>
          <View style={styles.titleRow}>
            <Text style={[styles.timerText, { color: theme.primary }]}>
              {timeFormatted}
            </Text>
            <Text style={[styles.dot, { color: theme.textDim }]}>•</Text>
            <Text style={[styles.taskTitle, { color: theme.text }]} numberOfLines={1}>
              {activeTaskTitle ? `🎯 ${activeTaskTitle}` : 'Zen Focus 🧘'}
            </Text>
          </View>

          {/* Micro Progress Track */}
          <View style={[styles.progressTrack, { backgroundColor: theme.surfaceMuted }]}>
            <View
              style={[
                styles.progressBar,
                {
                  width: `${progressPercent}%`,
                  backgroundColor: theme.primary,
                },
              ]}
            />
          </View>
        </View>

        {/* Expand / Open Chevron */}
        <View style={styles.rightAction}>
          <Ionicons name="chevron-forward" size={16} color={theme.textDim} />
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    paddingHorizontal: 16,
    paddingBottom: 6,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 16,
    borderWidth: 1.2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
    gap: 10,
  },
  playBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  timerText: {
    fontSize: 13,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.2,
  },
  dot: {
    fontSize: 10,
  },
  taskTitle: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  progressTrack: {
    height: 3,
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 1.5,
  },
  rightAction: {
    paddingLeft: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
