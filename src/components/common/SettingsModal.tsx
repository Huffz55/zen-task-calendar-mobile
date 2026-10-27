import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
  ActivityIndicator,
  Switch,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeColors } from '../../constants/colors';
import { Task, ZenMilestone } from '../../types';
import { Ionicons } from '@expo/vector-icons';
import { hapticLight, hapticSuccess } from '../../hooks/useHaptics';
import { defaultNotificationService } from '../../services/notifications/notificationService';
import { playZenChime, isSoundEffectsEnabled, setSoundEffectsEnabled, playBambooTap } from '../../services/audio/audioService';

interface SettingsModalProps {
  visible: boolean;
  theme: ThemeColors;
  totalTasks: number;
  totalLists: number;
  currentStreak?: number;
  totalFocusSeconds?: number;
  tasks?: Task[];
  archivedTasks?: Task[];
  onUnarchiveTask?: (taskId: string) => void;
  autoNightShift?: boolean;
  onToggleAutoNightShift?: (enabled: boolean) => void;
  onClose: () => void;
  onOpenSyncModal?: () => void;
  onExportBackup: () => Promise<void>;
  onImportBackup: () => Promise<void>;
  onShowToast: (msg: string) => void;
}

const SETTINGS_MORNING_KEY = '@noteapp_setting_morning_summary';
const SETTINGS_EVENING_KEY = '@noteapp_setting_evening_winddown';
const SETTINGS_HAPTIC_KEY = '@noteapp_setting_haptic';
const SETTINGS_CHIME_KEY = '@noteapp_setting_chime';

export function SettingsModal({
  visible,
  theme,
  totalTasks,
  totalLists,
  currentStreak = 0,
  totalFocusSeconds = 0,
  tasks = [],
  archivedTasks = [],
  onUnarchiveTask,
  autoNightShift = false,
  onToggleAutoNightShift,
  onClose,
  onOpenSyncModal,
  onExportBackup,
  onImportBackup,
  onShowToast,
}: SettingsModalProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [morningSummaryEnabled, setMorningSummaryEnabled] = useState(true);
  const [eveningWindDownEnabled, setEveningWindDownEnabled] = useState(true);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const [chimeEnabled, setChimeEnabled] = useState(true);
  const [sfxEnabled, setSfxEnabled] = useState(() => isSoundEffectsEnabled());
  const [isArchiveExpanded, setIsArchiveExpanded] = useState(false);

  const milestones: ZenMilestone[] = useMemo(() => {
    const hasCompletedTask = tasks.some(t => Array.isArray(t.completedDates) && t.completedDates.length > 0);
    const hasPinnedTask = tasks.some(t => t.isPinned);
    const hasSubtasks = tasks.some(t => t.subtasks && t.subtasks.length > 0);

    return [
      {
        id: 'perfect_day',
        title: 'First Perfect Day',
        description: 'Complete all planned daily tasks',
        icon: '🌸',
        unlocked: hasCompletedTask || currentStreak >= 1,
      },
      {
        id: 'streak_3',
        title: 'Mindful Momentum',
        description: 'Maintain a 3-day consistency streak',
        icon: '🔥',
        unlocked: currentStreak >= 3,
      },
      {
        id: 'streak_7',
        title: 'Zen Master',
        description: 'Complete a full 7-day consistency streak',
        icon: '⚡',
        unlocked: currentStreak >= 7,
      },
      {
        id: 'deep_focus',
        title: 'Deep Presence',
        description: 'Log 60+ minutes in Focus timer',
        icon: '🧘',
        unlocked: totalFocusSeconds >= 3600,
      },
      {
        id: 'focus_of_day',
        title: 'One Big Thing',
        description: 'Pin a daily focus goal',
        icon: '⭐',
        unlocked: hasPinnedTask,
      },
      {
        id: 'checklist_pro',
        title: 'Checklist Pro',
        description: 'Break goals into checklist steps',
        icon: '📋',
        unlocked: hasSubtasks,
      },
    ];
  }, [tasks, currentStreak, totalFocusSeconds]);

  const unlockedCount = milestones.filter(m => m.unlocked).length;

  useEffect(() => {
    AsyncStorage.getItem(SETTINGS_MORNING_KEY).then(val => {
      if (val !== null) setMorningSummaryEnabled(val === 'true');
    });
    AsyncStorage.getItem(SETTINGS_EVENING_KEY).then(val => {
      if (val !== null) setEveningWindDownEnabled(val === 'true');
    });
    AsyncStorage.getItem(SETTINGS_HAPTIC_KEY).then(val => {
      if (val !== null) setHapticsEnabled(val === 'true');
    });
    AsyncStorage.getItem(SETTINGS_CHIME_KEY).then(val => {
      if (val !== null) setChimeEnabled(val === 'true');
    });
  }, [visible]);

  const handleToggleSfx = async (enabled: boolean) => {
    if (enabled) playBambooTap();
    setSfxEnabled(enabled);
    await setSoundEffectsEnabled(enabled);
    onShowToast(enabled ? 'Sound effects enabled' : 'Sound effects muted');
  };

  const handleToggleMorning = async (enabled: boolean) => {
    hapticLight();
    setMorningSummaryEnabled(enabled);
    await AsyncStorage.setItem(SETTINGS_MORNING_KEY, String(enabled));
    if (enabled) {
      await defaultNotificationService.scheduleDailySummary(9, 0, totalTasks);
      onShowToast('Morning briefing scheduled for 9:00 AM');
    } else {
      await defaultNotificationService.cancelNotification('daily-summary');
      onShowToast('Morning briefing turned off');
    }
  };

  const handleToggleEvening = async (enabled: boolean) => {
    hapticLight();
    setEveningWindDownEnabled(enabled);
    await AsyncStorage.setItem(SETTINGS_EVENING_KEY, String(enabled));
    if (enabled) {
      await defaultNotificationService.scheduleEveningWindDown(20, 30, totalTasks);
      onShowToast('Evening review scheduled for 8:30 PM');
    } else {
      await defaultNotificationService.cancelNotification('evening-winddown');
      onShowToast('Evening review turned off');
    }
  };

  const handleToggleHaptics = async (enabled: boolean) => {
    if (enabled) hapticLight();
    setHapticsEnabled(enabled);
    await AsyncStorage.setItem(SETTINGS_HAPTIC_KEY, String(enabled));
    onShowToast(enabled ? 'Haptics enabled' : 'Haptics disabled');
  };

  const handleToggleChime = async (enabled: boolean) => {
    hapticLight();
    setChimeEnabled(enabled);
    await AsyncStorage.setItem(SETTINGS_CHIME_KEY, String(enabled));
    if (enabled) playZenChime();
    onShowToast(enabled ? 'Session chime enabled' : 'Session chime disabled');
  };

  const handleExport = async () => {
    hapticLight();
    setIsExporting(true);
    try {
      await onExportBackup();
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async () => {
    hapticLight();
    setIsImporting(true);
    try {
      await onImportBackup();
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={[styles.sheetTitle, { color: theme.text }]}>Settings</Text>
              <Text style={[styles.subtitle, { color: theme.textDim }]}>
                {totalTasks} tasks • {totalLists} lists
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: theme.surfaceMuted }]}>
              <Ionicons name="close" size={18} color={theme.textDim} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* Section: Cloud Sync */}
            <Text style={[styles.sectionTitle, { color: theme.textDim }]}>SYNC</Text>
            <TouchableOpacity
              style={[styles.groupCard, styles.standaloneCard, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}
              onPress={() => {
                hapticLight();
                onClose();
                onOpenSyncModal?.();
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.iconCircle, { backgroundColor: theme.primaryLight }]}>
                <Ionicons name="cloud-outline" size={18} color={theme.primary} />
              </View>
              <View style={styles.actionContent}>
                <Text style={[styles.actionTitle, { color: theme.text }]}>Cloud Sync</Text>
                <Text style={[styles.actionDesc, { color: theme.textDim }]}>
                  Keep tasks synced across web and mobile
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.textDim} />
            </TouchableOpacity>

            {/* Section: Achievements */}
            <View style={styles.milestonesHeaderRow}>
              <Text style={[styles.sectionTitle, { color: theme.textDim, marginTop: 0, marginBottom: 0 }]}>
                ACHIEVEMENTS
              </Text>
              <Text style={[styles.milestonesBadge, { color: theme.primary, backgroundColor: theme.primaryLight }]}>
                {unlockedCount} of {milestones.length}
              </Text>
            </View>

            <View style={styles.milestonesGrid}>
              {milestones.map(m => (
                <View
                  key={m.id}
                  style={[
                    styles.milestoneCard,
                    {
                      backgroundColor: m.unlocked ? theme.surfaceMuted : theme.surface,
                      borderColor: m.unlocked ? (theme.accent || theme.primary) : theme.border,
                      opacity: m.unlocked ? 1 : 0.6,
                    },
                  ]}
                >
                  <View style={styles.milestoneTopRow}>
                    <Text style={styles.milestoneIcon}>{m.icon}</Text>
                    {m.unlocked ? (
                      <View style={[styles.unlockedPill, { backgroundColor: theme.primaryLight }]}>
                        <Ionicons name="checkmark-circle" size={10} color={theme.primary} />
                        <Text style={[styles.unlockedPillText, { color: theme.primary }]}>Unlocked</Text>
                      </View>
                    ) : (
                      <View style={[styles.lockedPill, { backgroundColor: theme.surfaceMuted }]}>
                        <Ionicons name="lock-closed" size={9} color={theme.textDim} />
                        <Text style={[styles.lockedPillText, { color: theme.textDim }]}>Locked</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.milestoneTitle, { color: theme.text }]}>{m.title}</Text>
                  <Text style={[styles.milestoneDesc, { color: theme.textDim }]} numberOfLines={2}>
                    {m.description}
                  </Text>
                </View>
              ))}
            </View>

            {/* Section: Preferences Group */}
            <Text style={[styles.sectionTitle, { color: theme.textDim }]}>PREFERENCES</Text>
            <View style={[styles.groupCard, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}>
              {/* Sound Effects */}
              <View style={styles.groupRow}>
                <View style={[styles.iconCircle, { backgroundColor: theme.surface }]}>
                  <Ionicons name="volume-medium-outline" size={18} color={theme.primary} />
                </View>
                <View style={styles.actionContent}>
                  <Text style={[styles.actionTitle, { color: theme.text }]}>Sound Effects</Text>
                </View>
                <Switch
                  value={sfxEnabled}
                  onValueChange={handleToggleSfx}
                  trackColor={{ false: theme.border, true: theme.primary }}
                  thumbColor="#ffffff"
                />
              </View>

              <View style={[styles.rowDivider, { backgroundColor: theme.border }]} />

              {/* Session Chime */}
              <View style={styles.groupRow}>
                <View style={[styles.iconCircle, { backgroundColor: theme.surface }]}>
                  <Ionicons name="musical-notes-outline" size={18} color={theme.accent || theme.primary} />
                </View>
                <View style={styles.actionContent}>
                  <Text style={[styles.actionTitle, { color: theme.text }]}>Completion Chime</Text>
                </View>
                <Switch
                  value={chimeEnabled}
                  onValueChange={handleToggleChime}
                  trackColor={{ false: theme.border, true: theme.primary }}
                  thumbColor="#ffffff"
                />
              </View>

              <View style={[styles.rowDivider, { backgroundColor: theme.border }]} />

              {/* Haptic Feedback */}
              <View style={styles.groupRow}>
                <View style={[styles.iconCircle, { backgroundColor: theme.surface }]}>
                  <Ionicons name="radio-outline" size={18} color={theme.primary} />
                </View>
                <View style={styles.actionContent}>
                  <Text style={[styles.actionTitle, { color: theme.text }]}>Haptic Feedback</Text>
                </View>
                <Switch
                  value={hapticsEnabled}
                  onValueChange={handleToggleHaptics}
                  trackColor={{ false: theme.border, true: theme.primary }}
                  thumbColor="#ffffff"
                />
              </View>

              <View style={[styles.rowDivider, { backgroundColor: theme.border }]} />

              {/* Auto Night Shift */}
              <View style={styles.groupRow}>
                <View style={[styles.iconCircle, { backgroundColor: theme.surface }]}>
                  <Ionicons name="moon-outline" size={18} color={theme.accent || theme.primary} />
                </View>
                <View style={styles.actionContent}>
                  <Text style={[styles.actionTitle, { color: theme.text }]}>Auto Dark Mode</Text>
                </View>
                <Switch
                  value={autoNightShift}
                  onValueChange={onToggleAutoNightShift}
                  trackColor={{ false: theme.border, true: theme.primary }}
                  thumbColor="#ffffff"
                />
              </View>
            </View>

            {/* Section: Daily Notifications */}
            <Text style={[styles.sectionTitle, { color: theme.textDim }]}>DAILY NOTIFICATIONS</Text>
            <View style={[styles.groupCard, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}>
              {/* Morning Briefing */}
              <View style={styles.groupRow}>
                <View style={[styles.iconCircle, { backgroundColor: theme.surface }]}>
                  <Ionicons name="sunny-outline" size={18} color={theme.primary} />
                </View>
                <View style={styles.actionContent}>
                  <Text style={[styles.actionTitle, { color: theme.text }]}>Morning Briefing</Text>
                </View>
                <Switch
                  value={morningSummaryEnabled}
                  onValueChange={handleToggleMorning}
                  trackColor={{ false: theme.border, true: theme.primary }}
                  thumbColor="#ffffff"
                />
              </View>

              <View style={[styles.rowDivider, { backgroundColor: theme.border }]} />

              {/* Evening Review */}
              <View style={styles.groupRow}>
                <View style={[styles.iconCircle, { backgroundColor: theme.surface }]}>
                  <Ionicons name="moon-outline" size={18} color={theme.accent || theme.primary} />
                </View>
                <View style={styles.actionContent}>
                  <Text style={[styles.actionTitle, { color: theme.text }]}>Evening Review</Text>
                </View>
                <Switch
                  value={eveningWindDownEnabled}
                  onValueChange={handleToggleEvening}
                  trackColor={{ false: theme.border, true: theme.primary }}
                  thumbColor="#ffffff"
                />
              </View>
            </View>

            {/* Section: Archive */}
            <Text style={[styles.sectionTitle, { color: theme.textDim }]}>ARCHIVE</Text>
            <TouchableOpacity
              style={[
                styles.groupCard,
                styles.standaloneCard,
                { backgroundColor: theme.surfaceMuted, borderColor: theme.border, flexDirection: 'column', alignItems: 'stretch' },
              ]}
              onPress={() => {
                if (archivedTasks.length > 0) {
                  hapticLight();
                  setIsArchiveExpanded(prev => !prev);
                }
              }}
              activeOpacity={archivedTasks.length > 0 ? 0.7 : 1}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={[styles.iconCircle, { backgroundColor: theme.surface }]}>
                  <Ionicons name="archive-outline" size={18} color={theme.primary} />
                </View>
                <View style={styles.actionContent}>
                  <View style={styles.titleRowWithBtn}>
                    <Text style={[styles.actionTitle, { color: theme.text }]}>Archived Tasks</Text>
                    {archivedTasks.length > 0 && (
                      <View style={[styles.archiveCountBadge, { backgroundColor: theme.primaryLight }]}>
                        <Text style={[styles.archiveCountText, { color: theme.primary }]}>
                          {archivedTasks.length}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.actionDesc, { color: theme.textDim }]}>
                    {archivedTasks.length > 0
                      ? 'Tasks inactive for 14+ days'
                      : 'No inactive tasks'}
                  </Text>
                </View>
                {archivedTasks.length > 0 && (
                  <Ionicons
                    name={isArchiveExpanded ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={theme.textDim}
                  />
                )}
              </View>

              {isArchiveExpanded && archivedTasks.length > 0 && (
                <View style={[styles.archiveListContainer, { borderTopColor: theme.border }]}>
                  {archivedTasks.map(t => (
                    <View key={t.id} style={[styles.archiveItemRow, { borderBottomColor: theme.border }]}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={[styles.archiveItemTitle, { color: theme.text }]} numberOfLines={1}>
                          {t.title}
                        </Text>
                        <Text style={[styles.archiveItemDate, { color: theme.textDim }]}>
                          {t.date}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={[styles.unarchiveBtn, { borderColor: theme.primary }]}
                        onPress={() => {
                          hapticSuccess();
                          onUnarchiveTask?.(t.id);
                          onShowToast(`"${t.title}" restored`);
                        }}
                      >
                        <Ionicons name="arrow-undo-outline" size={12} color={theme.primary} />
                        <Text style={[styles.unarchiveBtnText, { color: theme.primary }]}>Restore</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </TouchableOpacity>

            {/* Section: Data Backup */}
            <Text style={[styles.sectionTitle, { color: theme.textDim }]}>DATA BACKUP</Text>
            <View style={[styles.groupCard, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}>
              {/* Export */}
              <TouchableOpacity
                style={styles.groupRow}
                onPress={handleExport}
                disabled={isExporting}
                activeOpacity={0.7}
              >
                <View style={[styles.iconCircle, { backgroundColor: theme.surface }]}>
                  {isExporting ? (
                    <ActivityIndicator size="small" color={theme.primary} />
                  ) : (
                    <Ionicons name="share-outline" size={18} color={theme.primary} />
                  )}
                </View>
                <View style={styles.actionContent}>
                  <Text style={[styles.actionTitle, { color: theme.text }]}>Export Backup</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={theme.textDim} />
              </TouchableOpacity>

              <View style={[styles.rowDivider, { backgroundColor: theme.border }]} />

              {/* Import */}
              <TouchableOpacity
                style={styles.groupRow}
                onPress={handleImport}
                disabled={isImporting}
                activeOpacity={0.7}
              >
                <View style={[styles.iconCircle, { backgroundColor: theme.surface }]}>
                  {isImporting ? (
                    <ActivityIndicator size="small" color={theme.accent || theme.primary} />
                  ) : (
                    <Ionicons name="download-outline" size={18} color={theme.accent || theme.primary} />
                  )}
                </View>
                <View style={styles.actionContent}>
                  <Text style={[styles.actionTitle, { color: theme.text }]}>Restore Backup</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={theme.textDim} />
              </TouchableOpacity>
            </View>

            {/* App Footer */}
            <View style={styles.footer}>
              <Text style={[styles.footerTitle, { color: theme.textDim }]}>Zen Task Calendar</Text>
              <Text style={[styles.footerSub, { color: theme.textDim }]}>Version 1.0.0</Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    borderWidth: 1,
    maxHeight: '88%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginTop: 18,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  groupCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  standaloneCard: {
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
  },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 54,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  actionDesc: {
    fontSize: 11,
    marginTop: 1,
  },
  titleRowWithBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  milestonesHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  milestonesBadge: {
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  milestonesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  milestoneCard: {
    width: '48.5%',
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
  },
  milestoneTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  milestoneIcon: {
    fontSize: 20,
  },
  unlockedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  unlockedPillText: {
    fontSize: 9,
    fontWeight: '700',
  },
  lockedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  lockedPillText: {
    fontSize: 9,
    fontWeight: '600',
  },
  milestoneTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  milestoneDesc: {
    fontSize: 10,
    lineHeight: 14,
  },
  archiveCountBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  archiveCountText: {
    fontSize: 10,
    fontWeight: '700',
  },
  archiveListContainer: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  archiveItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  archiveItemTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  archiveItemDate: {
    fontSize: 10,
    marginTop: 2,
  },
  unarchiveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  unarchiveBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 8,
  },
  footerTitle: {
    fontSize: 12,
    fontWeight: '600',
  },
  footerSub: {
    fontSize: 10,
    marginTop: 2,
  },
});
