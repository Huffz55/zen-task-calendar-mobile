import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { AppTheme } from '../../types';
import { THEMES, ThemeColors, withAlpha } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { hapticSelection } from '../../hooks/useHaptics';
import { CloseButton } from './CloseButton';
import { SwipeableBottomSheet, useBottomSheetClose } from './SwipeableBottomSheet';
import { useTranslation } from '../../i18n';

interface ThemeModalProps {
  visible: boolean;
  currentTheme: AppTheme;
  theme: ThemeColors;
  onSelectTheme: (theme: AppTheme) => void;
  onClose: () => void;
}

export function ThemeModal({
  visible,
  currentTheme,
  theme,
  onSelectTheme,
  onClose,
}: ThemeModalProps) {
  return (
    <SwipeableBottomSheet visible={visible} onClose={onClose} theme={theme} maxHeight="80%">
      <ThemeModalBody
        currentTheme={currentTheme}
        theme={theme}
        onSelectTheme={onSelectTheme}
      />
    </SwipeableBottomSheet>
  );
}

function ThemeModalBody({
  currentTheme,
  theme,
  onSelectTheme,
}: Omit<ThemeModalProps, 'visible' | 'onClose'>) {
  const { t } = useTranslation();
  const sheetClose = useBottomSheetClose();
  const themeEntries = Object.entries(THEMES) as [AppTheme, ThemeColors][];

  return (
    <>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]} numberOfLines={1} maxFontSizeMultiplier={1.35}>
          {t('themes.modalTitle')}
        </Text>
        <CloseButton theme={theme} accessibilityLabel={t('themes.a11yClose')} />
      </View>

      <View style={styles.optionsList}>
        {themeEntries.map(([key, item]) => {
          const isSelected = currentTheme === key;
          const localizedName = t(`themes.${key}`);
          return (
            <TouchableOpacity
              key={key}
              style={[
                styles.optionCard,
                {
                  backgroundColor: isSelected ? theme.primaryLight : theme.surfaceMuted,
                  borderColor: isSelected ? theme.primary : theme.border,
                },
              ]}
              onPress={() => {
                hapticSelection();
                onSelectTheme(key);
                sheetClose?.();
              }}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={t('themes.a11ySelectTheme', { name: localizedName })}
            >
              <View style={styles.optionLeft}>
                <Text style={styles.optionIcon}>{item.icon}</Text>
                <Text
                  style={[styles.optionName, { color: theme.text }]}
                  numberOfLines={1}
                  maxFontSizeMultiplier={1.35}
                >
                  {localizedName}
                </Text>
              </View>

              <View style={styles.optionRight}>
                <View style={styles.swatchRow}>
                  <View
                    style={[
                      styles.colorPreviewDot,
                      {
                        backgroundColor: item.background,
                        borderColor: withAlpha(theme.text, 0.14),
                      },
                    ]}
                  />
                  <View
                    style={[
                      styles.colorPreviewDot,
                      {
                        backgroundColor: item.accent,
                        borderColor: withAlpha(theme.text, 0.14),
                      },
                    ]}
                  />
                  <View
                    style={[
                      styles.colorPreviewDot,
                      {
                        backgroundColor: item.primary,
                        borderColor: withAlpha(theme.text, 0.14),
                      },
                    ]}
                  />
                </View>
                {isSelected && (
                  <Ionicons name="checkmark-circle" size={22} color={theme.primary} />
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  optionsList: {
    gap: 10,
  },
  optionCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 56,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 10,
  },
  optionIcon: {
    fontSize: 22,
  },
  optionName: {
    fontSize: 15,
    fontWeight: '600',
    flexShrink: 1,
  },
  optionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  swatchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  colorPreviewDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
  },
});
