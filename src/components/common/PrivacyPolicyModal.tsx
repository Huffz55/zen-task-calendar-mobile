import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors } from '../../constants/colors';
import { hapticLight } from '../../hooks/useHaptics';

interface PrivacyPolicyModalProps {
  visible: boolean;
  theme: ThemeColors;
  onClose: () => void;
}

const SECTIONS = [
  {
    icon: 'phone-portrait-outline' as const,
    title: 'Local-First Storage',
    body: 'Your tasks, checklists, preferences, and focus sessions are stored directly on your device so everything stays fast and works offline.',
  },
  {
    icon: 'cloud-outline' as const,
    title: 'Optional Cloud Sync',
    body: 'Cross-device sync stores workspace data over HTTPS in Google Firebase Cloud Firestore using a randomly generated pairing key (ZEN-XXXX-XXXX) secured in hardware key storage and anonymous authentication. No name, email, or password is required.',
  },
  {
    icon: 'shield-checkmark-outline' as const,
    title: 'Zero Tracking or Ads',
    body: 'Zen Task Calendar contains no third-party advertising SDKs, behavioral profiling, or data brokers. Your notes remain private.',
  },
  {
    icon: 'trash-outline' as const,
    title: 'Export & Full Deletion',
    body: 'You can export your data anytime (JSON, ICS, or Markdown) or permanently erase both local and synced cloud records directly from Settings.',
  },
];

export function PrivacyPolicyModal({ visible, theme, onClose }: PrivacyPolicyModalProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.header}>
            <View>
              <Text style={[styles.title, { color: theme.text }]}>Privacy Policy</Text>
              <Text style={[styles.subtitle, { color: theme.textDim }]}>
                Zen Task Calendar • Last updated 2026
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                hapticLight();
                onClose();
              }}
              style={styles.closeBtn}
            >
              <Ionicons name="close" size={20} color={theme.textDim} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {SECTIONS.map((sec) => (
              <View
                key={sec.title}
                style={[
                  styles.card,
                  { backgroundColor: theme.surfaceMuted, borderColor: theme.border },
                ]}
              >
                <View style={styles.cardHeader}>
                  <View style={[styles.iconBadge, { backgroundColor: theme.primaryLight }]}>
                    <Ionicons name={sec.icon} size={16} color={theme.primary} />
                  </View>
                  <Text style={[styles.cardTitle, { color: theme.text }]}>{sec.title}</Text>
                </View>
                <Text style={[styles.cardBody, { color: theme.textDim }]}>{sec.body}</Text>
              </View>
            ))}
          </ScrollView>

          <TouchableOpacity
            style={[styles.doneBtn, { backgroundColor: theme.primary }]}
            onPress={() => {
              hapticLight();
              onClose();
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.doneBtnText}>Close</Text>
          </TouchableOpacity>
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
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    borderWidth: 1,
    maxHeight: '82%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  scrollContent: {
    gap: 10,
    paddingBottom: 12,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  iconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  cardBody: {
    fontSize: 12,
    lineHeight: 18,
  },
  doneBtn: {
    marginTop: 12,
    paddingVertical: 13,
    borderRadius: 16,
    alignItems: 'center',
  },
  doneBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
