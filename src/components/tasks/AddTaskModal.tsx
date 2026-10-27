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
import { RecurrenceType, TaskTag, Subtask } from '../../types';
import { ThemeColors } from '../../constants/colors';
import { TAGS } from '../../constants/tags';
import { Ionicons } from '@expo/vector-icons';
import { hapticLight, hapticSuccess } from '../../hooks/useHaptics';
import { playWaterDrop, playBambooTap } from '../../services/audio/audioService';
import { animateLayout, springLayout } from '../../utils/animations';

interface AddTaskModalProps {
  visible: boolean;
  selectedDateStr: string;
  theme: ThemeColors;
  onClose: () => void;
  onAddTask: (
    title: string,
    dateStr: string,
    recurrence: RecurrenceType,
    tag?: TaskTag,
    subtasks?: Subtask[],
    estimatedMinutes?: number,
    isPinned?: boolean
  ) => void;
}

export function AddTaskModal({
  visible,
  selectedDateStr,
  theme,
  onClose,
  onAddTask,
}: AddTaskModalProps) {
  const [title, setTitle] = useState('');
  const [tag, setTag] = useState<TaskTag | undefined>(undefined);
  const [recurrence, setRecurrence] = useState<RecurrenceType>('none');
  const [estimatedMinutes, setEstimatedMinutes] = useState<number | undefined>(undefined);
  const [isPinned, setIsPinned] = useState(false);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtaskInput, setNewSubtaskInput] = useState('');
  const [activeSection, setActiveSection] = useState<'tag' | 'time' | 'subtasks' | 'repeat' | null>(null);

  const handleAddSubtask = () => {
    const trimmed = newSubtaskInput.trim();
    if (!trimmed) return;
    playBambooTap();
    hapticLight();
    springLayout();
    setSubtasks(prev => [
      ...prev,
      { id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`, title: trimmed, isCompleted: false },
    ]);
    setNewSubtaskInput('');
  };

  const handleRemoveSubtask = (id: string) => {
    hapticLight();
    springLayout();
    setSubtasks(prev => prev.filter(s => s.id !== id));
  };

  const handleSave = () => {
    if (!title.trim()) return;
    playWaterDrop();
    hapticSuccess();
    onAddTask(title.trim(), selectedDateStr, recurrence, tag, subtasks, estimatedMinutes, isPinned);
    setTitle('');
    setTag(undefined);
    setRecurrence('none');
    setEstimatedMinutes(undefined);
    setIsPinned(false);
    setSubtasks([]);
    setNewSubtaskInput('');
    setActiveSection(null);
    onClose();
  };

  const handleClose = () => {
    setActiveSection(null);
    onClose();
  };

  const tagKeys = Object.keys(TAGS) as TaskTag[];
  const recurrenceOptions: { id: RecurrenceType; label: string }[] = [
    { id: 'none', label: 'Once' },
    { id: 'daily', label: 'Daily' },
    { id: 'weekly', label: 'Weekly' },
    { id: 'biweekly', label: 'Every 2 weeks' },
  ];

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
              <Text style={[styles.sheetTitle, { color: theme.text }]}>Add New Task</Text>
              <Text style={[styles.dateSubtitle, { color: theme.textDim }]}>{selectedDateStr}</Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
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
            placeholder="What would you like to do?"
            placeholderTextColor={theme.textDim}
            value={title}
            onChangeText={setTitle}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleSave}
          />

          {/* Quick Option Pills Bar */}
          <View style={styles.optionPillsBar}>
            <TouchableOpacity
              style={[
                styles.optionPill,
                {
                  backgroundColor: activeSection === 'tag' || tag ? theme.primaryLight : theme.surfaceMuted,
                  borderColor: activeSection === 'tag' || tag ? theme.primary : theme.border,
                },
              ]}
              onPress={() => {
                hapticLight();
                animateLayout();
                setActiveSection(prev => prev === 'tag' ? null : 'tag');
              }}
            >
              <Ionicons
                name="pricetag-outline"
                size={13}
                color={activeSection === 'tag' || tag ? theme.primary : theme.textDim}
              />
              <Text
                style={[
                  styles.optionPillText,
                  { color: activeSection === 'tag' || tag ? theme.primary : theme.textDim },
                ]}
              >
                {tag ? TAGS[tag].label : 'Tag'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.optionPill,
                {
                  backgroundColor: activeSection === 'time' || estimatedMinutes ? theme.primaryLight : theme.surfaceMuted,
                  borderColor: activeSection === 'time' || estimatedMinutes ? theme.primary : theme.border,
                },
              ]}
              onPress={() => {
                hapticLight();
                animateLayout();
                setActiveSection(prev => prev === 'time' ? null : 'time');
              }}
            >
              <Ionicons
                name="timer-outline"
                size={13}
                color={activeSection === 'time' || estimatedMinutes ? theme.primary : theme.textDim}
              />
              <Text
                style={[
                  styles.optionPillText,
                  { color: activeSection === 'time' || estimatedMinutes ? theme.primary : theme.textDim },
                ]}
              >
                {estimatedMinutes ? `${estimatedMinutes}m` : 'Time'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.optionPill,
                {
                  backgroundColor: isPinned ? (theme.isDark ? '#78350f44' : '#fef3c7') : theme.surfaceMuted,
                  borderColor: isPinned ? '#f59e0b' : theme.border,
                },
              ]}
              onPress={() => {
                hapticLight();
                setIsPinned(!isPinned);
              }}
            >
              <Ionicons
                name={isPinned ? 'star' : 'star-outline'}
                size={13}
                color={isPinned ? '#f59e0b' : theme.textDim}
              />
              <Text style={[styles.optionPillText, { color: isPinned ? '#b45309' : theme.textDim }]}>
                Priority
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.optionPill,
                {
                  backgroundColor: activeSection === 'repeat' || recurrence !== 'none' ? theme.primaryLight : theme.surfaceMuted,
                  borderColor: activeSection === 'repeat' || recurrence !== 'none' ? theme.primary : theme.border,
                },
              ]}
              onPress={() => {
                hapticLight();
                animateLayout();
                setActiveSection(prev => prev === 'repeat' ? null : 'repeat');
              }}
            >
              <Ionicons
                name="repeat-outline"
                size={13}
                color={activeSection === 'repeat' || recurrence !== 'none' ? theme.primary : theme.textDim}
              />
              <Text
                style={[
                  styles.optionPillText,
                  { color: activeSection === 'repeat' || recurrence !== 'none' ? theme.primary : theme.textDim },
                ]}
              >
                {recurrence !== 'none' ? recurrence : 'Repeat'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.optionPill,
                {
                  backgroundColor: activeSection === 'subtasks' || subtasks.length > 0 ? theme.primaryLight : theme.surfaceMuted,
                  borderColor: activeSection === 'subtasks' || subtasks.length > 0 ? theme.primary : theme.border,
                },
              ]}
              onPress={() => {
                hapticLight();
                animateLayout();
                setActiveSection(prev => prev === 'subtasks' ? null : 'subtasks');
              }}
            >
              <Ionicons
                name="list-outline"
                size={13}
                color={activeSection === 'subtasks' || subtasks.length > 0 ? theme.primary : theme.textDim}
              />
              <Text
                style={[
                  styles.optionPillText,
                  { color: activeSection === 'subtasks' || subtasks.length > 0 ? theme.primary : theme.textDim },
                ]}
              >
                Steps{subtasks.length > 0 ? ` (${subtasks.length})` : ''}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Expandable Section Content (only when a pill is selected) */}
          {activeSection !== null && (
            <ScrollView showsVerticalScrollIndicator={false} style={styles.expandedSectionScroll}>
              {activeSection === 'tag' && (
                <View style={styles.sectionBlock}>
                  <Text style={[styles.sectionLabel, { color: theme.textDim }]}>CHOOSE TAG</Text>
                  <View style={styles.chipsRow}>
                    {tagKeys.map(tKey => {
                      const conf = TAGS[tKey];
                      const isSelected = tag === tKey;
                      return (
                        <TouchableOpacity
                          key={tKey}
                          style={[
                            styles.chip,
                            {
                              backgroundColor: isSelected
                                ? conf.color
                                : theme.isDark
                                ? conf.bgDark
                                : conf.bgLight,
                              borderColor: isSelected ? conf.color : 'transparent',
                            },
                          ]}
                          onPress={() => {
                            hapticLight();
                            setTag(isSelected ? undefined : tKey);
                          }}
                        >
                          <Text
                            style={[
                              styles.chipText,
                              { color: isSelected ? '#ffffff' : conf.color },
                            ]}
                          >
                            {conf.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {activeSection === 'repeat' && (
                <View style={styles.sectionBlock}>
                  <Text style={[styles.sectionLabel, { color: theme.textDim }]}>RECURRENCE</Text>
                  <View style={styles.chipsRow}>
                    {recurrenceOptions.map(opt => {
                      const isSelected = recurrence === opt.id;
                      return (
                        <TouchableOpacity
                          key={opt.id}
                          style={[
                            styles.chip,
                            {
                              backgroundColor: isSelected ? theme.primary : theme.surfaceMuted,
                              borderColor: isSelected ? theme.primary : theme.border,
                            },
                          ]}
                          onPress={() => {
                            hapticLight();
                            setRecurrence(opt.id);
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
                </View>
              )}

              {activeSection === 'time' && (
                <View style={styles.sectionBlock}>
                  <Text style={[styles.sectionLabel, { color: theme.textDim }]}>ESTIMATED TIME</Text>
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
                </View>
              )}

              {activeSection === 'subtasks' && (
                <View style={styles.sectionBlock}>
                  <Text style={[styles.sectionLabel, { color: theme.textDim }]}>
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
                </View>
              )}
            </ScrollView>
          )}

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
              Add Task 🌸
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
  optionPillsBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
    marginBottom: 6,
  },
  optionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  optionPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  expandedSectionScroll: {
    maxHeight: 180,
    marginTop: 6,
    marginBottom: 6,
  },
  sectionBlock: {
    paddingVertical: 4,
  },
});
