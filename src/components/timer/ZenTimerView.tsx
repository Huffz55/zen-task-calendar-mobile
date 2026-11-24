import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
import { ThemeColors, withAlpha } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { hapticMedium, hapticLight, hapticSelection } from '../../hooks/useHaptics';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { useTranslation } from '../../i18n';

interface ZenTimerViewProps {
  timeLeft: number;
  initialTime: number;
  isTimerRunning: boolean;
  theme: ThemeColors;
  onToggleTimer: () => void;
  onResetTimer: () => void;
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
  const { t } = useTranslation();
  const reducedMotion = useReducedMotion();
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const presets = [15, 25, 45, 60];

  const [pulseAnim] = useState(() => new Animated.Value(1));

  useEffect(() => {
    if (!isTimerRunning || reducedMotion) {
      pulseAnim.setValue(1);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.055,
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
  }, [isTimerRunning, pulseAnim, reducedMotion]);

  const handlePlayToggle = () => {
    hapticMedium();
    onToggleTimer();
  };

  const progressPercent = Math.min(100, Math.max(0, ((initialTime - timeLeft) / initialTime) * 100));

  return (
    <View style={styles.container}>
      {/* Compact Circular Clock Dial with Breathing Glow Aura */}
      <View style={styles.clockCardWrapper}>
        {isTimerRunning && (
          <Animated.View
            style={[
              styles.glowAura,
              {
                backgroundColor: withAlpha(theme.primary, theme.isDark ? 0.12 : 0.09),
                borderColor: withAlpha(theme.primary, theme.isDark ? 0.2 : 0.14),
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
              borderColor: isTimerRunning ? withAlpha(theme.primary, 0.72) : theme.border,
              borderWidth: isTimerRunning ? 1.5 : 1,
            },
          ]}
        >
          {/* Inner hairline concentric ring for quiet dial refinement */}
          <View
            style={[
              styles.innerConcentricRing,
              {
                borderColor: theme.isDark
                  ? 'rgba(255,255,255,0.06)'
                  : withAlpha(theme.primary, 0.12),
              },
            ]}
          >
            <View style={styles.clockInner}>
              <Text
                style={[
                  styles.timeDigits,
                  {
                    color: theme.text,
                    fontVariant: ['tabular-nums'],
                  },
                ]}
                maxFontSizeMultiplier={1.25}
              >
                {timeFormatted}
              </Text>
              <Text
                style={[styles.timeSub, { color: isTimerRunning ? theme.primary : theme.textDim }]}
                maxFontSizeMultiplier={1.25}
              >
                {isTimerRunning ? t('focus.timerDeepFocus') : t('focus.timerReady')}
              </Text>
            </View>
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
          accessibilityRole="button"
          accessibilityLabel={t('focus.a11yResetTimer')}
        >
          <Ionicons name="reload-outline" size={20} color={theme.textDim} />
        </TouchableOpacity>

        {/* Primary Play / Pause Button */}
        <TouchableOpacity
          style={[
            styles.playBtn,
            {
              backgroundColor: theme.primary,
              borderColor: withAlpha('#ffffff', theme.isDark ? 0.22 : 0.18),
            },
          ]}
          onPress={handlePlayToggle}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={isTimerRunning ? t('focus.a11yPauseTimer') : t('focus.a11yStartTimer')}
        >
          <Ionicons
            name={isTimerRunning ? 'pause' : 'play'}
            size={26}
            color={theme.onPrimary}
            style={{ marginLeft: isTimerRunning ? 0 : 2 }}
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
            accessibilityRole="button"
            accessibilityLabel={t('focus.a11yFinishEarly')}
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
                isSelected && {
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                },
              ]}
              onPress={() => {
                hapticSelection();
                onSetMinutes(mins);
              }}
              activeOpacity={0.75}
              hitSlop={{ top: 5, bottom: 5, left: 4, right: 4 }}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={t('focus.a11yPresetMinutes', { minutes: mins })}
            >
              <Text
                style={[
                  styles.presetText,
                  {
                    color: isSelected ? theme.primary : theme.textDim,
                    fontWeight: isSelected ? '700' : '500',
                  },
                ]}
                maxFontSizeMultiplier={1.35}
              >
                {mins}{t('units.minuteShort')}
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
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  clockCardWrapper: {
    width: 214,
    height: 214,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  glowAura: {
    position: 'absolute',
    width: 218,
    height: 218,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  clockCard: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 7,
  },
  innerConcentricRing: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clockInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeDigits: {
    fontSize: 44,
    fontWeight: '300',
    letterSpacing: 1.5,
    includeFontPadding: false,
    textAlign: 'center',
  },
  timeSub: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 5,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
  },
  progressTrack: {
    width: 140,
    height: 3,
    borderRadius: 1.5,
    overflow: 'hidden',
    marginBottom: 18,
  },
  progressBar: {
    height: '100%',
    borderRadius: 1.5,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
    marginBottom: 18,
  },
  playBtn: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryPlaceholder: {
    width: 48,
    height: 48,
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
    minHeight: 38,
    paddingHorizontal: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 13,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  presetText: {
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
});
