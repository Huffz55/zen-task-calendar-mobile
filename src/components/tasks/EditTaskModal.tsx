import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { DailyTask, TaskTag } from '../../types';
import { ThemeColors } from '../../constants/colors';
import { TAGS } from '../../constants/tags';
import { Ionicons } from '@expo/vector-icons';
import { hapticLight, hapticSuccess } from '../../hooks/useHaptics';

interface EditTaskModalProps {
  visible: boolean;
  task: DailyTask | null;
  theme: ThemeColors;
  onClose: () => void;
  onSave: (taskId: string, newTitle: string, newTag?: TaskTag) => void;
}

export function EditTaskModal({
  visible,
  task,
  theme,
  onClose,
  onSave,
}: EditTaskModalProps) {
  const [title, setTitle] = useState(task?.title || '');
  const [tag, setTag] = useState<TaskTag | undefined>(task?.tag);
  const [prevTask, setPrevTask] = useState(task);

  if (task !== prevTask) {
    setPrevTask(task);
    setTitle(task ? task.title : '');
    setTag(task ? task.tag : undefined);
  }

  const handleSave = () => {
    if (!task || !title.trim()) return;
    hapticSuccess();
    onSave(task.taskId, title.trim(), tag);
    onClose();
  };

  const tagKeys = Object.keys(TAGS) as TaskTag[];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={[styles.sheet, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={[styles.sheetTitle, { color: theme.text }]}>Edit Task</Text>
              <Text style={[styles.dateSubtitle, { color: theme.textDim }]}>
                {task?.recurrence && task.recurrence !== 'none'
                  ? `Recurring Task (${task.recurrence})`
                  : 'Single Task'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={theme.textDim} />
            </TouchableOpacity>
          </View>

          {/* Input */}
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.surfaceMuted,
                color: theme.text,
                borderColor: theme.border,
              },
            ]}
            placeholder="Task title..."
            placeholderTextColor={theme.textDim}
            value={title}
            onChangeText={setTitle}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleSave}
          />

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Tag Selector */}
            <Text style={[styles.sectionLabel, { color: theme.textDim }]}>TAG</Text>
            <View style={styles.chipsRow}>
              {/* None Tag Option */}
              <TouchableOpacity
                style={[
                  styles.chip,
                  {
                    backgroundColor: tag === undefined ? theme.primary : theme.surfaceMuted,
                    borderColor: tag === undefined ? theme.primary : theme.border,
                  },
                ]}
                onPress={() => {
                  hapticLight();
                  setTag(undefined);
                }}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: tag === undefined ? '#ffffff' : theme.textMuted },
                  ]}
                >
                  No Tag
                </Text>
              </TouchableOpacity>

              {tagKeys.map(tKey => {
                const conf = TAGS[tKey];
                const isSelected = tag === tKey;
                return (
                  <TouchableOpacity
                    key={tKey}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: isSelected ? conf.color : theme.surfaceMuted,
                        borderColor: isSelected ? conf.color : theme.border,
                      },
                    ]}
                    onPress={() => {
                      hapticLight();
                      setTag(isSelected ? undefined : tKey);
                    }}
                  >
                    <Ionicons
                      name={conf.icon as any}
                      size={13}
                      color={isSelected ? '#ffffff' : conf.color}
                      style={{ marginRight: 4 }}
                    />
                    <Text
                      style={[
                        styles.chipText,
                        { color: isSelected ? '#ffffff' : theme.textMuted },
                      ]}
                    >
                      {conf.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitBtn,
              {
                backgroundColor: title.trim() ? theme.primary : theme.surfaceMuted,
                opacity: title.trim() ? 1 : 0.6,
              },
            ]}
            onPress={handleSave}
            disabled={!title.trim()}
          >
            <Text
              style={[
                styles.submitText,
                { color: title.trim() ? '#ffffff' : theme.textDim },
              ]}
            >
              Save Changes 🌸
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    borderWidth: 1,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  dateSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  input: {
    fontSize: 16,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  submitBtn: {
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 18,
    alignItems: 'center',
  },
  submitText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
