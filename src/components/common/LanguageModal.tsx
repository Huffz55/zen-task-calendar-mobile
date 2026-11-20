import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors } from '../../constants/colors';
import { hapticLight, hapticSelection } from '../../hooks/useHaptics';
import { SwipeableBottomSheet } from './SwipeableBottomSheet';
import { resolveDeviceLanguage, useTranslation, type LanguagePreference } from '../../i18n';

interface LanguageModalProps {
  visible: boolean;
  theme: ThemeColors;
  currentPreference: LanguagePreference;
  onSelectLanguage: (preference: LanguagePreference) => void;
  onClose: () => void;
}

export function LanguageModal({
  visible,
  theme,
  currentPreference,
  onSelectLanguage,
  onClose,
}: LanguageModalProps) {
  const { t } = useTranslation();
  const deviceLang = resolveDeviceLanguage();
  const resolvedSystemLabel = t(
    deviceLang === 'tr' ? 'settings.languageOptions.tr' : 'settings.languageOptions.en'
  );

  const options: { id: LanguagePreference; label: string }[] = [
    {
      id: 'system',
      label: t('settings.languageModal.systemOption', { language: resolvedSystemLabel }),
    },
    { id: 'tr', label: t('settings.languageOptions.tr') },
    { id: 'en', label: t('settings.languageOptions.en') },
  ];

  return (
    <SwipeableBottomSheet visible={visible} onClose={onClose} theme={theme} maxHeight="55%">
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]} numberOfLines={1} maxFontSizeMultiplier={1.35}>
          {t('settings.language')}
        </Text>
        <TouchableOpacity
          onPress={() => {
            hapticLight();
            onClose();
          }}
          style={[styles.closeBtn, { backgroundColor: theme.surfaceMuted }]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel={t('settings.a11yCloseLanguage')}
        >
          <Ionicons name="close" size={18} color={theme.textDim} />
        </TouchableOpacity>
      </View>

      <View style={styles.optionsList}>
        {options.map(option => {
          const isSelected = currentPreference === option.id;
          return (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.optionCard,
                {
                  backgroundColor: isSelected ? theme.primaryLight : theme.surfaceMuted,
                  borderColor: isSelected ? theme.primary : theme.border,
                },
              ]}
              onPress={() => {
                hapticSelection();
                onSelectLanguage(option.id);
                onClose();
              }}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={option.label}
            >
              <Text
                style={[
                  styles.optionLabel,
                  {
                    color: isSelected ? theme.primary : theme.text,
                    fontWeight: isSelected ? '700' : '600',
                  },
                ]}
                numberOfLines={1}
                maxFontSizeMultiplier={1.35}
              >
                {option.label}
              </Text>
              {isSelected && (
                <Ionicons name="checkmark-circle" size={22} color={theme.primary} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </SwipeableBottomSheet>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionsList: {
    gap: 10,
    paddingBottom: 6,
  },
  optionCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 54,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  optionLabel: {
    fontSize: 15,
    flex: 1,
    marginRight: 10,
  },
});
