import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ThemeColors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { hapticMedium } from '../../hooks/useHaptics';

interface ZenTimerViewProps {
  timeLeft: number;
  initialTime: number;
  isTimerRunning: boolean;
  theme: ThemeColors;
  onToggleTimer: () => void;
  onResetTimer: () => void;
  onAdjustTime: (deltaSeconds: number) => void;
  onSetMinutes: (minutes: number) => void;
}

export function ZenTimerView({
  timeLeft,
  initialTime,
  isTimerRunning,
  theme,
  onToggleTimer,
  onResetTimer,
  onAdjustTime,
  onSetMinutes,
}: ZenTimerViewProps) {
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const presets = [15, 25, 45, 60];

  return (
    <View style={styles.container}>
      {/* Zen Focus Status Pill */}
      <View style={[styles.statusPill, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}>
        <View
          style={[
            styles.statusDot,
            { backgroundColor: isTimerRunning ? theme.success : theme.primary },
          ]}
        />
        <Text style={[styles.statusText, { color: theme.textMuted }]}>
          {isTimerRunning ? 'Focus Active 🧘' : 'Break / Ready'}
        </Text>
      </View>

      {/* Big Circular Clock Card */}
      <View
        style={[
          styles.clockCard,
          {
            backgroundColor: theme.card,
            borderColor: isTimerRunning ? theme.primary : theme.border,
            shadowColor: theme.primary,
          },
        ]}
      >
        <Text style={[styles.timeDigits, { color: theme.text }]}>{timeFormatted}</Text>
        <Text style={[styles.timeSub, { color: theme.textDim }]}>
          {isTimerRunning ? 'Deep Focus Mode' : 'Tap to start'}
        </Text>

        {/* Adjust Buttons */}
        <View style={styles.adjustRow}>
          <TouchableOpacity
            style={[styles.adjustBtn, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}
            onPress={() => onAdjustTime(-300)}
          >
            <Text style={[styles.adjustBtnText, { color: theme.text }]}>-5 min</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.adjustBtn, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}
            onPress={() => onAdjustTime(300)}
          >
            <Text style={[styles.adjustBtnText, { color: theme.text }]}>+5 min</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Play/Pause & Reset Controls */}
      <View style={styles.controlsRow}>
        <TouchableOpacity
          style={[styles.resetBtn, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}
          onPress={onResetTimer}
          activeOpacity={0.7}
        >
          <Ionicons name="reload-outline" size={22} color={theme.textDim} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.playBtn, { backgroundColor: theme.primary }]}
          onPress={onToggleTimer}
          activeOpacity={0.8}
        >
          <Ionicons
            name={isTimerRunning ? 'pause' : 'play'}
            size={32}
            color="#ffffff"
            style={{ marginLeft: isTimerRunning ? 0 : 3 }}
          />
        </TouchableOpacity>
      </View>

      {/* Preset Minutes Chips */}
      <View style={styles.presetSection}>
        <Text style={[styles.presetLabel, { color: theme.textDim }]}>PRESET DURATIONS</Text>
        <View style={styles.presetRow}>
          {presets.map(mins => {
            const isCurrentPreset = initialTime === mins * 60;
            return (
              <TouchableOpacity
                key={mins}
                style={[
                  styles.presetChip,
                  {
                    backgroundColor: isCurrentPreset ? theme.primaryLight : theme.surfaceMuted,
                    borderColor: isCurrentPreset ? theme.primary : theme.border,
                  },
                ]}
                onPress={() => {
                  hapticMedium();
                  onSetMinutes(mins);
                }}
              >
                <Text
                  style={[
                    styles.presetText,
                    {
                      color: isCurrentPreset ? theme.primary : theme.textMuted,
                      fontWeight: isCurrentPreset ? '700' : '500',
                    },
                  ]}
                >
                  {mins} min
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 20,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  clockCard: {
    width: '100%',
    maxWidth: 320,
    aspectRatio: 1,
    borderRadius: 160,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    padding: 24,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  timeDigits: {
    fontSize: 54,
    fontWeight: '800',
    letterSpacing: -1,
  },
  timeSub: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  adjustRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
  },
  adjustBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  adjustBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    marginTop: 28,
  },
  resetBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  playBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  presetSection: {
    alignItems: 'center',
    marginTop: 26,
    width: '100%',
  },
  presetLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  presetRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  presetChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
  },
  presetText: {
    fontSize: 12,
  },
});
