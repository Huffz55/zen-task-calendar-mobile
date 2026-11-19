import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { format, isValid, parseISO } from 'date-fns';
import { BuiltinTaskTag, RecurrenceType, TaskTag, Subtask } from '../../types';
import { ThemeColors, withAlpha } from '../../constants/colors';
import { TAGS, CUSTOM_TAG_COLORS, resolveTagConfig } from '../../constants/tags';
import { Ionicons } from '@expo/vector-icons';
import { hapticLight, hapticSelection, hapticSuccess } from '../../hooks/useHaptics';
import { playWaterDrop, playBambooTap } from '../../services/audio/audioService';
import { animateLayout, springLayout } from '../../utils/animations';
import { BottomSheetScrollView, SwipeableBottomSheet } from '../common/SwipeableBottomSheet';
import { useApp } from '../../context/AppContext';
import { formatMinutesCompact, useTranslation } from '../../i18n';

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
    isPinned?: boolean,
    isEvening?: boolean,
    isGhost?: boolean,
    isInbox?: boolean
  ) => void;
}

export function AddTaskModal({
  visible,
  selectedDateStr,
  theme,
  onClose,
  onAddTask,
}: AddTaskModalProps) {
  const { customTags, addCustomTag } = useApp();
  const { t, language, dateLocale } = useTranslation();
  const [title, setTitle] = useState('');
  const [tag, setTag] = useState<TaskTag | undefined>(undefined);
  const [isCreatingTag, setIsCreatingTag] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(CUSTOM_TAG_COLORS[0].color);
  const [recurrence, setRecurrence] = useState<RecurrenceType>('none');
  const [estimatedMinutes, setEstimatedMinutes] = useState<number | undefined>(undefined);
  const [isPinned, setIsPinned] = useState(false);
  const [isInbox, setIsInbox] = useState(false);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtaskInput, setNewSubtaskInput] = useState('');
  const [activeSection, setActiveSection] = useState<'tag' | 'time' | 'subtasks' | 'repeat' | null>(null);

  const formattedDate = useMemo(() => {
    const parsed = parseISO(selectedDateStr);
    if (!isValid(parsed)) return selectedDateStr;
    return format(parsed, t('dates.fullDate'), { locale: dateLocale });
  }, [selectedDateStr, t, dateLocale]);

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
    onAddTask(
      title.trim(),
      selectedDateStr,
      recurrence,
      tag,
      subtasks,
      estimatedMinutes,
      isPinned,
      false,
      false,
      isInbox
    );
    setTitle('');
    setTag(undefined);
    setRecurrence('none');
    setEstimatedMinutes(undefined);
    setIsPinned(false);
    setIsInbox(false);
    setSubtasks([]);
    setNewSubtaskInput('');
    setActiveSection(null);
    onClose();
  };

  const handleClose = () => {
    setActiveSection(null);
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
    { id: 'weekly', label: t('tasks.recurrence.weekly') },
    { id: 'biweekly', label: t('tasks.recurrence.biweekly') },
  ];

  const durationOptions: { label: string; value: number | undefined }[] = [
    { label: t('common.none'), value: undefined },
    { label: formatMinutesCompact(15, language), value: 15 },
    { label: formatMinutesCompact(30, language), value: 30 },
    { label: formatMinutesCompact(45, language), value: 45 },
    { label: formatMinutesCompact(60, language), value: 60 },
    { label: formatMinutesCompact(120, language), value: 120 },
  ];

  const inboxTint = theme.isDark ? '#38bdf8' : '#0284c7';

  return (
    <SwipeableBottomSheet visible={visible} onClose={handleClose} theme={theme} maxHeight="88%" useKeyboardAvoiding>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text style={[styles.sheetTitle, { color: theme.text }]} numberOfLines={1}>
            {t('tasks.addTitle')}
          </Text>
          <Text style={[styles.dateSubtitle, { color: theme.textDim }]} numberOfLines={1}>
            {formattedDate}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => {
            hapticLight();
            handleClose();
          }}
          style={styles.closeBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel={t('tasks.a11yCloseAdd')}
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
          placeholder={t('tasks.titlePlaceholder')}
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
              hapticSelection();
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
              numberOfLines={1}
            >
              {tag ? resolveTagConfig(tag, customTags, language).label : t('tasks.pillTag')}
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
              hapticSelection();
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
              {estimatedMinutes ? formatMinutesCompact(estimatedMinutes, language) : t('tasks.pillTime')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.optionPill,
              {
                backgroundColor: isPinned ? withAlpha(theme.warning, theme.isDark ? 0.2 : 0.14) : theme.surfaceMuted,
                borderColor: isPinned ? theme.warning : theme.border,
              },
            ]}
            onPress={() => {
              hapticSelection();
              setIsPinned(!isPinned);
            }}
          >
            <Ionicons
              name={isPinned ? 'star' : 'star-outline'}
              size={13}
              color={isPinned ? theme.warning : theme.textDim}
            />
            <Text style={[styles.optionPillText, { color: isPinned ? theme.warning : theme.textDim }]}>
              {t('tasks.pillPriority')}
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
              hapticSelection();
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
              {recurrence !== 'none' ? t(`tasks.recurrence.${recurrence}`) : t('tasks.pillRepeat')}
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
              hapticSelection();
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
              {subtasks.length > 0 ? t('tasks.pillStepsCount', { count: subtasks.length }) : t('tasks.pillSteps')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.optionPill,
              {
                backgroundColor: isInbox ? withAlpha(inboxTint, theme.isDark ? 0.2 : 0.12) : theme.surfaceMuted,
                borderColor: isInbox ? inboxTint : theme.border,
              },
            ]}
            onPress={() => {
              hapticSelection();
              setIsInbox(prev => !prev);
            }}
          >
            <Ionicons
              name={isInbox ? 'archive' : 'archive-outline'}
              size={13}
              color={isInbox ? inboxTint : theme.textDim}
            />
            <Text style={[styles.optionPillText, { color: isInbox ? inboxTint : theme.textDim }]}>
              {t('tasks.pillInbox')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Expandable Section Content (only when a pill is selected) */}
        {activeSection !== null && (
          <View style={styles.expandedSectionWrap}>
            {activeSection === 'tag' && (
              <View style={styles.sectionBlock}>
                <Text style={[styles.sectionLabel, { color: theme.textDim }]}>{t('tasks.sectionChooseTag')}</Text>
                <View style={styles.chipsRow}>
                  {tagKeys.map(tKey => {
                    const conf = resolveTagConfig(tKey, customTags, language);
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
                          hapticSelection();
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
              </View>
            )}

            {activeSection === 'repeat' && (
              <View style={styles.sectionBlock}>
                <Text style={[styles.sectionLabel, { color: theme.textDim }]}>{t('tasks.sectionRecurrence')}</Text>
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
              </View>
            )}

            {activeSection === 'time' && (
              <View style={styles.sectionBlock}>
                <Text style={[styles.sectionLabel, { color: theme.textDim }]}>{t('tasks.sectionEstimatedTime')}</Text>
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
              </View>
            )}

            {activeSection === 'subtasks' && (
              <View style={styles.sectionBlock}>
                <Text style={[styles.sectionLabel, { color: theme.textDim }]}>
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
              </View>
            )}
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
            {t('tasks.addTaskButton')}
          </Text>
        </TouchableOpacity>
      </BottomSheetScrollView>
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
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  dateSubtitle: {
    fontSize: 12,
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  closeBtn: {
    padding: 6,
  },
  input: {
    fontSize: 16,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 4,
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
    marginTop: 18,
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
    fontVariant: ['tabular-nums'],
  },
  expandedSectionWrap: {
    marginTop: 6,
    marginBottom: 4,
  },
  sectionBlock: {
    paddingVertical: 4,
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
