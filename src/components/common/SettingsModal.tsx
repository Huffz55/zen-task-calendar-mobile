import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { ThemeColors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { hapticLight, hapticSuccess } from '../../hooks/useHaptics';
import { defaultNotificationService } from '../../services/notifications/notificationService';

interface SettingsModalProps {
  visible: boolean;
  theme: ThemeColors;
  totalTasks: number;
  totalLists: number;
  onClose: () => void;
  onOpenSyncModal?: () => void;
  onExportBackup: () => Promise<void>;
  onImportBackup: () => Promise<void>;
  onShowToast: (msg: string) => void;
}

export function SettingsModal({
  visible,
  theme,
  totalTasks,
  totalLists,
  onClose,
  onOpenSyncModal,
  onExportBackup,
  onImportBackup,
  onShowToast,
}: SettingsModalProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

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
      onShowToast('Notifications are limited in Expo Go on Android. A development build is required 🌸');
      return;
    }
    await defaultNotificationService.scheduleDailySummary(9, 0, totalTasks);
    onShowToast('Morning notification (09:00 AM) scheduled successfully 🌸');
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={[styles.sheetTitle, { color: theme.text }]}>Settings & Data</Text>
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

            {/* Section: Notifications */}
            <Text style={[styles.sectionTitle, { color: theme.textDim }]}>NOTIFICATIONS</Text>

            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}
              onPress={handleTestNotification}
              activeOpacity={0.7}
            >
              <View style={[styles.iconCircle, { backgroundColor: theme.surface }]}>
                <Ionicons name="notifications-outline" size={20} color={theme.primary} />
              </View>
              <View style={styles.actionContent}>
                <Text style={[styles.actionTitle, { color: theme.text }]}>Morning Summary (09:00 AM)</Text>
                <Text style={[styles.actionDesc, { color: theme.textDim }]}>
                  Schedule or test the daily morning overview notification.
                </Text>
              </View>
              <Ionicons name="refresh" size={16} color={theme.textDim} />
            </TouchableOpacity>

            {/* Section: App Info */}
            <View style={[styles.infoCard, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}>
              <Text style={[styles.infoTitle, { color: theme.text }]}>Zen Task Calendar Mobile 🌸</Text>
              <Text style={[styles.infoSub, { color: theme.textDim }]}>
                Version 1.0.0 • Clean Architecture • Offline-First
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
});
