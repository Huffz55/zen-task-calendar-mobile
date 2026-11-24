import { useState, useEffect, useRef } from 'react';
import { AppState, type AppStateStatus, View, Text, StyleSheet, Modal, TouchableOpacity, Animated, Easing } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemeColors, withAlpha } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { hapticLight, hapticSuccess } from '../../hooks/useHaptics';
import { useReducedMotion } from '../../hooks/useReducedMotion';
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
  const reducedMotion = useReducedMotion();
  const [isRunning, setIsRunning] = useState(true);
  const [isAppActive, setIsAppActive] = useState(() => AppState.currentState === 'active');
  const [phase, setPhase] = useState<BreathPhase>('Inhale');
  const [remainingSeconds, setRemainingSeconds] = useState(BREATHING_SESSION_SECONDS);
  const [scaleAnim] = useState(() => new Animated.Value(1));
  const phaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const endTimeRef = useRef<number | null>(null);
  const remainingMsRef = useRef<number>(BREATHING_SESSION_SECONDS * 1000);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      setIsAppActive(nextState === 'active');
    });
    return () => sub.remove();
  }, []);

  // Auto-start 4-4-4 breathing loop; pauses timers & animations in background and respects Reduce Motion
  useEffect(() => {
    if (!isRunning || !isAppActive) {
      if (endTimeRef.current !== null && isRunning && !isAppActive) {
        // Keep wall-clock endTimeRef intact so returning to foreground reconciles elapsed time accurately
      } else if (!isRunning && endTimeRef.current !== null) {
        remainingMsRef.current = Math.max(0, endTimeRef.current - Date.now());
        endTimeRef.current = null;
      }
      scaleAnim.stopAnimation();
      scaleAnim.setValue(1);
      return;
    }

    if (endTimeRef.current === null) {
      endTimeRef.current = Date.now() + remainingMsRef.current;
    }

    let isMounted = true;
    scaleAnim.setValue(1);

    const runBreathingCycle = () => {
      if (!isMounted) return;
      setPhase('Inhale');

      if (reducedMotion) {
        phaseTimerRef.current = setTimeout(() => {
          if (!isMounted) return;
          setPhase('Hold');
          phaseTimerRef.current = setTimeout(() => {
            if (!isMounted) return;
            setPhase('Exhale');
            phaseTimerRef.current = setTimeout(() => {
              if (!isMounted) return;
              runBreathingCycle();
            }, 4000);
          }, 4000);
        }, 4000);
        return;
      }

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
        phaseTimerRef.current = setTimeout(() => {
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
              runBreathingCycle();
            }
          });
        }, 4000);
      });
    };

    const syncCountdown = (): boolean => {
      if (endTimeRef.current === null) return true;
      const leftMs = Math.max(0, endTimeRef.current - Date.now());
      remainingMsRef.current = leftMs;
      const leftSecs = Math.max(0, Math.ceil(leftMs / 1000));
      setRemainingSeconds(prev => (prev !== leftSecs ? leftSecs : prev));
      if (leftMs <= 0) {
        endTimeRef.current = null;
        hapticSuccess();
        void playSingingBowl();
        onCloseRef.current();
        return true;
      }
      return false;
    };

    if (syncCountdown()) {
      return;
    }

    runBreathingCycle();

    const ticker = setInterval(() => {
      if (syncCountdown()) {
        clearInterval(ticker);
      }
    }, 500);

    return () => {
      isMounted = false;
      clearInterval(ticker);
      if (phaseTimerRef.current) {
        clearTimeout(phaseTimerRef.current);
        phaseTimerRef.current = null;
      }
      scaleAnim.stopAnimation();
    };
  }, [isRunning, isAppActive, reducedMotion, scaleAnim]);

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
              <Text style={[styles.phaseText, { color: theme.onPrimary }]} maxFontSizeMultiplier={1.35}>
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
            color={isRunning ? theme.text : theme.onPrimary}
          />
          <Text
            style={[styles.finishBtnText, { color: isRunning ? theme.text : theme.onPrimary }]}
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
