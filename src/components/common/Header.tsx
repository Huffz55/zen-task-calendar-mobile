import { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemeColors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { hapticLight } from '../../hooks/useHaptics';
import { useTranslation } from '../../i18n';

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

export const Header = memo(function Header({
  theme,
  currentStreak,
  onOpenThemeModal,
  onOpenSettingsModal,
  onOpenSyncModal,
  onOpenEveningReview,
  title,
  subtitle,
}: HeaderProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const safeTopPadding = Math.max(insets.top, Platform.OS === 'android' ? 28 : 20) + 6;
  const resolvedTitle = title ?? t('header.defaultTitle');

  return (
    <View style={[styles.container, { borderBottomColor: theme.border, paddingTop: safeTopPadding }]}>
      <View style={styles.left}>
        {(Boolean(subtitle) || currentStreak > 0) && (
          <View style={styles.greetingRow}>
            {subtitle ? (
              <Text
                style={[styles.subtitle, { color: theme.textSecondary }]}
                numberOfLines={1}
                ellipsizeMode="tail"
                maxFontSizeMultiplier={1.35}
              >
                {subtitle}
              </Text>
            ) : null}
            {currentStreak > 0 && (
              <View style={[styles.streakBadge, { backgroundColor: theme.primaryLight }]}>
                <Ionicons name="flame-outline" size={12} color={theme.primary} />
                <Text style={[styles.streakText, { color: theme.primary }]} maxFontSizeMultiplier={1.35}>
                  {t(currentStreak === 1 ? 'header.streakOne' : 'header.streakOther', {
                    count: currentStreak,
                  })}
                </Text>
              </View>
            )}
          </View>
        )}
        <Text
          style={[styles.title, { color: theme.text }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.78}
          ellipsizeMode="tail"
          maxFontSizeMultiplier={1.35}
        >
          {resolvedTitle}
        </Text>
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
            accessibilityRole="button"
            accessibilityLabel={t('header.a11yEveningReview')}
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
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={t('header.a11yCloudSync')}
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
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={t('header.a11ySettings')}
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
          hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
          accessibilityRole="button"
          accessibilityLabel={t('header.a11yChangeTheme')}
        >
          <Text style={styles.themeIcon}>{theme.icon}</Text>
          <Ionicons name="color-palette-outline" size={16} color={theme.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );
});

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
    marginRight: 8,
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
    flexShrink: 1,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    flexShrink: 0,
  },
  streakText: {
    fontSize: 11,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  themeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 32,
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
  },
  themeIcon: {
    fontSize: 13,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  headerIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
