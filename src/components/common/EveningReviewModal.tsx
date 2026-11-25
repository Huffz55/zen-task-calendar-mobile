import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors } from '../../constants/colors';
import { hapticLight, hapticSuccess } from '../../hooks/useHaptics';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { formatDurationCompact, useTranslation } from '../../i18n';
import { CloseButton } from './CloseButton';

interface EveningReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: ThemeColors;
  completedTasks: number;
  totalTasks: number;
  focusSeconds: number;
  currentStreak: number;
  overdueCount: number;
  onRollover: () => void;
}

const OPEN_ANIM_MS = 280;
const CLOSE_ANIM_MS = 260;
const OPEN_EASING = Easing.bezier(0.22, 1, 0.36, 1);
const CLOSE_EASING = Easing.bezier(0.32, 0.72, 0, 1);

export function EveningReviewModal({
  isOpen,
  onClose,
  theme,
  completedTasks,
  totalTasks,
  focusSeconds,
  currentStreak,
  overdueCount,
  onRollover,
}: EveningReviewModalProps) {
  const { t, language } = useTranslation();
  const reducedMotion = useReducedMotion();
  const [fadeAnim] = useState(() => new Animated.Value(0));
  const [scaleAnim] = useState(() => new Animated.Value(0.95));
  const isClosingRef = useRef(false);
  const wasOpenRef = useRef(false);
  const openRafRef = useRef<number | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const cancelOpenRaf = useCallback(() => {
    if (openRafRef.current !== null) {
      cancelAnimationFrame(openRafRef.current);
      openRafRef.current = null;
    }
  }, []);

  const dismissAnimated = useCallback(
    (afterClose?: () => void) => {
      if (isClosingRef.current) return;
      isClosingRef.current = true;
      cancelOpenRaf();
      fadeAnim.stopAnimation();
      scaleAnim.stopAnimation();

      const finish = () => {
        afterClose?.();
        onCloseRef.current();
      };

      if (reducedMotion) {
        fadeAnim.setValue(0);
        scaleAnim.setValue(0.95);
        finish();
        return;
      }

      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: CLOSE_ANIM_MS,
          easing: CLOSE_EASING,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.95,
          duration: CLOSE_ANIM_MS,
          easing: CLOSE_EASING,
          useNativeDriver: true,
        }),
      ]).start(() => {
        if (isClosingRef.current) {
          finish();
        }
      });
    },
    [cancelOpenRaf, fadeAnim, reducedMotion, scaleAnim]
  );

  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      wasOpenRef.current = true;
      isClosingRef.current = false;
      cancelOpenRaf();
      fadeAnim.stopAnimation();
      scaleAnim.stopAnimation();
      if (reducedMotion) {
        fadeAnim.setValue(1);
        scaleAnim.setValue(1);
        return;
      }
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.95);
      openRafRef.current = requestAnimationFrame(() => {
        openRafRef.current = null;
        if (isClosingRef.current) return;
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: OPEN_ANIM_MS,
            easing: OPEN_EASING,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: OPEN_ANIM_MS,
            easing: OPEN_EASING,
            useNativeDriver: true,
          }),
        ]).start();
      });
      return;
    }
    if (!isOpen && wasOpenRef.current) {
      wasOpenRef.current = false;
      isClosingRef.current = false;
      cancelOpenRaf();
      fadeAnim.stopAnimation();
      scaleAnim.stopAnimation();
    }
  }, [cancelOpenRaf, fadeAnim, isOpen, reducedMotion, scaleAnim]);

  useEffect(() => {
    return () => {
      cancelOpenRaf();
      fadeAnim.stopAnimation();
      scaleAnim.stopAnimation();
    };
  }, [cancelOpenRaf, fadeAnim, scaleAnim]);

  if (!isOpen) return null;

  const completionPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const isPerfect = totalTasks > 0 && completedTasks === totalTasks;

  return (
    <Modal
      visible={isOpen}
      transparent
      statusBarTranslucent
      navigationBarTranslucent
      animationType="none"
      onRequestClose={() => dismissAnimated()}
    >
      <View style={styles.overlay}>
        <Animated.View
          collapsable={false}
          style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: fadeAnim }]}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={() => dismissAnimated()} />
        </Animated.View>

        <Animated.View
          renderToHardwareTextureAndroid
          collapsable={false}
          style={[
            styles.card,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Close button */}
          <CloseButton
            theme={theme}
            onPress={() => dismissAnimated()}
            accessibilityLabel={t('eveningReview.a11yClose')}
            style={styles.closeBtnPos}
          />

          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.iconCircle, { backgroundColor: theme.primaryLight }]}>
              <Ionicons name="moon-outline" size={22} color={theme.primary} />
            </View>
            <Text style={[styles.title, { color: theme.text }]} maxFontSizeMultiplier={1.35}>
              {t('eveningReview.title')}
            </Text>
          </View>

          {/* KPI Summary Cards */}
          <View style={styles.kpiGrid}>
            <View style={[styles.kpiCard, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}>
              <Ionicons name="checkmark-circle-outline" size={16} color={theme.primary} />
              <Text style={[styles.kpiValue, { color: theme.text }]} maxFontSizeMultiplier={1.35}>
                {completedTasks}/{totalTasks}
              </Text>
              <Text style={[styles.kpiLabel, { color: theme.textDim }]} maxFontSizeMultiplier={1.35}>
                {t('eveningReview.completed')}
              </Text>
            </View>

            <View style={[styles.kpiCard, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}>
              <Ionicons name="timer-outline" size={16} color={theme.accent || theme.primary} />
              <Text style={[styles.kpiValue, { color: theme.text }]} maxFontSizeMultiplier={1.35}>
                {formatDurationCompact(focusSeconds, language)}
              </Text>
              <Text style={[styles.kpiLabel, { color: theme.textDim }]} maxFontSizeMultiplier={1.35}>
                {t('eveningReview.focusTime')}
              </Text>
            </View>

            <View style={[styles.kpiCard, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}>
              <Ionicons name="flame-outline" size={16} color={theme.warning} />
              <Text style={[styles.kpiValue, { color: theme.text }]} maxFontSizeMultiplier={1.35}>
                {currentStreak}{t('units.dayShort')}
              </Text>
              <Text style={[styles.kpiLabel, { color: theme.textDim }]} maxFontSizeMultiplier={1.35}>
                {t('eveningReview.streak')}
              </Text>
            </View>
          </View>

          {/* Progress bar */}
          <View style={styles.progressContainer}>
            <View style={[styles.progressTrack, { backgroundColor: theme.surfaceMuted }]}>
              <View
                style={[
                  styles.progressBar,
                  {
                    width: `${completionPercent}%`,
                    backgroundColor: theme.primary,
                  },
                ]}
              />
            </View>
            <Text style={[styles.progressText, { color: theme.textDim }]}>
              {t('eveningReview.progressToday', { percent: completionPercent })}
            </Text>
          </View>

          {/* Calm Reflection */}
          <View style={[styles.quoteBox, { backgroundColor: theme.surfaceMuted }]}>
            <Text style={[styles.quoteText, { color: theme.text }]}>
              {isPerfect
                ? t('eveningReview.quotePerfect')
                : t('eveningReview.quoteProgress')}
            </Text>
          </View>

          {/* Actions */}
          {overdueCount > 0 ? (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: theme.primary }]}
              onPress={() => {
                hapticSuccess();
                dismissAnimated(onRollover);
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-forward-circle-outline" size={17} color={theme.onPrimary} />
              <Text style={[styles.actionBtnText, { color: theme.onPrimary }]} numberOfLines={1}>
                {t('eveningReview.rolloverAction', { count: overdueCount })}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: theme.primary }]}
              onPress={() => {
                hapticLight();
                dismissAnimated();
              }}
              activeOpacity={0.8}
            >
              <Text style={[styles.actionBtnText, { color: theme.onPrimary }]}>{t('common.done')}</Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  card: {
    borderRadius: 26,
    borderWidth: 1,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 4,
  },
  closeBtnPos: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
  },
  header: {
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 18,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  kpiGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  kpiCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
  },
  kpiValue: {
    fontSize: 14,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 11,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  quoteBox: {
    padding: 12,
    borderRadius: 14,
    marginBottom: 18,
    alignItems: 'center',
  },
  quoteText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    gap: 8,
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 16,
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
});
