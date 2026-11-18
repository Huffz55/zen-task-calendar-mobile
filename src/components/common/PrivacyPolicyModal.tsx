import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors } from '../../constants/colors';
import { hapticLight } from '../../hooks/useHaptics';
import { BottomSheetScrollView, SwipeableBottomSheet } from './SwipeableBottomSheet';

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
    <SwipeableBottomSheet visible={visible} onClose={onClose} theme={theme} maxHeight="82%">
      <View style={styles.header}>
        <View style={styles.headerTextWrap}>
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
            Privacy Policy
          </Text>
          <Text style={[styles.subtitle, { color: theme.textDim }]} numberOfLines={1}>
            Zen Task Calendar • Last updated 2026
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => {
            hapticLight();
            onClose();
          }}
          style={styles.closeBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Close privacy policy"
        >
          <Ionicons name="close" size={20} color={theme.textDim} />
        </TouchableOpacity>
      </View>

      <BottomSheetScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
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
              <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={1}>
                {sec.title}
              </Text>
            </View>
            <Text style={[styles.cardBody, { color: theme.textDim }]}>{sec.body}</Text>
          </View>
        ))}
      </BottomSheetScrollView>

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
    </SwipeableBottomSheet>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTextWrap: {
    flex: 1,
    marginRight: 8,
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
    flex: 1,
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
