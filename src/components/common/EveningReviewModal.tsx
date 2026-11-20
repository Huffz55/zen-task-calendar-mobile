import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Animated } from 'react-native';
import { ThemeColors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { hapticSuccess, hapticLight } from '../../hooks/useHaptics';
import { formatDurationCompact, useTranslation } from '../../i18n';

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
  const [scaleAnim] = useState(() => new Animated.Value(0.94));

  useEffect(() => {
    if (isOpen) {
      scaleAnim.setValue(0.94);
      Animated.spring(scaleAnim, {
        toValue: 1,
        damping: 18,
        stiffness: 240,
        mass: 0.7,
        useNativeDriver: true,
      }).start();
    }
  }, [isOpen, scaleAnim]);

  if (!isOpen) return null;

  const completionPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const isPerfect = totalTasks > 0 && completedTasks === totalTasks;

  return (
    <Modal
      visible={isOpen}
      transparent
      statusBarTranslucent
      navigationBarTranslucent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Close button */}
          <TouchableOpacity
            style={[styles.closeBtn, { backgroundColor: theme.surfaceMuted }]}
            onPress={() => {
              hapticLight();
              onClose();
            }}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={t('eveningReview.a11yClose')}
          >
            <Ionicons name="close" size={18} color={theme.textDim} />
          </TouchableOpacity>

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
                onRollover();
                onClose();
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-forward-circle-outline" size={17} color="#ffffff" />
              <Text style={styles.actionBtnText} numberOfLines={1}>
                {t('eveningReview.rolloverAction', { count: overdueCount })}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: theme.primary }]}
              onPress={() => {
                hapticLight();
                onClose();
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.actionBtnText}>{t('common.done')}</Text>
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
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    padding: 24,
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
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
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
