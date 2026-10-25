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
import { DailyTask, TaskTag, Subtask } from '../../types';
import { ThemeColors } from '../../constants/colors';
import { TAGS } from '../../constants/tags';
import { Ionicons } from '@expo/vector-icons';
import { hapticLight, hapticSuccess } from '../../hooks/useHaptics';

interface EditTaskModalProps {
  visible: boolean;
  task: DailyTask | null;
  theme: ThemeColors;
  onClose: () => void;
  onSave: (
    taskId: string,
    newTitle: string,
    newTag?: TaskTag,
    subtasks?: Subtask[],
    estimatedMinutes?: number,
    isPinned?: boolean
  ) => void;
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
  const [estimatedMinutes, setEstimatedMinutes] = useState<number | undefined>(task?.estimatedMinutes);
  const [isPinned, setIsPinned] = useState(task?.isPinned || false);
  const [subtasks, setSubtasks] = useState<Subtask[]>(task?.subtasks || []);
  const [newSubtaskInput, setNewSubtaskInput] = useState('');
  const [prevTask, setPrevTask] = useState(task);

  if (task !== prevTask) {
    setPrevTask(task);
    setTitle(task ? task.title : '');
    setTag(task ? task.tag : undefined);
    setEstimatedMinutes(task?.estimatedMinutes);
    setIsPinned(task?.isPinned || false);
    setSubtasks(task?.subtasks ? [...task.subtasks] : []);
  }

  const handleAddSubtask = () => {
    const trimmed = newSubtaskInput.trim();
    if (!trimmed) return;
    hapticLight();
    setSubtasks(prev => [
      ...prev,
      { id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`, title: trimmed, isCompleted: false },
    ]);
    setNewSubtaskInput('');
  };

  const handleRemoveSubtask = (id: string) => {
    hapticLight();
    setSubtasks(prev => prev.filter(s => s.id !== id));
  };

  const handleSave = () => {
    if (!task || !title.trim()) return;
    hapticSuccess();
    onSave(task.taskId, title.trim(), tag, subtasks, estimatedMinutes, isPinned);
    onClose();
  };

  const tagKeys = Object.keys(TAGS) as TaskTag[];

  const durationOptions: { label: string; value: number | undefined }[] = [
    { label: 'None', value: undefined },
    { label: '15m', value: 15 },
    { label: '30m', value: 30 },
    { label: '45m', value: 45 },
    { label: '1h', value: 60 },
    { label: '2h', value: 120 },
  ];

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

            {/* Estimated Duration */}
            <Text style={[styles.sectionLabel, { color: theme.textDim, marginTop: 16 }]}>ESTIMATED TIME</Text>
            <View style={styles.chipsRow}>
              {durationOptions.map(opt => {
                const isSelected = estimatedMinutes === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.label}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: isSelected ? theme.primary : theme.surfaceMuted,
                        borderColor: isSelected ? theme.primary : theme.border,
                      },
                    ]}
                    onPress={() => {
                      hapticLight();
                      setEstimatedMinutes(opt.value);
                    }}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: isSelected ? '#ffffff' : theme.textMuted },
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Pin as Focus of the Day Toggle */}
            <TouchableOpacity
              style={[
                styles.pinToggleCard,
                {
                  backgroundColor: isPinned ? (theme.isDark ? '#78350f33' : '#fef3c7') : theme.surfaceMuted,
                  borderColor: isPinned ? '#f59e0b' : theme.border,
                },
              ]}
              onPress={() => {
                hapticLight();
                setIsPinned(!isPinned);
              }}
              activeOpacity={0.8}
            >
              <Ionicons
                name={isPinned ? 'star' : 'star-outline'}
                size={22}
                color={isPinned ? '#f59e0b' : theme.textDim}
              />
              <View style={styles.pinToggleContent}>
                <Text style={[styles.pinToggleTitle, { color: isPinned ? '#b45309' : theme.text }]}>
                  Focus of the Day (One Big Thing)
                </Text>
                <Text style={[styles.pinToggleDesc, { color: theme.textDim }]}>
                  Pin to top with gold badge as your highest priority goal.
                </Text>
              </View>
            </TouchableOpacity>

            {/* Subtasks Builder */}
            <Text style={[styles.sectionLabel, { color: theme.textDim, marginTop: 16 }]}>
              SUBTASKS ({subtasks.length})
            </Text>
            <View style={styles.subtaskInputRow}>
              <TextInput
                style={[
                  styles.subtaskTextInput,
                  {
                    backgroundColor: theme.surfaceMuted,
                    borderColor: theme.border,
                    color: theme.text,
                  },
                ]}
                placeholder="Add checklist step..."
                placeholderTextColor={theme.textDim}
                value={newSubtaskInput}
                onChangeText={setNewSubtaskInput}
                onSubmitEditing={handleAddSubtask}
                returnKeyType="done"
              />
              <TouchableOpacity
                style={[styles.addSubtaskBtn, { backgroundColor: theme.primary }]}
                onPress={handleAddSubtask}
              >
                <Ionicons name="add" size={20} color="#ffffff" />
              </TouchableOpacity>
            </View>

            {subtasks.length > 0 && (
              <View style={styles.subtaskChipsList}>
                {subtasks.map(s => (
                  <View
                    key={s.id}
                    style={[
                      styles.subtaskChip,
                      { backgroundColor: theme.surfaceMuted, borderColor: theme.border },
                    ]}
                  >
                    <Text style={[styles.subtaskChipText, { color: theme.text }]} numberOfLines={1}>
                      • {s.title}
                    </Text>
                    <TouchableOpacity onPress={() => handleRemoveSubtask(s.id)}>
                      <Ionicons name="close-circle" size={16} color={theme.textDim} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
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
  pinToggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 16,
  },
  pinToggleContent: {
    flex: 1,
  },
  pinToggleTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  pinToggleDesc: {
    fontSize: 11,
    lineHeight: 15,
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
  subtaskInputRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  subtaskTextInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 13,
  },
  addSubtaskBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtaskChipsList: {
    gap: 6,
    marginBottom: 10,
  },
  subtaskChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  subtaskChipText: {
    fontSize: 12,
    flex: 1,
  },
});
