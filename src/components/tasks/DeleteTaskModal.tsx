import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TouchableWithoutFeedback, Animated } from 'react-native';
import { DailyTask } from '../../types';
import { ThemeColors, withAlpha } from '../../constants/colors';
import { hapticLight, hapticWarning } from '../../hooks/useHaptics';
import { useTranslation } from '../../i18n';

interface DeleteTaskModalProps {
  visible: boolean;
  task: DailyTask | null;
  selectedDateStr: string;
  theme: ThemeColors;
  onClose: () => void;
  onDeleteSingle: (taskId: string) => void;
  onDeleteInstance: (taskId: string, dateStr: string) => void;
  onDeleteFuture: (taskId: string, dateStr: string) => void;
}

export function DeleteTaskModal({
  visible,
  task,
  selectedDateStr,
  theme,
  onClose,
  onDeleteSingle,
  onDeleteInstance,
  onDeleteFuture,
}: DeleteTaskModalProps) {
  const { t } = useTranslation();
  const [scaleAnim] = useState(() => new Animated.Value(0.94));

  useEffect(() => {
    if (visible) {
      scaleAnim.setValue(0.94);
      Animated.spring(scaleAnim, {
        toValue: 1,
        damping: 18,
        stiffness: 240,
        mass: 0.7,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, scaleAnim]);

  if (!task) return null;

  const isRecurring = task.recurrence !== 'none';
  const dangerBg = withAlpha(theme.danger, theme.isDark ? 0.18 : 0.1);

  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      navigationBarTranslucent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.dialog,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                  transform: [{ scale: scaleAnim }],
                },
              ]}
            >
              <Text style={[styles.title, { color: theme.text }]}>
                {isRecurring ? t('tasks.deleteRecurringTitle') : t('tasks.deleteTitle')}
              </Text>
              <Text
                style={[styles.subtitle, { color: theme.textDim }]}
                numberOfLines={2}
                ellipsizeMode="tail"
              >
                {t('tasks.deletePrompt', { title: task.title })}
              </Text>

              <View style={styles.optionsCol}>
                {isRecurring ? (
                  <>
                    <TouchableOpacity
                      style={[styles.btn, { backgroundColor: theme.surfaceMuted }]}
                      onPress={() => {
                        hapticWarning();
                        onDeleteInstance(task.taskId, selectedDateStr);
                        onClose();
                      }}
                    >
                      <Text style={[styles.btnText, { color: theme.text }]}>{t('tasks.deleteInstance')}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.btn, { backgroundColor: theme.surfaceMuted }]}
                      onPress={() => {
                        hapticWarning();
                        onDeleteFuture(task.taskId, selectedDateStr);
                        onClose();
                      }}
                    >
                      <Text style={[styles.btnText, { color: theme.text }]}>{t('tasks.deleteFuture')}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.btn, { backgroundColor: dangerBg }]}
                      onPress={() => {
                        hapticWarning();
                        onDeleteSingle(task.taskId);
                        onClose();
                      }}
                    >
                      <Text style={[styles.btnText, { color: theme.danger }]}>{t('tasks.deleteSeries')}</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <TouchableOpacity
                    style={[styles.btn, { backgroundColor: dangerBg }]}
                    onPress={() => {
                      hapticWarning();
                      onDeleteSingle(task.taskId);
                      onClose();
                    }}
                  >
                    <Text style={[styles.btnText, { color: theme.danger }]}>{t('tasks.deleteSingleButton')}</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[styles.cancelBtn, { borderColor: theme.border }]}
                  onPress={() => {
                    hapticLight();
                    onClose();
                  }}
                >
                  <Text style={[styles.cancelText, { color: theme.textDim }]}>{t('common.cancel')}</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  dialog: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    marginBottom: 20,
    lineHeight: 18,
  },
  optionsCol: {
    gap: 10,
  },
  btn: {
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  btnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  cancelBtn: {
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: 4,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
