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
import { RecurrenceType, TaskTag } from '../../types';
import { ThemeColors } from '../../constants/colors';
import { TAGS } from '../../constants/tags';
import { Ionicons } from '@expo/vector-icons';
import { hapticLight, hapticSuccess } from '../../hooks/useHaptics';

interface AddTaskModalProps {
  visible: boolean;
  selectedDateStr: string;
  theme: ThemeColors;
  onClose: () => void;
  onAddTask: (title: string, dateStr: string, recurrence: RecurrenceType, tag?: TaskTag) => void;
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

  const handleSave = () => {
    if (!title.trim()) return;
    hapticSuccess();
    onAddTask(title.trim(), selectedDateStr, recurrence, tag);
    setTitle('');
    setTag(undefined);
    setRecurrence('none');
    onClose();
  };

  const tagKeys = Object.keys(TAGS) as TaskTag[];
  const recurrenceOptions: { id: RecurrenceType; label: string }[] = [
    { id: 'none', label: 'Once' },
    { id: 'daily', label: 'Daily' },
    { id: 'weekly', label: 'Weekly' },
    { id: 'biweekly', label: 'Every 2 weeks' },
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
            placeholder="What would you like to do?"
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

            {/* Recurrence Selector */}
            <Text style={[styles.sectionLabel, { color: theme.textDim, marginTop: 16 }]}>RECURRENCE</Text>
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
