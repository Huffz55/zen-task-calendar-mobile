import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { BuiltinTaskTag, DailyTask, RecurrenceType, TaskTag, Subtask } from '../../types';
import { ThemeColors, withAlpha } from '../../constants/colors';
import { TAGS, CUSTOM_TAG_COLORS, resolveTagConfig } from '../../constants/tags';
import { Ionicons } from '@expo/vector-icons';
import { hapticLight, hapticSelection, hapticSuccess } from '../../hooks/useHaptics';
import { animateLayout, springLayout } from '../../utils/animations';
import { BottomSheetScrollView, SwipeableBottomSheet } from '../common/SwipeableBottomSheet';
import { TimePickerPanel } from '../common/TimePickerModal';
import { useApp } from '../../context/AppContext';
import { formatMinutesCompact, useTranslation } from '../../i18n';

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
    isPinned?: boolean,
    notes?: string,
    reminderTime?: string | null,
    recurrence?: RecurrenceType
  ) => void;
}

export function EditTaskModal({
  visible,
  task,
  theme,
  onClose,
  onSave,
}: EditTaskModalProps) {
  return (
    <SwipeableBottomSheet visible={visible} onClose={onClose} theme={theme} maxHeight="88%" useKeyboardAvoiding>
      {visible && task && (
        <EditTaskForm key={task.taskId} task={task} theme={theme} onClose={onClose} onSave={onSave} />
      )}
    </SwipeableBottomSheet>
  );
}

function EditTaskForm({
  task,
  theme,
  onClose,
  onSave,
}: {
  task: DailyTask;
  theme: ThemeColors;
  onClose: () => void;
  onSave: EditTaskModalProps['onSave'];
}) {
  const { customTags, addCustomTag } = useApp();
  const { t, language } = useTranslation();
  const [title, setTitle] = useState(task.title);
  const [notes, setNotes] = useState(task.notes ?? '');
  const [tag, setTag] = useState<TaskTag | undefined>(task.tag);
  const [isCreatingTag, setIsCreatingTag] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(CUSTOM_TAG_COLORS[0].color);
  const [recurrence, setRecurrence] = useState<RecurrenceType>(task.recurrence);
  const [estimatedMinutes, setEstimatedMinutes] = useState<number | undefined>(task.estimatedMinutes);
  const [reminderTime, setReminderTime] = useState<string | undefined>(task.reminderTime);
  const [isReminderExpanded, setIsReminderExpanded] = useState(false);
  const [isPinned, setIsPinned] = useState(task.isPinned || false);
  const [subtasks, setSubtasks] = useState<Subtask[]>(() => (task.subtasks ? [...task.subtasks] : []));
  const [newSubtaskInput, setNewSubtaskInput] = useState('');

  const handleAddSubtask = () => {
    const trimmed = newSubtaskInput.trim();
    if (!trimmed) return;
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
    if (!task || !title.trim()) return;
    hapticSuccess();
    onSave(
      task.taskId,
      title.trim(),
      tag,
      subtasks,
      estimatedMinutes,
      isPinned,
      notes.trim(),
      reminderTime ?? null,
      recurrence
    );
    onClose();
  };

  const handleCreateCustomTag = () => {
    const createdId = addCustomTag(newTagName, newTagColor);
    if (createdId) {
      hapticSuccess();
      setTag(createdId);
      setNewTagName('');
      setIsCreatingTag(false);
    }
  };

  const tagKeys: TaskTag[] = [
    ...(Object.keys(TAGS) as BuiltinTaskTag[]),
    ...customTags.map(t => t.id),
  ];

  const recurrenceOptions: { id: RecurrenceType; label: string }[] = [
    { id: 'none', label: t('tasks.recurrence.none') },
    { id: 'daily', label: t('tasks.recurrence.daily') },
    { id: 'weekdays', label: t('tasks.recurrence.weekdays') },
    { id: 'weekly', label: t('tasks.recurrence.weekly') },
    { id: 'biweekly', label: t('tasks.recurrence.biweekly') },
    { id: 'monthly', label: t('tasks.recurrence.monthly') },
  ];

  const durationOptions: { label: string; value: number | undefined }[] = [
    { label: t('common.none'), value: undefined },
    { label: formatMinutesCompact(15, language), value: 15 },
    { label: formatMinutesCompact(30, language), value: 30 },
    { label: formatMinutesCompact(45, language), value: 45 },
    { label: formatMinutesCompact(60, language), value: 60 },
    { label: formatMinutesCompact(120, language), value: 120 },
  ];

  return (
    <>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text style={[styles.sheetTitle, { color: theme.text }]} numberOfLines={1}>
            {t('tasks.editTitle')}
          </Text>
          <Text style={[styles.dateSubtitle, { color: theme.textDim }]} numberOfLines={1}>
            {recurrence !== 'none'
              ? t('tasks.recurringLabel', { recurrence: t(`tasks.recurrence.${recurrence}`) })
              : t('tasks.singleTaskLabel')}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => {
            hapticLight();
            onClose();
          }}
          style={styles.closeBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel={t('tasks.a11yCloseEdit')}
        >
          <Ionicons name="close" size={20} color={theme.textDim} />
        </TouchableOpacity>
      </View>

      <BottomSheetScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
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
          placeholder={t('tasks.editTitlePlaceholder')}
          placeholderTextColor={theme.textDim}
          value={title}
          onChangeText={setTitle}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={handleSave}
        />

        {/* Multi-line Notes */}
        <Text style={[styles.sectionLabel, { color: theme.textDim }]}>{t('tasks.notesLabel')}</Text>
        <TextInput
          style={[
            styles.notesInput,
            {
              backgroundColor: theme.surfaceMuted,
              color: theme.text,
              borderColor: theme.border,
            },
          ]}
          placeholder={t('tasks.notesPlaceholder')}
          placeholderTextColor={theme.textDim}
          value={notes}
          onChangeText={setNotes}
          multiline
          maxLength={2000}
          textAlignVertical="top"
        />

        {/* Tag Selector */}
        <Text style={[styles.sectionLabel, { color: theme.textDim }]}>{t('tasks.sectionTag')}</Text>
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
              hapticSelection();
              setTag(undefined);
            }}
          >
            <Text
              style={[
                styles.chipText,
                { color: tag === undefined ? '#ffffff' : theme.textMuted },
              ]}
            >
              {t('tasks.noTag')}
            </Text>
          </TouchableOpacity>

          {tagKeys.map(tKey => {
            const conf = resolveTagConfig(tKey, customTags, language);
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
                  hapticSelection();
                  setTag(isSelected ? undefined : tKey);
                }}
              >
                <Ionicons
                  name={conf.icon}
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

          <TouchableOpacity
            style={[
              styles.chip,
              {
                backgroundColor: isCreatingTag ? theme.primaryLight : theme.surfaceMuted,
                borderColor: isCreatingTag ? theme.primary : theme.border,
              },
            ]}
            onPress={() => {
              hapticLight();
              animateLayout();
              setIsCreatingTag(prev => !prev);
            }}
          >
            <Text style={[styles.chipText, { color: theme.primary }]}>{t('tasks.addCustomTag')}</Text>
          </TouchableOpacity>
        </View>

        {isCreatingTag && (
          <View style={styles.customTagBuilder}>
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
                placeholder={t('tasks.tagNamePlaceholder')}
                placeholderTextColor={theme.textDim}
                value={newTagName}
                onChangeText={setNewTagName}
                maxLength={24}
                returnKeyType="done"
                onSubmitEditing={handleCreateCustomTag}
              />
              <TouchableOpacity
                style={[
                  styles.addSubtaskBtn,
                  { backgroundColor: newTagName.trim() ? newTagColor : theme.surfaceMuted },
                ]}
                onPress={handleCreateCustomTag}
                disabled={!newTagName.trim()}
              >
                <Ionicons name="checkmark" size={18} color={newTagName.trim() ? '#ffffff' : theme.textDim} />
              </TouchableOpacity>
            </View>
            <View style={styles.colorDotsRow}>
              {CUSTOM_TAG_COLORS.map(c => (
                <TouchableOpacity
                  key={c.color}
                  style={[
                    styles.colorDot,
                    { backgroundColor: c.color },
                    newTagColor === c.color && { borderWidth: 2.5, borderColor: theme.text },
                  ]}
                  onPress={() => {
                    hapticSelection();
                    setNewTagColor(c.color);
                  }}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                />
              ))}
            </View>
          </View>
        )}

        {/* Recurrence */}
        <Text style={[styles.sectionLabel, { color: theme.textDim, marginTop: 16 }]}>{t('tasks.sectionRecurrence')}</Text>
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
                  hapticSelection();
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

        {/* Estimated Duration */}
        <Text style={[styles.sectionLabel, { color: theme.textDim, marginTop: 16 }]}>{t('tasks.sectionEstimatedTime')}</Text>
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
                  hapticSelection();
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
              backgroundColor: isPinned ? withAlpha(theme.warning, theme.isDark ? 0.18 : 0.14) : theme.surfaceMuted,
              borderColor: isPinned ? theme.warning : theme.border,
            },
          ]}
          onPress={() => {
            hapticSelection();
            setIsPinned(!isPinned);
          }}
          activeOpacity={0.8}
        >
          <Ionicons
            name={isPinned ? 'star' : 'star-outline'}
            size={22}
            color={isPinned ? theme.warning : theme.textDim}
          />
          <View style={styles.pinToggleContent}>
            <Text style={[styles.pinToggleTitle, { color: isPinned ? theme.warning : theme.text }]}>
              {t('tasks.focusOfTheDay')}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Task Reminder Time */}
        <TouchableOpacity
          style={[
            styles.pinToggleCard,
            {
              backgroundColor: reminderTime ? theme.primaryLight : theme.surfaceMuted,
              borderColor: reminderTime || isReminderExpanded ? theme.primary : theme.border,
            },
          ]}
          onPress={() => {
            hapticSelection();
            animateLayout();
            setIsReminderExpanded(prev => {
              const next = !prev;
              if (next && !reminderTime) {
                setReminderTime('09:00');
              }
              return next;
            });
          }}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={t('tasks.a11yReminderTime')}
        >
          <Ionicons
            name={reminderTime ? 'notifications' : 'notifications-outline'}
            size={20}
            color={reminderTime ? theme.primary : theme.textDim}
          />
          <View style={styles.pinToggleContent}>
            <Text style={[styles.pinToggleTitle, { color: reminderTime ? theme.primary : theme.text }]}>
              {t('tasks.pillReminder')}
            </Text>
          </View>
          <Text
            style={[
              styles.reminderValueText,
              { color: reminderTime ? theme.primary : theme.textDim },
            ]}
          >
            {reminderTime ?? t('tasks.reminderOff')}
          </Text>
          {reminderTime && (
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                hapticLight();
                animateLayout();
                setReminderTime(undefined);
                setIsReminderExpanded(false);
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel={t('tasks.reminderClear')}
            >
              <Ionicons name="close-circle" size={18} color={theme.primary} />
            </TouchableOpacity>
          )}
        </TouchableOpacity>

        {isReminderExpanded && (
          <View style={styles.reminderPickerWrap}>
            <TimePickerPanel
              value={reminderTime ?? '09:00'}
              theme={theme}
              compact
              onChange={setReminderTime}
              onClear={() => {
                animateLayout();
                setReminderTime(undefined);
                setIsReminderExpanded(false);
              }}
            />
          </View>
        )}

        {/* Subtasks Builder */}
        <Text style={[styles.sectionLabel, { color: theme.textDim, marginTop: 16 }]}>
          {t('tasks.sectionSubtasks', { count: subtasks.length })}
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
            placeholder={t('tasks.subtaskPlaceholder')}
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
                <Text style={[styles.subtaskChipText, { color: theme.text }]} numberOfLines={1} ellipsizeMode="tail">
                  • {s.title}
                </Text>
                <TouchableOpacity
                  onPress={() => handleRemoveSubtask(s.id)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close-circle" size={16} color={theme.textDim} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
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
            {t('tasks.saveChangesButton')}
          </Text>
        </TouchableOpacity>
      </BottomSheetScrollView>
    </>
  );
}

const styles = StyleSheet.create({
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
    marginBottom: 14,
  },
  notesInput: {
    fontSize: 13,
    lineHeight: 19,
    minHeight: 68,
    maxHeight: 124,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 8,
    fontVariant: ['tabular-nums'],
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
  reminderValueText: {
    fontSize: 12,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  reminderPickerWrap: {
    marginTop: 8,
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
  customTagBuilder: {
    marginTop: 10,
  },
  colorDotsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  colorDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
});
