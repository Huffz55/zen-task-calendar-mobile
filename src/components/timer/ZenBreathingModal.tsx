import { useState, useEffect, useRef, useCallback } from 'react';
import { AppState, type AppStateStatus, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN, scheduleOnUI } from 'react-native-worklets';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemeColors, withAlpha } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { hapticLight, hapticSuccess } from '../../hooks/useHaptics';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { playSingingBowl } from '../../services/audio/audioService';
import { useTranslation } from '../../i18n';
import { CloseButton } from '../common/CloseButton';
import { ModalPortal } from '../common/ModalPortal';

interface ZenBreathingModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: ThemeColors;
}

type BreathPhase = 'Inhale' | 'Hold' | 'Exhale';

const BREATHING_SESSION_SECONDS = 180;
const OPEN_ANIM_MS = 280;
const CLOSE_ANIM_MS = 260;
const OPEN_EASING = Easing.bezier(0.22, 1, 0.36, 1);
const CLOSE_EASING = Easing.bezier(0.32, 0.72, 0, 1);
const BREATH_EASING = Easing.inOut(Easing.ease);

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

  const overlayProgress = useSharedValue(reducedMotion ? 1 : 0);
  const orbScale = useSharedValue(1);
  const isClosingSV = useSharedValue(false);
  const reducedMotionSV = useSharedValue(reducedMotion);

  const phaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const endTimeRef = useRef<number | null>(null);
  const remainingMsRef = useRef<number>(BREATHING_SESSION_SECONDS * 1000);
  const cycleTokenRef = useRef(0);
  const isClosingJSRef = useRef(false);
  const hasCompletedCloseRef = useRef(false);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    reducedMotionSV.set(reducedMotion);
  }, [reducedMotion, reducedMotionSV]);

  useEffect(() => {
    if (reducedMotion) {
      overlayProgress.set(1);
      return;
    }

    overlayProgress.set(
      withTiming(1, {
        duration: OPEN_ANIM_MS,
        easing: OPEN_EASING,
      })
    );

    return () => {
      cancelAnimation(overlayProgress);
    };
  }, [overlayProgress, reducedMotion]);

  const finishCloseOnJS = useCallback(() => {
    if (hasCompletedCloseRef.current) return;
    hasCompletedCloseRef.current = true;
    onCloseRef.current();
  }, []);

  const dismissAnimated = useCallback(() => {
    if (isClosingJSRef.current) return;
    isClosingJSRef.current = true;
    cycleTokenRef.current += 1;

    if (phaseTimerRef.current) {
      clearTimeout(phaseTimerRef.current);
      phaseTimerRef.current = null;
    }
    if (tickerRef.current) {
      clearInterval(tickerRef.current);
      tickerRef.current = null;
    }

    scheduleOnUI(() => {
      'worklet';
      if (isClosingSV.get()) return;
      isClosingSV.set(true);
      cancelAnimation(orbScale);
      cancelAnimation(overlayProgress);

      if (reducedMotionSV.get()) {
        overlayProgress.set(0);
        scheduleOnRN(finishCloseOnJS);
        return;
      }

      overlayProgress.set(
        withTiming(
          0,
          {
            duration: CLOSE_ANIM_MS,
            easing: CLOSE_EASING,
          },
          finished => {
            'worklet';
            if (finished) {
              scheduleOnRN(finishCloseOnJS);
            }
          }
        )
      );
    });
  }, [finishCloseOnJS, isClosingSV, orbScale, overlayProgress, reducedMotionSV]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      setIsAppActive(nextState === 'active');
    });
    return () => sub.remove();
  }, []);

  // Auto-start 4-4-4 breathing loop on the UI thread; pauses in background and respects Reduce Motion
  useEffect(() => {
    const activeToken = ++cycleTokenRef.current;

    if (!isRunning || !isAppActive) {
      if (endTimeRef.current !== null && isRunning && !isAppActive) {
        // Keep wall-clock endTimeRef intact so returning to foreground reconciles elapsed time accurately
      } else if (!isRunning && endTimeRef.current !== null) {
        remainingMsRef.current = Math.max(0, endTimeRef.current - Date.now());
        endTimeRef.current = null;
      }
      cancelAnimation(orbScale);
      orbScale.set(1);
      return;
    }

    if (endTimeRef.current === null) {
      endTimeRef.current = Date.now() + remainingMsRef.current;
    }

    let isMounted = true;
    cancelAnimation(orbScale);
    orbScale.set(1);

    const isCycleAlive = () =>
      isMounted && !isClosingJSRef.current && cycleTokenRef.current === activeToken;

    const runBreathingCycle = () => {
      if (!isCycleAlive()) return;
      setPhase('Inhale');

      if (reducedMotion) {
        phaseTimerRef.current = setTimeout(() => {
          if (!isCycleAlive()) return;
          setPhase('Hold');
          phaseTimerRef.current = setTimeout(() => {
            if (!isCycleAlive()) return;
            setPhase('Exhale');
            phaseTimerRef.current = setTimeout(() => {
              if (!isCycleAlive()) return;
              runBreathingCycle();
            }, 4000);
          }, 4000);
        }, 4000);
        return;
      }

      const handleExhaleComplete = () => {
        if (isCycleAlive()) {
          runBreathingCycle();
        }
      };

      const handleInhaleComplete = () => {
        if (!isCycleAlive()) return;
        // Hold: 4 seconds
        setPhase('Hold');
        phaseTimerRef.current = setTimeout(() => {
          if (!isCycleAlive()) return;
          // Exhale: 4 seconds (scale down on UI thread)
          setPhase('Exhale');
          orbScale.set(
            withTiming(
              1.0,
              {
                duration: 4000,
                easing: BREATH_EASING,
              },
              finished => {
                'worklet';
                if (finished) {
                  scheduleOnRN(handleExhaleComplete);
                }
              }
            )
          );
        }, 4000);
      };

      // Inhale: 4 seconds (scale up on UI thread)
      orbScale.set(
        withTiming(
          1.5,
          {
            duration: 4000,
            easing: BREATH_EASING,
          },
          finished => {
            'worklet';
            if (finished) {
              scheduleOnRN(handleInhaleComplete);
            }
          }
        )
      );
    };

    const syncCountdown = (): boolean => {
      if (isClosingJSRef.current || endTimeRef.current === null) return true;
      const leftMs = Math.max(0, endTimeRef.current - Date.now());
      remainingMsRef.current = leftMs;
      const leftSecs = Math.max(0, Math.ceil(leftMs / 1000));
      setRemainingSeconds(prev => (prev !== leftSecs ? leftSecs : prev));
      if (leftMs <= 0) {
        endTimeRef.current = null;
        hapticSuccess();
        void playSingingBowl();
        dismissAnimated();
        return true;
      }
      return false;
    };

    if (syncCountdown()) {
      return;
    }

    runBreathingCycle();

    tickerRef.current = setInterval(() => {
      if (syncCountdown() && tickerRef.current) {
        clearInterval(tickerRef.current);
        tickerRef.current = null;
      }
    }, 500);

    return () => {
      isMounted = false;
      cycleTokenRef.current += 1;
      if (tickerRef.current) {
        clearInterval(tickerRef.current);
        tickerRef.current = null;
      }
      if (phaseTimerRef.current) {
        clearTimeout(phaseTimerRef.current);
        phaseTimerRef.current = null;
      }
      cancelAnimation(orbScale);
    };
  }, [dismissAnimated, isRunning, isAppActive, orbScale, reducedMotion]);

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
    dismissAnimated();
  };

  const overlayAnimatedStyle = useAnimatedStyle(() => ({
    opacity: overlayProgress.get(),
  }));

  const contentAnimatedStyle = useAnimatedStyle(() => {
    const p = overlayProgress.get();
    return {
      transform: [
        { translateY: (1 - p) * 8 },
        { scale: 0.97 + 0.03 * p },
      ],
    };
  });

  const orbAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: orbScale.get() }],
  }));

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
    <ModalPortal
      visible
      onRequestClose={handleCloseSilent}
      isClosingRef={isClosingJSRef}
    >
      <Animated.View
        collapsable={false}
        style={[
          styles.overlay,
          {
            backgroundColor: withAlpha(theme.background, theme.isDark ? 0.94 : 0.96),
          },
          overlayAnimatedStyle,
        ]}
      >
        {/* Close / Skip button */}
        <CloseButton
          theme={theme}
          onPress={handleCloseSilent}
          accessibilityLabel={t('breathing.a11yClose')}
          style={[styles.closeBtn, { top: safeCloseTop }]}
        />

        <Animated.View collapsable={false} style={[styles.contentWrap, contentAnimatedStyle]}>
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
              collapsable={false}
              style={[
                styles.outerRing,
                {
                  borderColor: theme.primaryLight,
                  backgroundColor: withAlpha(theme.primary, theme.isDark ? 0.12 : 0.1),
                },
                orbAnimatedStyle,
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
        </Animated.View>
      </Animated.View>
    </ModalPortal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  contentWrap: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    position: 'absolute',
    right: 24,
    zIndex: 10,
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
