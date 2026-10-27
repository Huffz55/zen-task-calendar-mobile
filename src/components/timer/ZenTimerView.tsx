import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
import { ThemeColors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { hapticMedium, hapticLight } from '../../hooks/useHaptics';
import { playSingingBowl } from '../../services/audio/audioService';

interface ZenTimerViewProps {
  timeLeft: number;
  initialTime: number;
  isTimerRunning: boolean;
  theme: ThemeColors;
  onToggleTimer: () => void;
  onResetTimer: () => void;
  onAdjustTime?: (deltaSeconds: number) => void;
  onSetMinutes: (minutes: number) => void;
  onFinishEarly?: () => void;
}

export function ZenTimerView({
  timeLeft,
  initialTime,
  isTimerRunning,
  theme,
  onToggleTimer,
  onResetTimer,
  onSetMinutes,
  onFinishEarly,
}: ZenTimerViewProps) {
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const presets = [15, 25, 45, 60];

  const [pulseAnim] = useState(() => new Animated.Value(1));

  useEffect(() => {
    if (!isTimerRunning) {
      pulseAnim.setValue(1);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1.0,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();

    return () => loop.stop();
  }, [isTimerRunning, pulseAnim]);

  const handlePlayToggle = () => {
    hapticMedium();
    if (!isTimerRunning) {
      playSingingBowl();
    }
    onToggleTimer();
  };

  const progressPercent = Math.min(100, Math.max(0, ((initialTime - timeLeft) / initialTime) * 100));

  return (
    <View style={styles.container}>
      {/* Big Circular Clock Card with Breathing Glow Aura */}
      <View style={styles.clockCardWrapper}>
        {isTimerRunning && (
          <Animated.View
            style={[
              styles.glowAura,
              {
                backgroundColor: theme.primary,
                transform: [{ scale: pulseAnim }],
              },
            ]}
          />
        )}
        <View
          style={[
            styles.clockCard,
            {
              backgroundColor: theme.card,
              borderColor: isTimerRunning ? theme.primary : theme.border,
            },
          ]}
        >
          {/* Subtle Progress Arc / Ring Indicator */}
          <View style={styles.clockInner}>
            <Text style={[styles.timeDigits, { color: theme.text }]}>
              {timeFormatted}
            </Text>
            <Text style={[styles.timeSub, { color: theme.textDim }]}>
              {isTimerRunning ? 'Deep Focus' : 'Ready'}
            </Text>
          </View>
        </View>
      </View>

      {/* Progress Track */}
      {isTimerRunning && (
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
      )}

      {/* Controls Row */}
      <View style={styles.controlsRow}>
        {/* Reset button */}
        <TouchableOpacity
          style={[styles.secondaryBtn, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}
          onPress={() => {
            hapticLight();
            onResetTimer();
          }}
          activeOpacity={0.7}
          accessibilityLabel="Reset timer"
        >
          <Ionicons name="reload-outline" size={20} color={theme.textDim} />
        </TouchableOpacity>

        {/* Primary Play / Pause Button */}
        <TouchableOpacity
          style={[styles.playBtn, { backgroundColor: theme.primary }]}
          onPress={handlePlayToggle}
          activeOpacity={0.85}
          accessibilityLabel={isTimerRunning ? 'Pause timer' : 'Start timer'}
        >
          <Ionicons
            name={isTimerRunning ? 'pause' : 'play'}
            size={30}
            color="#ffffff"
            style={{ marginLeft: isTimerRunning ? 0 : 3 }}
          />
        </TouchableOpacity>

        {/* Log / Finish Session early button */}
        {(isTimerRunning || timeLeft < initialTime) && onFinishEarly ? (
          <TouchableOpacity
            style={[styles.secondaryBtn, { backgroundColor: theme.primaryLight, borderColor: theme.primary }]}
            onPress={() => {
              hapticMedium();
              onFinishEarly();
            }}
            activeOpacity={0.75}
            accessibilityLabel="Finish and log session"
          >
            <Ionicons name="checkmark" size={20} color={theme.primary} />
          </TouchableOpacity>
        ) : (
          <View style={styles.secondaryPlaceholder} />
        )}
      </View>

      {/* Preset Durations Selector */}
      <View style={[styles.presetBar, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}>
        {presets.map(mins => {
          const isSelected = initialTime === mins * 60;
          return (
            <TouchableOpacity
              key={mins}
              style={[
                styles.presetPill,
                isSelected && { backgroundColor: theme.card, borderColor: theme.border, shadowColor: '#000', elevation: 2 },
              ]}
              onPress={() => {
                hapticLight();
                onSetMinutes(mins);
              }}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.presetText,
                  {
                    color: isSelected ? theme.primary : theme.textDim,
                    fontWeight: isSelected ? '700' : '500',
                  },
                ]}
              >
                {mins}m
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  clockCardWrapper: {
    width: '100%',
    maxWidth: 290,
    aspectRatio: 1,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  glowAura: {
    position: 'absolute',
    width: '92%',
    height: '92%',
    borderRadius: 200,
    opacity: 0.12,
  },
  clockCard: {
    width: '100%',
    height: '100%',
    borderRadius: 200,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 4,
  },
  clockInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeDigits: {
    fontSize: 52,
    fontWeight: '300',
    letterSpacing: -1,
  },
  timeSub: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
    letterSpacing: 0.2,
  },
  progressTrack: {
    width: 140,
    height: 3,
    borderRadius: 1.5,
    overflow: 'hidden',
    marginBottom: 20,
  },
  progressBar: {
    height: '100%',
    borderRadius: 1.5,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 22,
  },
  playBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  secondaryBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryPlaceholder: {
    width: 44,
    height: 44,
  },
  presetBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 3,
    borderRadius: 16,
    borderWidth: 1,
    gap: 2,
  },
  presetPill: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  presetText: {
    fontSize: 12,
  },
});
