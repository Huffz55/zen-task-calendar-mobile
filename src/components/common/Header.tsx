import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemeColors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { hapticLight } from '../../hooks/useHaptics';

interface HeaderProps {
  theme: ThemeColors;
  currentStreak: number;
  onOpenThemeModal: () => void;
  onOpenSettingsModal?: () => void;
  onOpenSyncModal?: () => void;
  onOpenEveningReview?: () => void;
  title?: string;
  subtitle?: string;
}

export function Header({
  theme,
  currentStreak,
  onOpenThemeModal,
  onOpenSettingsModal,
  onOpenSyncModal,
  onOpenEveningReview,
  title = 'Plan your day',
  subtitle,
}: HeaderProps) {
  const insets = useSafeAreaInsets();
  const safeTopPadding = Math.max(insets.top, Platform.OS === 'android' ? 28 : 20) + 6;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'A calm morning ahead 🌸';
    if (hour >= 12 && hour < 18) return 'A focused afternoon 🌸';
    if (hour >= 18 && hour < 22) return 'Wind down & reflect 🌙';
    return 'Time to rest 🌙';
  };

  return (
    <View style={[styles.container, { borderBottomColor: theme.border, paddingTop: safeTopPadding }]}>
      <View style={styles.left}>
        <View style={styles.greetingRow}>
          <Text style={[styles.subtitle, { color: theme.accent }]}>
            {subtitle || getGreeting()}
          </Text>
          {currentStreak > 0 && (
            <View style={[styles.streakBadge, { backgroundColor: theme.primaryLight }]}>
              <Text style={[styles.streakText, { color: theme.primary }]}>
                🔥 {currentStreak} {currentStreak === 1 ? 'Day' : 'Days'}
              </Text>
            </View>
          )}
        </View>
        <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      </View>

      <View style={styles.rightActions}>
        {onOpenEveningReview && (
          <TouchableOpacity
            style={[styles.headerIconBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}
            onPress={() => {
              hapticLight();
              onOpenEveningReview();
            }}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="moon-outline" size={16} color={theme.primary} />
          </TouchableOpacity>
        )}

        {onOpenSyncModal && (
          <TouchableOpacity
            style={[styles.headerIconBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}
            onPress={() => {
              hapticLight();
              onOpenSyncModal();
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="cloud-outline" size={16} color={theme.primary} />
          </TouchableOpacity>
        )}

        {onOpenSettingsModal && (
          <TouchableOpacity
            style={[styles.headerIconBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}
            onPress={() => {
              hapticLight();
              onOpenSettingsModal();
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="settings-outline" size={16} color={theme.text} />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.themeButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
          onPress={() => {
            hapticLight();
            onOpenThemeModal();
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.themeIcon}>{theme.icon}</Text>
          <Ionicons name="color-palette-outline" size={16} color={theme.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  left: {
    flex: 1,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  streakBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  streakText: {
    fontSize: 11,
    fontWeight: '700',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  themeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  themeIcon: {
    fontSize: 14,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
