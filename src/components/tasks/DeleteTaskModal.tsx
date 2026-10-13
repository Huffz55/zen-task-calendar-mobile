import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TouchableWithoutFeedback } from 'react-native';
import { DailyTask } from '../../types';
import { ThemeColors } from '../../constants/colors';
import { hapticLight, hapticWarning } from '../../hooks/useHaptics';

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
  if (!task) return null;

  const isRecurring = task.recurrence !== 'none';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.dialog, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.title, { color: theme.text }]}>
                {isRecurring ? 'Delete Recurring Task' : 'Delete Task'}
              </Text>
              <Text style={[styles.subtitle, { color: theme.textDim }]}>
                {`Choose a delete option for "${task.title}":`}
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
                      <Text style={[styles.btnText, { color: theme.text }]}>Delete this date only</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.btn, { backgroundColor: theme.surfaceMuted }]}
                      onPress={() => {
                        hapticWarning();
                        onDeleteFuture(task.taskId, selectedDateStr);
                        onClose();
                      }}
                    >
                      <Text style={[styles.btnText, { color: theme.text }]}>Delete this and future dates</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.btn, { backgroundColor: theme.primaryLight }]}
                      onPress={() => {
                        hapticWarning();
                        onDeleteSingle(task.taskId);
                        onClose();
                      }}
                    >
                      <Text style={[styles.btnText, { color: theme.primary }]}>Delete entire series</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <TouchableOpacity
                    style={[styles.btn, { backgroundColor: theme.primaryLight }]}
                    onPress={() => {
                      hapticWarning();
                      onDeleteSingle(task.taskId);
                      onClose();
                    }}
                  >
                    <Text style={[styles.btnText, { color: theme.danger || theme.primary }]}>Delete Task</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[styles.cancelBtn, { borderColor: theme.border }]}
                  onPress={() => {
                    hapticLight();
                    onClose();
                  }}
                >
                  <Text style={[styles.cancelText, { color: theme.textDim }]}>Cancel</Text>
                </TouchableOpacity>
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
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 10,
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
    alignItems: 'center',
    marginTop: 4,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
