import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TouchableWithoutFeedback } from 'react-native';
import { AppTheme } from '../../types';
import { THEMES, ThemeColors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { hapticSelection } from '../../hooks/useHaptics';

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
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.sheet, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={styles.header}>
                <Text style={[styles.title, { color: theme.text }]}>Color Palette</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
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
                      activeOpacity={0.7}
                    >
                      <View style={styles.optionLeft}>
                        <Text style={styles.optionIcon}>{item.icon}</Text>
                        <View>
                          <Text style={[styles.optionName, { color: theme.text }]}>{item.name}</Text>
                          <Text style={[styles.optionSubtitle, { color: theme.textDim }]}>{item.subtitle}</Text>
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
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
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
    paddingBottom: 40,
    borderWidth: 1,
  },
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
    marginTop: 2,
  },
  colorPreviewDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
});
