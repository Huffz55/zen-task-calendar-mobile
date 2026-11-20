import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Animated, Easing } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemeColors, withAlpha } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { hapticLight, hapticSuccess } from '../../hooks/useHaptics';
import { playSingingBowl } from '../../services/audio/audioService';
import { useTranslation } from '../../i18n';

interface ZenBreathingModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: ThemeColors;
}

type BreathPhase = 'Inhale' | 'Hold' | 'Exhale';

const BREATHING_SESSION_SECONDS = 180;

export function ZenBreathingModal({ isOpen, onClose, theme }: ZenBreathingModalProps) {
  if (!isOpen) return null;
  return <ZenBreathingContent onClose={onClose} theme={theme} />;
}

function ZenBreathingContent({ onClose, theme }: Omit<ZenBreathingModalProps, 'isOpen'>) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [isRunning, setIsRunning] = useState(true);
  const [phase, setPhase] = useState<BreathPhase>('Inhale');
  const [remainingSeconds, setRemainingSeconds] = useState(BREATHING_SESSION_SECONDS);
  const [scaleAnim] = useState(() => new Animated.Value(1));
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Auto-start 4-4-4 breathing loop; chime plays only when the 3-minute session completes
  useEffect(() => {
    if (!isRunning) {
      scaleAnim.stopAnimation();
      return;
    }

    let isMounted = true;
    scaleAnim.setValue(1);

    const runBreathingCycle = () => {
      if (!isMounted) return;

      // Inhale: 4 seconds (scale up)
      Animated.timing(scaleAnim, {
        toValue: 1.5,
        duration: 4000,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (!isMounted || !finished) return;

        // Hold: 4 seconds
        setPhase('Hold');
        holdTimerRef.current = setTimeout(() => {
          if (!isMounted) return;

          // Exhale: 4 seconds (scale down)
          setPhase('Exhale');
          Animated.timing(scaleAnim, {
            toValue: 1.0,
            duration: 4000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }).start(({ finished: exhaleFinished }) => {
            if (isMounted && exhaleFinished) {
              setPhase('Inhale');
              runBreathingCycle();
            }
          });
        }, 4000);
      });
    };

    runBreathingCycle();

    const ticker = setInterval(() => {
      setRemainingSeconds(prev => {
        if (prev <= 1) {
          clearInterval(ticker);
          hapticSuccess();
          void playSingingBowl();
          onCloseRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      isMounted = false;
      clearInterval(ticker);
      if (holdTimerRef.current) {
        clearTimeout(holdTimerRef.current);
        holdTimerRef.current = null;
      }
      scaleAnim.stopAnimation();
    };
  }, [isRunning, scaleAnim]);

  const handleTogglePause = () => {
    hapticLight();
    setIsRunning(prev => {
      if (!prev) {
        setPhase('Inhale');
      }
      return !prev;
    });
  };

  const handleCloseSilent = () => {
    hapticLight();
    onClose();
  };

  const mins = Math.floor(remainingSeconds / 60);
  const secs = remainingSeconds % 60;
  const formattedRemaining = `${mins}:${secs < 10 ? `0${secs}` : secs}`;
  const safeCloseTop = Math.max(insets.top, 20) + 12;

  const phaseLabel =
    phase === 'Inhale'
      ? t('breathing.phaseInhale')
      : phase === 'Hold'
      ? t('breathing.phaseHold')
      : t('breathing.phaseExhale');

  return (
    <Modal
      visible
      transparent
      statusBarTranslucent
      navigationBarTranslucent
      animationType="fade"
      onRequestClose={handleCloseSilent}
    >
      <View
        style={[
          styles.overlay,
          { backgroundColor: withAlpha(theme.background, theme.isDark ? 0.94 : 0.96) },
        ]}
      >
        {/* Close / Skip button */}
        <TouchableOpacity
          style={[styles.closeBtn, { top: safeCloseTop, backgroundColor: theme.surface, borderColor: theme.border }]}
          onPress={handleCloseSilent}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel={t('breathing.a11yClose')}
        >
          <Ionicons name="close" size={20} color={theme.textDim} />
        </TouchableOpacity>

        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]} maxFontSizeMultiplier={1.35}>
            {t('breathing.title')}
          </Text>
          <Text style={[styles.subtitle, { color: theme.textDim }]} maxFontSizeMultiplier={1.35}>
            {t('breathing.subtitle')}
          </Text>
        </View>

        {/* Breathing Orb */}
        <View style={styles.orbContainer}>
          <Animated.View
            style={[
              styles.outerRing,
              {
                borderColor: theme.primaryLight,
                backgroundColor: withAlpha(theme.primary, theme.isDark ? 0.12 : 0.1),
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            <View
              style={[
                styles.innerCircle,
                {
                  backgroundColor: theme.primary,
                  borderColor: withAlpha('#ffffff', 0.22),
                },
              ]}
            >
              <Text style={styles.phaseText} maxFontSizeMultiplier={1.35}>
                {isRunning ? phaseLabel : t('breathing.paused')}
              </Text>
            </View>
          </Animated.View>
        </View>

        {/* Countdown Timer */}
        <View style={styles.timerRow}>
          <Ionicons name="hourglass-outline" size={16} color={theme.primary} />
          <Text style={[styles.timerText, { color: theme.text }]} maxFontSizeMultiplier={1.35}>
            {t('breathing.remainingTime', { time: formattedRemaining })}
          </Text>
        </View>

        {/* Pause / Resume Control */}
        <TouchableOpacity
          style={[
            styles.finishBtn,
            isRunning
              ? {
                  backgroundColor: theme.surfaceMuted,
                  borderColor: theme.border,
                }
              : {
                  backgroundColor: theme.primary,
                  borderColor: withAlpha('#ffffff', 0.18),
                },
          ]}
          onPress={handleTogglePause}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={isRunning ? t('breathing.a11yPause') : t('breathing.a11yResume')}
        >
          <Ionicons
            name={isRunning ? 'pause' : 'play'}
            size={15}
            color={isRunning ? theme.text : '#ffffff'}
          />
          <Text
            style={[styles.finishBtnText, { color: isRunning ? theme.text : '#ffffff' }]}
            maxFontSizeMultiplier={1.35}
          >
            {isRunning ? t('breathing.pause') : t('breathing.resume')}
          </Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  closeBtn: {
    position: 'absolute',
    right: 24,
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 6,
    textAlign: 'center',
  },
  orbContainer: {
    width: 240,
    height: 240,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  outerRing: {
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phaseText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 30,
    marginBottom: 24,
  },
  timerText: {
    fontSize: 14,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  finishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 48,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
  },
  finishBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
