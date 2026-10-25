import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { ThemeColors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { hapticSuccess, hapticLight } from '../../hooks/useHaptics';
import { playSingingBowl } from '../../services/audio/audioService';
import { SakuraPetalsOverlay } from './SakuraPetalsOverlay';

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

function formatMinutes(seconds: number): string {
  if (seconds <= 0) return '0m';
  const mins = Math.round(seconds / 60);
  if (mins >= 60) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  }
  return `${mins}m`;
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
  useEffect(() => {
    if (isOpen) {
      playSingingBowl();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const completionPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const isPerfect = totalTasks > 0 && completedTasks === totalTasks;

  return (
    <Modal visible={isOpen} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {/* Close button */}
          <TouchableOpacity
            style={[styles.closeBtn, { backgroundColor: theme.surfaceMuted }]}
            onPress={() => {
              hapticLight();
              onClose();
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={18} color={theme.textDim} />
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.iconCircle, { backgroundColor: theme.primaryLight }]}>
              <Ionicons name="moon" size={24} color={theme.primary} />
            </View>
            <Text style={[styles.title, { color: theme.text }]}>Evening Wind-Down 🌙</Text>
            <Text style={[styles.subtitle, { color: theme.textDim }]}>
              Celebrate your progress and prepare for tomorrow
            </Text>
          </View>

          {/* KPI Summary Cards */}
          <View style={styles.kpiGrid}>
            <View style={[styles.kpiCard, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}>
              <Ionicons name="checkmark-circle-outline" size={18} color={theme.primary} />
              <Text style={[styles.kpiValue, { color: theme.text }]}>
                {completedTasks}/{totalTasks}
              </Text>
              <Text style={[styles.kpiLabel, { color: theme.textDim }]}>Tasks Done</Text>
            </View>

            <View style={[styles.kpiCard, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}>
              <Ionicons name="hourglass-outline" size={18} color={theme.accent || theme.primary} />
              <Text style={[styles.kpiValue, { color: theme.text }]}>
                {formatMinutes(focusSeconds)}
              </Text>
              <Text style={[styles.kpiLabel, { color: theme.textDim }]}>Deep Focus</Text>
            </View>

            <View style={[styles.kpiCard, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}>
              <Ionicons name="flame-outline" size={18} color="#f97316" />
              <Text style={[styles.kpiValue, { color: theme.text }]}>
                {currentStreak} Days
              </Text>
              <Text style={[styles.kpiLabel, { color: theme.textDim }]}>Streak</Text>
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
              {completionPercent}% tasks achieved today
            </Text>
          </View>

          {/* Zen Quote */}
          <View style={[styles.quoteBox, { backgroundColor: theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(244,114,182,0.08)' }]}>
            <Text style={[styles.quoteText, { color: theme.text }]}>
              {isPerfect
                ? '“A day fully lived brings quiet sleep. Well done.”'
                : '“Rest is not idleness, but the soul’s quiet harvest.”'}
            </Text>
          </View>

          {/* Rollover / Wind down action */}
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
              <Ionicons name="sparkles" size={18} color="#ffffff" />
              <Text style={styles.actionBtnText}>
                Roll over {overdueCount} remaining to tomorrow & rest 🌸
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: theme.primary }]}
              onPress={() => {
                hapticSuccess();
                onClose();
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.actionBtnText}>Rest & Sleep Peacefully 🌸</Text>
            </TouchableOpacity>
          )}
        </View>
        <SakuraPetalsOverlay active={isOpen} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    borderRadius: 28,
    borderWidth: 1,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  closeBtn: {
    position: 'absolute',
    top: 18,
    right: 18,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 20,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  kpiGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  kpiCard: {
    flex: 1,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    gap: 4,
  },
  kpiValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  progressContainer: {
    marginBottom: 16,
    gap: 6,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'right',
  },
  quoteBox: {
    padding: 14,
    borderRadius: 14,
    marginBottom: 20,
  },
  quoteText: {
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 18,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 18,
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
});
