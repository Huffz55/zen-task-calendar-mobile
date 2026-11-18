import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Switch,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeColors, withAlpha } from '../../constants/colors';
import { Task } from '../../types';
import { Ionicons } from '@expo/vector-icons';
import { hapticLight, hapticSelection, setGlobalHapticsEnabled } from '../../hooks/useHaptics';
import { defaultNotificationService } from '../../services/notifications/notificationService';
import { defaultBackupService } from '../../services/storage/backupService';
import { isSoundEffectsEnabled, setSoundEffectsEnabled } from '../../services/audio/audioService';
import { PrivacyPolicyModal } from './PrivacyPolicyModal';
import { BottomSheetScrollView, SwipeableBottomSheet } from './SwipeableBottomSheet';

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
  onOpenThemeModal?: () => void;
  onExportBackup: () => Promise<void>;
  onImportBackup: () => Promise<void>;
  onClearAllData?: () => Promise<void>;
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
  tasks = [],
  autoNightShift = false,
  onToggleAutoNightShift,
  onClose,
  onOpenThemeModal,
  onExportBackup,
  onImportBackup,
  onClearAllData,
  onShowToast,
}: SettingsModalProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isClearingData, setIsClearingData] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [morningSummaryEnabled, setMorningSummaryEnabled] = useState(false);
  const [eveningWindDownEnabled, setEveningWindDownEnabled] = useState(false);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const [chimeEnabled, setChimeEnabled] = useState(true);
  const [sfxEnabled, setSfxEnabled] = useState(() => isSoundEffectsEnabled());

  useEffect(() => {
    if (!visible) return;
    AsyncStorage.getItem(SETTINGS_MORNING_KEY).then(val => {
      setMorningSummaryEnabled(val === 'true');
    });
    AsyncStorage.getItem(SETTINGS_EVENING_KEY).then(val => {
      setEveningWindDownEnabled(val === 'true');
    });
    AsyncStorage.getItem(SETTINGS_HAPTIC_KEY).then(val => {
      if (val !== null) {
        const enabled = val === 'true';
        setHapticsEnabled(enabled);
        setGlobalHapticsEnabled(enabled);
      }
    });
    AsyncStorage.getItem(SETTINGS_CHIME_KEY).then(val => {
      if (val !== null) setChimeEnabled(val === 'true');
    });
  }, [visible]);

  const handleToggleSfx = async (enabled: boolean) => {
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
    setGlobalHapticsEnabled(enabled);
    if (enabled) hapticLight();
    setHapticsEnabled(enabled);
    await AsyncStorage.setItem(SETTINGS_HAPTIC_KEY, String(enabled));
    onShowToast(enabled ? 'Haptics enabled' : 'Haptics disabled');
  };

  const handleToggleChime = async (enabled: boolean) => {
    hapticLight();
    setChimeEnabled(enabled);
    await AsyncStorage.setItem(SETTINGS_CHIME_KEY, String(enabled));
    onShowToast(enabled ? 'Completion chime enabled' : 'Completion chime disabled');
  };

  const handleExport = () => {
    hapticLight();
    Alert.alert('Export Data', 'Choose format', [
      {
        text: 'Backup (.json)',
        onPress: async () => {
          setIsExporting(true);
          try {
            await onExportBackup();
          } finally {
            setIsExporting(false);
          }
        },
      },
      {
        text: 'Calendar (.ics)',
        onPress: async () => {
          setIsExporting(true);
          try {
            await defaultBackupService.exportICS(tasks);
            onShowToast('Calendar exported');
          } catch {
            onShowToast('Failed to export calendar');
          } finally {
            setIsExporting(false);
          }
        },
      },
      {
        text: 'Markdown (.md)',
        onPress: async () => {
          setIsExporting(true);
          try {
            await defaultBackupService.exportMarkdown(tasks);
            onShowToast('Markdown exported');
          } catch {
            onShowToast('Failed to export markdown');
          } finally {
            setIsExporting(false);
          }
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
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

  const handleConfirmClearData = () => {
    if (!onClearAllData || isClearingData) return;
    hapticLight();
    Alert.alert(
      'Clear All Data?',
      'All tasks, checklists, focus history, and synced workspace data will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsClearingData(true);
            try {
              await onClearAllData();
              onClose();
            } finally {
              setIsClearingData(false);
            }
          },
        },
      ]
    );
  };

  return (
    <>
      <SwipeableBottomSheet visible={visible && !isPrivacyOpen} onClose={onClose} theme={theme} maxHeight="88%">
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={[styles.sheetTitle, { color: theme.text }]} numberOfLines={1}>
              Settings
            </Text>
            <Text style={[styles.subtitle, { color: theme.textDim }]} numberOfLines={1}>
              {totalTasks} tasks • {totalLists} lists
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              hapticLight();
              onClose();
            }}
            style={[styles.closeBtn, { backgroundColor: theme.surfaceMuted }]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Close settings"
          >
            <Ionicons name="close" size={18} color={theme.textDim} />
          </TouchableOpacity>
        </View>

        <BottomSheetScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Preferences */}
          <Text style={[styles.sectionTitle, { color: theme.textDim }]}>PREFERENCES</Text>
          <View style={[styles.groupCard, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}>
            {onOpenThemeModal && (
              <>
                <TouchableOpacity
                  style={styles.groupRow}
                  onPress={() => {
                    hapticLight();
                    onClose();
                    onOpenThemeModal();
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.iconCircle, { backgroundColor: theme.surface }]}>
                    <Ionicons name="color-palette-outline" size={18} color={theme.primary} />
                  </View>
                  <View style={styles.actionContent}>
                    <Text style={[styles.actionTitle, { color: theme.text }]} numberOfLines={1}>
                      Appearance
                    </Text>
                    <Text style={[styles.actionDesc, { color: theme.textDim }]} numberOfLines={1}>
                      {theme.name}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={theme.textDim} />
                </TouchableOpacity>
                <View style={[styles.rowDivider, { backgroundColor: theme.border }]} />
              </>
            )}

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

            <View style={styles.groupRow}>
              <View style={[styles.iconCircle, { backgroundColor: theme.surface }]}>
                <Ionicons name="moon-outline" size={18} color={theme.accent || theme.primary} />
              </View>
              <View style={styles.actionContent}>
                <Text style={[styles.actionTitle, { color: theme.text }]}>Auto Dark Mode</Text>
              </View>
              <Switch
                value={autoNightShift}
                onValueChange={(enabled) => {
                  hapticSelection();
                  onToggleAutoNightShift?.(enabled);
                }}
                trackColor={{ false: theme.border, true: theme.primary }}
                thumbColor="#ffffff"
              />
            </View>
          </View>

          {/* Daily Notifications */}
          <Text style={[styles.sectionTitle, { color: theme.textDim }]}>NOTIFICATIONS</Text>
          <View style={[styles.groupCard, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}>
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

          {/* Backup & Data */}
          <Text style={[styles.sectionTitle, { color: theme.textDim }]}>DATA</Text>
          <View style={[styles.groupCard, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}>
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
                <Text style={[styles.actionTitle, { color: theme.text }]}>Export Data</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.textDim} />
            </TouchableOpacity>

            <View style={[styles.rowDivider, { backgroundColor: theme.border }]} />

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

            <View style={[styles.rowDivider, { backgroundColor: theme.border }]} />

            <TouchableOpacity
              style={styles.groupRow}
              onPress={() => {
                hapticLight();
                setIsPrivacyOpen(true);
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.iconCircle, { backgroundColor: theme.surface }]}>
                <Ionicons name="shield-checkmark-outline" size={18} color={theme.primary} />
              </View>
              <View style={styles.actionContent}>
                <Text style={[styles.actionTitle, { color: theme.text }]}>Privacy Policy</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.textDim} />
            </TouchableOpacity>

            {onClearAllData && (
              <>
                <View style={[styles.rowDivider, { backgroundColor: theme.border }]} />
                <TouchableOpacity
                  style={styles.groupRow}
                  onPress={handleConfirmClearData}
                  disabled={isClearingData}
                  activeOpacity={0.7}
                >
                  <View style={[styles.iconCircle, { backgroundColor: withAlpha(theme.danger, theme.isDark ? 0.2 : 0.12) }]}>
                    {isClearingData ? (
                      <ActivityIndicator size="small" color={theme.danger} />
                    ) : (
                      <Ionicons name="trash-outline" size={18} color={theme.danger} />
                    )}
                  </View>
                  <View style={styles.actionContent}>
                    <Text style={[styles.actionTitle, { color: theme.danger }]} numberOfLines={1}>
                      Clear All Data
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={theme.textDim} />
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* App Footer */}
          <View style={styles.footer}>
            <Text style={[styles.footerTitle, { color: theme.textDim }]}>Zen Task Calendar</Text>
            <Text style={[styles.footerSub, { color: theme.textDim }]}>Version 1.0.0</Text>
          </View>
        </BottomSheetScrollView>
      </SwipeableBottomSheet>

      <PrivacyPolicyModal
        visible={isPrivacyOpen}
        theme={theme}
        onClose={() => setIsPrivacyOpen(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
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
    fontVariant: ['tabular-nums'],
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingBottom: 16,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginTop: 14,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  groupCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
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
  footer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 6,
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
