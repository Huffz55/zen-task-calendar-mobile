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
        description: 'Maintain a 3-day mindful streak',
        icon: '🔥',
        unlocked: currentStreak >= 3,
      },
      {
        id: 'streak_7',
        title: 'Zen Master',
        description: 'Reach a full 7-day consistency streak',
        icon: '⚡',
        unlocked: currentStreak >= 7,
      },
      {
        id: 'deep_focus',
        title: 'Deep Presence',
        description: 'Log 60+ minutes in Zen Focus timer',
        icon: '🧘',
        unlocked: totalFocusSeconds >= 3600,
      },
      {
        id: 'focus_of_day',
        title: 'One Big Thing',
        description: 'Pin a high-priority daily focus goal',
        icon: '⭐',
        unlocked: hasPinnedTask,
      },
      {
        id: 'checklist_pro',
        title: 'Checklist Pro',
        description: 'Break goals into mindful subtask steps',
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
    onShowToast(enabled ? 'Zen Sound Effects enabled 🎋' : 'Zen Sound Effects muted');
  };

  const handleToggleMorning = async (enabled: boolean) => {
    hapticLight();
    setMorningSummaryEnabled(enabled);
    await AsyncStorage.setItem(SETTINGS_MORNING_KEY, String(enabled));
    if (enabled) {
      await defaultNotificationService.scheduleDailySummary(9, 0, totalTasks);
      onShowToast('Daily 09:00 AM summary activated 🌸');
    } else {
      await defaultNotificationService.cancelNotification('daily-summary');
      onShowToast('Daily morning summary turned off');
    }
  };

  const handleToggleEvening = async (enabled: boolean) => {
    hapticLight();
    setEveningWindDownEnabled(enabled);
    await AsyncStorage.setItem(SETTINGS_EVENING_KEY, String(enabled));
    if (enabled) {
      await defaultNotificationService.scheduleEveningWindDown(20, 30, totalTasks);
      onShowToast('Evening 20:30 PM wind-down activated 🌙');
    } else {
      await defaultNotificationService.cancelNotification('evening-winddown');
      onShowToast('Evening wind-down briefing turned off');
    }
  };

  const handleToggleHaptics = async (enabled: boolean) => {
    if (enabled) hapticLight();
    setHapticsEnabled(enabled);
    await AsyncStorage.setItem(SETTINGS_HAPTIC_KEY, String(enabled));
    onShowToast(enabled ? 'Haptic feedback enabled ✨' : 'Haptic feedback disabled');
  };

  const handleToggleChime = async (enabled: boolean) => {
    hapticLight();
    setChimeEnabled(enabled);
    await AsyncStorage.setItem(SETTINGS_CHIME_KEY, String(enabled));
    if (enabled) playZenChime();
    onShowToast(enabled ? 'Zen chime enabled 🧘' : 'Zen chime disabled');
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

  const handleTestNotification = async () => {
    hapticSuccess();
    if (!defaultNotificationService.isSupported) {
      onShowToast('Notifications require a development build on Android Expo Go 🌸');
      return;
    }
    await defaultNotificationService.scheduleDailySummary(9, 0, totalTasks);
    onShowToast('Test morning briefing scheduled (09:00 AM) 🌸');
  };

  const handleTestEveningNotification = async () => {
    hapticSuccess();
    if (!defaultNotificationService.isSupported) {
      onShowToast('Notifications require a development build on Android Expo Go 🌸');
      return;
    }
    await defaultNotificationService.scheduleEveningWindDown(20, 30, totalTasks);
    onShowToast('Test evening wind-down scheduled (20:30 PM) 🌙');
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={[styles.sheetTitle, { color: theme.text }]}>Settings & Preferences</Text>
              <Text style={[styles.subtitle, { color: theme.textDim }]}>
                {totalTasks} tasks, {totalLists} custom lists
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={theme.textDim} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Section: Cloud Sync */}
            <Text style={[styles.sectionTitle, { color: theme.textDim }]}>CLOUD & DEVICE SYNC</Text>

            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}
              onPress={() => {
                hapticLight();
                onClose();
                onOpenSyncModal?.();
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.iconCircle, { backgroundColor: theme.primaryLight }]}>
                <Ionicons name="cloud-outline" size={20} color={theme.primary} />
              </View>
              <View style={styles.actionContent}>
                <Text style={[styles.actionTitle, { color: theme.text }]}>Cloud Sync (Pairing Key)</Text>
                <Text style={[styles.actionDesc, { color: theme.textDim }]}>
                  Manage your real-time sync key across web and mobile.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.textDim} />
            </TouchableOpacity>

            {/* Section: Zen Milestones & Badges */}
            <View style={styles.milestonesHeaderRow}>
              <Text style={[styles.sectionTitle, { color: theme.textDim, marginTop: 0, marginBottom: 0 }]}>
                ZEN MILESTONES & ACHIEVEMENTS
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
                      opacity: m.unlocked ? 1 : 0.65,
                    },
                  ]}
                >
                  <View style={styles.milestoneTopRow}>
                    <Text style={styles.milestoneIcon}>{m.icon}</Text>
                    {m.unlocked ? (
                      <View style={[styles.unlockedPill, { backgroundColor: theme.primaryLight }]}>
                        <Ionicons name="checkmark-circle" size={11} color={theme.primary} />
                        <Text style={[styles.unlockedPillText, { color: theme.primary }]}>Unlocked</Text>
                      </View>
                    ) : (
                      <View style={[styles.lockedPill, { backgroundColor: theme.surfaceMuted }]}>
                        <Ionicons name="lock-closed" size={9} color={theme.textDim} />
                        <Text style={[styles.lockedPillText, { color: theme.textDim }]}>In Progress</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.milestoneTitle, { color: theme.text }]}>{m.title}</Text>
                  <Text style={[styles.milestoneDesc, { color: theme.textDim }]}>{m.description}</Text>
                </View>
              ))}
            </View>

            {/* Section: Preferences & Daily Summary */}
            <Text style={[styles.sectionTitle, { color: theme.textDim }]}>DAILY SUMMARY & NOTIFICATIONS</Text>

            <View style={[styles.actionCard, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}>
              <View style={[styles.iconCircle, { backgroundColor: theme.surface }]}>
                <Ionicons name="notifications-outline" size={20} color={theme.primary} />
              </View>
              <View style={styles.actionContent}>
                <View style={styles.titleRowWithBtn}>
                  <Text style={[styles.actionTitle, { color: theme.text }]}>Morning Briefing (09:00 AM)</Text>
                  <TouchableOpacity
                    style={[styles.miniTestBtn, { borderColor: theme.border }]}
                    onPress={handleTestNotification}
                  >
                    <Text style={[styles.miniTestText, { color: theme.primary }]}>Test</Text>
                  </TouchableOpacity>
                </View>
                <Text style={[styles.actionDesc, { color: theme.textDim }]}>
                  Receive a gentle morning overview with today&apos;s pending tasks.
                </Text>
              </View>
              <Switch
                value={morningSummaryEnabled}
                onValueChange={handleToggleMorning}
                trackColor={{ false: theme.border, true: theme.primary }}
                thumbColor="#ffffff"
              />
            </View>

            <View style={[styles.actionCard, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}>
              <View style={[styles.iconCircle, { backgroundColor: theme.surface }]}>
                <Ionicons name="moon-outline" size={20} color={theme.accent || theme.primary} />
              </View>
              <View style={styles.actionContent}>
                <View style={styles.titleRowWithBtn}>
                  <Text style={[styles.actionTitle, { color: theme.text }]}>Evening Wind-Down (20:30 PM)</Text>
                  <TouchableOpacity
                    style={[styles.miniTestBtn, { borderColor: theme.border }]}
                    onPress={handleTestEveningNotification}
                  >
                    <Text style={[styles.miniTestText, { color: theme.primary }]}>Test</Text>
                  </TouchableOpacity>
                </View>
                <Text style={[styles.actionDesc, { color: theme.textDim }]}>
                  Gentle evening reminder to complete remaining tasks or peacefully roll them over to tomorrow.
                </Text>
              </View>
              <Switch
                value={eveningWindDownEnabled}
                onValueChange={handleToggleEvening}
                trackColor={{ false: theme.border, true: theme.primary }}
                thumbColor="#ffffff"
              />
            </View>

            {/* Section: Appearance & Night Shift */}
            <Text style={[styles.sectionTitle, { color: theme.textDim }]}>APPEARANCE & NIGHT SHIFT</Text>

            <View style={[styles.actionCard, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}>
              <View style={[styles.iconCircle, { backgroundColor: theme.surface }]}>
                <Ionicons name="moon-outline" size={20} color={theme.accent || theme.primary} />
              </View>
              <View style={styles.actionContent}>
                <Text style={[styles.actionTitle, { color: theme.text }]}>Auto Night Shift (20:00 - 07:00)</Text>
                <Text style={[styles.actionDesc, { color: theme.textDim }]}>
                  Automatically switch to Midnight dark mode in the evening.
                </Text>
              </View>
              <Switch
                value={autoNightShift}
                onValueChange={onToggleAutoNightShift}
                trackColor={{ false: theme.border, true: theme.primary }}
                thumbColor="#ffffff"
              />
            </View>

            {/* Section: Experience & Haptics */}
            <Text style={[styles.sectionTitle, { color: theme.textDim }]}>AUDIO & TOUCH FEEDBACK</Text>

            <View style={[styles.actionCard, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}>
              <View style={[styles.iconCircle, { backgroundColor: theme.surface }]}>
                <Ionicons name="volume-medium-outline" size={20} color={theme.primary} />
              </View>
              <View style={styles.actionContent}>
                <Text style={[styles.actionTitle, { color: theme.text }]}>Zen Sound Effects (ASMR)</Text>
                <Text style={[styles.actionDesc, { color: theme.textDim }]}>
                  Organic woodblock clicks, water drops, and soft swooshes.
                </Text>
              </View>
              <Switch
                value={sfxEnabled}
                onValueChange={handleToggleSfx}
                trackColor={{ false: theme.border, true: theme.primary }}
                thumbColor="#ffffff"
              />
            </View>

            <View style={[styles.actionCard, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}>
              <View style={[styles.iconCircle, { backgroundColor: theme.surface }]}>
                <Ionicons name="musical-notes-outline" size={20} color={theme.accent} />
              </View>
              <View style={styles.actionContent}>
                <Text style={[styles.actionTitle, { color: theme.text }]}>Zen Singing Bowl Chime</Text>
                <Text style={[styles.actionDesc, { color: theme.textDim }]}>
                  Play 432 Hz bell chime when completing focus sessions.
                </Text>
              </View>
              <Switch
                value={chimeEnabled}
                onValueChange={handleToggleChime}
                trackColor={{ false: theme.border, true: theme.primary }}
                thumbColor="#ffffff"
              />
            </View>

            <View style={[styles.actionCard, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}>
              <View style={[styles.iconCircle, { backgroundColor: theme.surface }]}>
                <Ionicons name="radio-outline" size={20} color={theme.primary} />
              </View>
              <View style={styles.actionContent}>
                <Text style={[styles.actionTitle, { color: theme.text }]}>Haptic Tactile Feedback</Text>
                <Text style={[styles.actionDesc, { color: theme.textDim }]}>
                  Subtle vibrations when checking tasks and tapping controls.
                </Text>
              </View>
              <Switch
                value={hapticsEnabled}
                onValueChange={handleToggleHaptics}
                trackColor={{ false: theme.border, true: theme.primary }}
                thumbColor="#ffffff"
              />
            </View>

            {/* Section: Görev Mezarlığı (Silent Archive) */}
            <Text style={[styles.sectionTitle, { color: theme.textDim }]}>SILENT ARCHIVE (GÖREV MEZARLIĞI)</Text>

            <TouchableOpacity
              style={[
                styles.actionCard,
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
                  <Text style={{ fontSize: 18 }}>🪦</Text>
                </View>
                <View style={styles.actionContent}>
                  <View style={styles.titleRowWithBtn}>
                    <Text style={[styles.actionTitle, { color: theme.text }]}>Mindful Archive</Text>
                    {archivedTasks.length > 0 && (
                      <View style={[styles.archiveCountBadge, { backgroundColor: theme.primaryLight }]}>
                        <Text style={[styles.archiveCountText, { color: theme.primary }]}>
                          {archivedTasks.length} {archivedTasks.length === 1 ? 'task' : 'tasks'}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.actionDesc, { color: theme.textDim }]}>
                    {archivedTasks.length > 0
                      ? 'Tasks untouched for 14+ days are quietly rested here to clear mental clutter.'
                      : 'No neglected tasks. Tasks untouched for 14+ days will quietly rest here without guilt.'}
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
                          Planned: {t.date} {t.archivedAt ? `• Archived: ${t.archivedAt}` : ''}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={[styles.unarchiveBtn, { borderColor: theme.primary }]}
                        onPress={() => {
                          hapticSuccess();
                          onUnarchiveTask?.(t.id);
                          onShowToast(`"${t.title}" restored to today 🌸`);
                        }}
                      >
                        <Ionicons name="arrow-undo-outline" size={13} color={theme.primary} />
                        <Text style={[styles.unarchiveBtnText, { color: theme.primary }]}>Restore</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </TouchableOpacity>

            {/* Section: Data Backup & Restore */}
            <Text style={[styles.sectionTitle, { color: theme.textDim }]}>DATA PORTABILITY (JSON)</Text>

            {/* Export Card */}
            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}
              onPress={handleExport}
              disabled={isExporting}
              activeOpacity={0.7}
            >
              <View style={[styles.iconCircle, { backgroundColor: theme.primaryLight }]}>
                {isExporting ? (
                  <ActivityIndicator size="small" color={theme.primary} />
                ) : (
                  <Ionicons name="share-outline" size={20} color={theme.primary} />
                )}
              </View>
              <View style={styles.actionContent}>
                <Text style={[styles.actionTitle, { color: theme.text }]}>Export Backup</Text>
                <Text style={[styles.actionDesc, { color: theme.textDim }]}>
                  Save or share all your tasks and lists as a JSON file.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.textDim} />
            </TouchableOpacity>

            {/* Import Card */}
            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}
              onPress={handleImport}
              disabled={isImporting}
              activeOpacity={0.7}
            >
              <View style={[styles.iconCircle, { backgroundColor: theme.surface }]}>
                {isImporting ? (
                  <ActivityIndicator size="small" color={theme.primary} />
                ) : (
                  <Ionicons name="download-outline" size={20} color={theme.accent} />
                )}
              </View>
              <View style={styles.actionContent}>
                <Text style={[styles.actionTitle, { color: theme.text }]}>Restore Backup</Text>
                <Text style={[styles.actionDesc, { color: theme.textDim }]}>
                  Import a previously saved JSON backup file.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.textDim} />
            </TouchableOpacity>

            {/* Section: App Info */}
            <View style={[styles.infoCard, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}>
              <Text style={[styles.infoTitle, { color: theme.text }]}>Zen Task Calendar 🌸</Text>
              <Text style={[styles.infoSub, { color: theme.textDim }]}>
                Version 1.0.0
              </Text>
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
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 38 : 24,
    borderWidth: 1,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginTop: 14,
    marginBottom: 8,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 8,
    gap: 12,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  actionDesc: {
    fontSize: 11,
    lineHeight: 15,
  },
  titleRowWithBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  miniTestBtn: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 6,
  },
  miniTestText: {
    fontSize: 10,
    fontWeight: '700',
  },
  infoCard: {
    marginTop: 20,
    marginBottom: 10,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  infoSub: {
    fontSize: 11,
  },
  milestonesHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18,
    marginBottom: 10,
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
    marginBottom: 8,
  },
  milestoneCard: {
    width: '48.5%',
    padding: 12,
    borderRadius: 16,
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
    borderTopWidth: 1,
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
});
