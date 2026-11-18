import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { AppTheme } from '../../types';
import { THEMES, ThemeColors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { hapticLight, hapticSelection } from '../../hooks/useHaptics';
import { SwipeableBottomSheet } from './SwipeableBottomSheet';

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
  const themeEntries = Object.entries(THEMES) as [AppTheme, ThemeColors][];

  return (
    <SwipeableBottomSheet visible={visible} onClose={onClose} theme={theme} maxHeight="80%">
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
          Color Palette
        </Text>
        <TouchableOpacity
          onPress={() => {
            hapticLight();
            onClose();
          }}
          style={styles.closeBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Close theme picker"
        >
          <Ionicons name="close" size={20} color={theme.textDim} />
        </TouchableOpacity>
      </View>

      <View style={styles.optionsList}>
        {themeEntries.map(([key, item]) => {
          const isSelected = currentTheme === key;
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
                onClose();
              }}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`${item.name} theme`}
            >
              <View style={styles.optionLeft}>
                <Text style={styles.optionIcon}>{item.icon}</Text>
                <View style={{ flexShrink: 1 }}>
                  <Text style={[styles.optionName, { color: theme.text }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={[styles.optionSubtitle, { color: theme.textDim }]} numberOfLines={1}>
                    {item.subtitle}
                  </Text>
                </View>
              </View>

              {isSelected ? (
                <Ionicons name="checkmark-circle" size={22} color={theme.primary} />
              ) : (
                <View style={[styles.colorPreviewDot, { backgroundColor: item.primary }]} />
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
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 6,
  },
  optionsList: {
    gap: 10,
  },
  optionCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
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
  },
  optionSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  colorPreviewDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
});
