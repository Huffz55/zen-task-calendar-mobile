import { useState } from 'react';
import { Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors, withAlpha } from '../../constants/colors';
import { hapticLight, hapticSelection, hapticSuccess } from '../../hooks/useHaptics';
import { formatClockTime, parseClockTime } from '../../services/notifications/reminderScheduler';
import { useTranslation } from '../../i18n';
import { SwipeableBottomSheet } from './SwipeableBottomSheet';

interface TimePickerPanelProps {
  value: string;
  theme: ThemeColors;
  presets?: string[];
  onChange: (nextTime: string) => void;
  onClear?: () => void;
  compact?: boolean;
}

const DEFAULT_PRESETS = ['09:00', '12:00', '15:00', '18:00'];

export function TimePickerPanel({
  value,
  theme,
  presets = DEFAULT_PRESETS,
  onChange,
  onClear,
  compact = false,
}: TimePickerPanelProps) {
  const { t } = useTranslation();
  const { hour, minute, formatted } = parseClockTime(value, '09:00');

  const adjustHour = (delta: number) => {
    hapticSelection();
    onChange(formatClockTime((hour + delta + 24) % 24, minute));
  };

  const adjustMinute = (delta: number) => {
    hapticSelection();
    onChange(formatClockTime(hour, (minute + delta + 60) % 60));
  };

  return (
    <View style={[styles.panel, compact && styles.panelCompact, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}>
      <View style={styles.stepperRow}>
        {/* Hour column */}
        <View style={styles.stepperCol}>
          <Text style={[styles.colLabel, { color: theme.textDim }]} maxFontSizeMultiplier={1.25}>
            {t('timePicker.hourLabel')}
          </Text>
          <Pressable
            onPress={() => adjustHour(1)}
            style={({ pressed }) => [
              styles.stepBtn,
              {
                backgroundColor: pressed ? theme.primaryLight : theme.surface,
                borderColor: theme.border,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={t('timePicker.a11yIncreaseHour')}
          >
            <Ionicons name="chevron-up" size={18} color={theme.text} />
          </Pressable>
          <Text style={[styles.digitText, { color: theme.text }]} maxFontSizeMultiplier={1.25}>
            {String(hour).padStart(2, '0')}
          </Text>
          <Pressable
            onPress={() => adjustHour(-1)}
            style={({ pressed }) => [
              styles.stepBtn,
              {
                backgroundColor: pressed ? theme.primaryLight : theme.surface,
                borderColor: theme.border,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={t('timePicker.a11yDecreaseHour')}
          >
            <Ionicons name="chevron-down" size={18} color={theme.text} />
          </Pressable>
        </View>

        <Text style={[styles.colon, { color: theme.textDim }]} maxFontSizeMultiplier={1.25}>
          :
        </Text>

        {/* Minute column */}
        <View style={styles.stepperCol}>
          <Text style={[styles.colLabel, { color: theme.textDim }]} maxFontSizeMultiplier={1.25}>
            {t('timePicker.minuteLabel')}
          </Text>
          <Pressable
            onPress={() => adjustMinute(5)}
            style={({ pressed }) => [
              styles.stepBtn,
              {
                backgroundColor: pressed ? theme.primaryLight : theme.surface,
                borderColor: theme.border,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={t('timePicker.a11yIncreaseMinute')}
          >
            <Ionicons name="chevron-up" size={18} color={theme.text} />
          </Pressable>
          <Text style={[styles.digitText, { color: theme.text }]} maxFontSizeMultiplier={1.25}>
            {String(minute).padStart(2, '0')}
          </Text>
          <Pressable
            onPress={() => adjustMinute(-5)}
            style={({ pressed }) => [
              styles.stepBtn,
              {
                backgroundColor: pressed ? theme.primaryLight : theme.surface,
                borderColor: theme.border,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={t('timePicker.a11yDecreaseMinute')}
          >
            <Ionicons name="chevron-down" size={18} color={theme.text} />
          </Pressable>
        </View>
      </View>

      {/* Quick Presets */}
      {presets.length > 0 && (
        <View style={styles.presetsBlock}>
          <View style={styles.presetsHeader}>
            <Text style={[styles.presetsLabel, { color: theme.textDim }]} maxFontSizeMultiplier={1.25}>
              {t('timePicker.presetsLabel')}
            </Text>
            {onClear && (
              <TouchableOpacity
                onPress={() => {
                  hapticLight();
                  onClear();
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel={t('timePicker.clear')}
              >
                <Text style={[styles.clearText, { color: theme.danger }]} maxFontSizeMultiplier={1.25}>
                  {t('timePicker.clear')}
                </Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.presetsRow}>
            {presets.map(preset => {
              const isSelected = formatted === preset;
              return (
                <Pressable
                  key={preset}
                  onPress={() => {
                    hapticSelection();
                    onChange(preset);
                  }}
                  style={({ pressed }) => [
                    styles.presetChip,
                    {
                      backgroundColor: isSelected
                        ? theme.primary
                        : pressed
                        ? theme.primaryLight
                        : theme.surface,
                      borderColor: isSelected ? theme.primary : theme.border,
                    },
                  ]}
                  hitSlop={{ top: 4, bottom: 4, left: 2, right: 2 }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                >
                  <Text
                    style={[
                      styles.presetChipText,
                      { color: isSelected ? '#ffffff' : theme.textMuted },
                    ]}
                    maxFontSizeMultiplier={1.25}
                  >
                    {preset}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}

interface TimePickerModalProps {
  visible: boolean;
  title: string;
  initialTime: string;
  presets?: string[];
  theme: ThemeColors;
  onConfirm: (nextTime: string) => void;
  onClear?: () => void;
  onClose: () => void;
}

export function TimePickerModal({
  visible,
  title,
  initialTime,
  presets,
  theme,
  onConfirm,
  onClear,
  onClose,
}: TimePickerModalProps) {
  return (
    <SwipeableBottomSheet visible={visible} onClose={onClose} theme={theme} maxHeight="72%">
      {visible && (
        <TimePickerModalBody
          key={initialTime}
          title={title}
          initialTime={initialTime}
          presets={presets}
          theme={theme}
          onConfirm={onConfirm}
          onClear={onClear}
          onClose={onClose}
        />
      )}
    </SwipeableBottomSheet>
  );
}

function TimePickerModalBody({
  title,
  initialTime,
  presets,
  theme,
  onConfirm,
  onClear,
  onClose,
}: Omit<TimePickerModalProps, 'visible'>) {
  const { t } = useTranslation();
  const [draftTime, setDraftTime] = useState(() => parseClockTime(initialTime, '09:00').formatted);

  return (
    <>
      <View style={styles.modalHeader}>
        <Text style={[styles.modalTitle, { color: theme.text }]} numberOfLines={1} maxFontSizeMultiplier={1.35}>
          {title}
        </Text>
        <TouchableOpacity
          onPress={() => {
            hapticLight();
            onClose();
          }}
          style={[styles.closeBtn, { backgroundColor: theme.surfaceMuted }]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel={t('timePicker.a11yClose')}
        >
          <Ionicons name="close" size={18} color={theme.textDim} />
        </TouchableOpacity>
      </View>

      <TimePickerPanel
        value={draftTime}
        theme={theme}
        presets={presets}
        onChange={setDraftTime}
        onClear={
          onClear
            ? () => {
                onClear();
                onClose();
              }
            : undefined
        }
      />

      <View style={styles.modalActions}>
        <TouchableOpacity
          style={[styles.cancelBtn, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}
          onPress={() => {
            hapticLight();
            onClose();
          }}
          activeOpacity={0.75}
          accessibilityRole="button"
        >
          <Text style={[styles.cancelBtnText, { color: theme.textMuted }]} maxFontSizeMultiplier={1.3}>
            {t('common.cancel')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.confirmBtn,
            {
              backgroundColor: theme.primary,
              borderColor: withAlpha('#ffffff', 0.16),
            },
          ]}
          onPress={() => {
            hapticSuccess();
            onConfirm(draftTime);
            onClose();
          }}
          activeOpacity={0.85}
          accessibilityRole="button"
        >
          <Text style={styles.confirmBtnText} maxFontSizeMultiplier={1.3}>
            {t('timePicker.save')}
          </Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
    flex: 1,
    marginRight: 8,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  panel: {
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  panelCompact: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  stepperCol: {
    alignItems: 'center',
    gap: 6,
  },
  colLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  stepBtn: {
    width: 56,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  digitText: {
    fontSize: 30,
    fontWeight: '600',
    letterSpacing: 0.5,
    fontVariant: ['tabular-nums'],
    paddingVertical: 2,
  },
  colon: {
    fontSize: 28,
    fontWeight: '400',
    marginTop: 14,
  },
  presetsBlock: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(128,128,128,0.18)',
  },
  presetsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  presetsLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  clearText: {
    fontSize: 12,
    fontWeight: '600',
  },
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetChip: {
    minHeight: 38,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetChipText: {
    fontSize: 12,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  cancelBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  confirmBtn: {
    flex: 1.4,
    minHeight: 48,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
