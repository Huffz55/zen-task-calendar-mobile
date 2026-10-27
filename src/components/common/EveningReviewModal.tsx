import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { ThemeColors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { hapticSuccess, hapticLight } from '../../hooks/useHaptics';

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
  if (!isOpen) return null;

  const completionPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const isPerfect = totalTasks > 0 && completedTasks === totalTasks;

  return (
    <Modal visible={isOpen} transparent animationType="fade" onRequestClose={onClose}>
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
              <Ionicons name="moon-outline" size={22} color={theme.primary} />
            </View>
            <Text style={[styles.title, { color: theme.text }]}>Evening Review</Text>
            <Text style={[styles.subtitle, { color: theme.textDim }]}>
              A quiet moment to reflect on your day
            </Text>
          </View>

          {/* KPI Summary Cards */}
          <View style={styles.kpiGrid}>
            <View style={[styles.kpiCard, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}>
              <Ionicons name="checkmark-circle-outline" size={16} color={theme.primary} />
              <Text style={[styles.kpiValue, { color: theme.text }]}>
                {completedTasks}/{totalTasks}
              </Text>
              <Text style={[styles.kpiLabel, { color: theme.textDim }]}>Completed</Text>
            </View>

            <View style={[styles.kpiCard, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}>
              <Ionicons name="timer-outline" size={16} color={theme.accent || theme.primary} />
              <Text style={[styles.kpiValue, { color: theme.text }]}>
                {formatMinutes(focusSeconds)}
              </Text>
              <Text style={[styles.kpiLabel, { color: theme.textDim }]}>Focus Time</Text>
            </View>

            <View style={[styles.kpiCard, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}>
              <Ionicons name="flame-outline" size={16} color="#f97316" />
              <Text style={[styles.kpiValue, { color: theme.text }]}>
                {currentStreak}d
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
              {completionPercent}% completed today
            </Text>
          </View>

          {/* Calm Reflection */}
          <View style={[styles.quoteBox, { backgroundColor: theme.surfaceMuted }]}>
            <Text style={[styles.quoteText, { color: theme.text }]}>
              {isPerfect
                ? 'All tasks completed. Rest well and recharge for tomorrow.'
                : 'Every step forward matters. Quiet your mind for tonight.'}
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
              <Text style={styles.actionBtnText}>
                Roll over {overdueCount} remaining to tomorrow
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
              <Text style={styles.actionBtnText}>Done</Text>
            </TouchableOpacity>
          )}
        </View>
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
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
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
  subtitle: {
    fontSize: 12,
    marginTop: 3,
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
    gap: 8,
    paddingVertical: 13,
    borderRadius: 16,
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
});
