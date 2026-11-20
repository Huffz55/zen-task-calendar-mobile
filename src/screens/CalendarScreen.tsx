import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BackHandler,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { DailyTask, RecurrenceType, TaskTag, Subtask } from '../types';
import { ThemeColors } from '../constants/colors';
import { Header } from '../components/common/Header';
import { CalendarGrid } from '../components/calendar/CalendarGrid';
import { TaskCard } from '../components/tasks/TaskCard';
import { AddTaskModal } from '../components/tasks/AddTaskModal';
import { DeleteTaskModal } from '../components/tasks/DeleteTaskModal';
import { EditTaskModal } from '../components/tasks/EditTaskModal';
import { TaskFilterBar } from '../components/tasks/TaskFilterBar';
import { format } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { hapticLight } from '../hooks/useHaptics';
import { animateLayout } from '../utils/animations';
import { useSwipeTabNavigation } from '../hooks/useSwipeTabNavigation';
import { useTranslation } from '../i18n';

interface CalendarScreenProps {
  theme: ThemeColors;
  currentStreak: number;
  selectedDate: Date;
  todayStr?: string;
  onSelectDate: (date: Date) => void;
  getTasksForDate: (dateStr: string) => DailyTask[];
  getTaskCountForDate: (dateStr: string) => number;
  onToggleTask: (taskId: string) => void;
  onAddTask: (
    title: string,
    dateStr: string,
    recurrence: RecurrenceType,
    tag?: TaskTag,
    subtasks?: Subtask[],
    estimatedMinutes?: number,
    isPinned?: boolean
  ) => void;
  onEditTask: (
    taskId: string,
    newTitle: string,
    newTag?: TaskTag,
    subtasks?: Subtask[],
    estimatedMinutes?: number,
    isPinned?: boolean
  ) => void;
  onDeleteSingle: (taskId: string) => void;
  onDeleteInstance: (taskId: string, dateStr: string) => void;
  onDeleteFuture: (taskId: string, dateStr: string) => void;
  onToggleSubtask?: (taskId: string, subtaskId: string) => void;
  onStartFocus?: (task: { id: string; title: string }) => void;
  onOpenThemeModal: () => void;
  onOpenSettingsModal?: () => void;
  onOpenSyncModal?: () => void;
}

export function CalendarScreen({
  theme,
  currentStreak,
  selectedDate,
  todayStr,
  onSelectDate,
  getTasksForDate,
  getTaskCountForDate,
  onToggleTask,
  onAddTask,
  onEditTask,
  onDeleteSingle,
  onDeleteInstance,
  onDeleteFuture,
  onToggleSubtask,
  onStartFocus,
  onOpenThemeModal,
  onOpenSettingsModal,
  onOpenSyncModal,
}: CalendarScreenProps) {
  const { t, dateLocale } = useTranslation();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<DailyTask | null>(null);
  const [taskToEdit, setTaskToEdit] = useState<DailyTask | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<TaskTag | 'all'>('all');

  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
  const dayTasks = useMemo(() => getTasksForDate(selectedDateStr), [getTasksForDate, selectedDateStr]);

  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = { all: dayTasks.length };
    for (const t of dayTasks) {
      if (t.tag) {
        counts[t.tag] = (counts[t.tag] || 0) + 1;
      }
    }
    return counts;
  }, [dayTasks]);

  const filteredTasks = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return dayTasks.filter(task => {
      const matchesSearch = q === '' || task.title.toLowerCase().includes(q);
      const matchesTag = selectedTag === 'all' || task.tag === selectedTag;
      return matchesSearch && matchesTag;
    });
  }, [dayTasks, searchQuery, selectedTag]);

  const handleSelectDateSmooth = useCallback(
    (date: Date) => {
      animateLayout();
      onSelectDate(date);
    },
    [onSelectDate]
  );

  const handleDeleteRequest = useCallback((t: DailyTask) => {
    setTaskToDelete(t);
  }, []);

  const handleEditRequest = useCallback((t: DailyTask) => {
    setTaskToEdit(t);
  }, []);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (searchQuery.trim() !== '' || selectedTag !== 'all') {
        animateLayout();
        setSearchQuery('');
        setSelectedTag('all');
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [searchQuery, selectedTag]);

  const swipeHandlers = useSwipeTabNavigation('calendar');

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      {...swipeHandlers}
    >
      <Header
        theme={theme}
        currentStreak={currentStreak}
        onOpenThemeModal={onOpenThemeModal}
        onOpenSettingsModal={onOpenSettingsModal}
        onOpenSyncModal={onOpenSyncModal}
        title={t('calendar.title')}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={styles.scrollContent}
      >
        {/* Month Calendar Grid */}
        <CalendarGrid
          selectedDate={selectedDate}
          todayStr={todayStr}
          onSelectDate={handleSelectDateSmooth}
          getTaskCountForDate={getTaskCountForDate}
          theme={theme}
        />

        {/* Selected Day Agenda Header */}
        <View style={styles.agendaHeader}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={[styles.agendaTitle, { color: theme.text }]} numberOfLines={1} ellipsizeMode="tail" maxFontSizeMultiplier={1.35}>
              {format(selectedDate, t('dates.fullWeekdayMonthDay'), { locale: dateLocale })}
            </Text>
            <Text style={[styles.agendaSubtitle, { color: theme.textDim }]} numberOfLines={1} maxFontSizeMultiplier={1.35}>
              {t(
                dayTasks.length === 1 ? 'calendar.agendaPlannedOne' : 'calendar.agendaPlannedOther',
                { count: dayTasks.length }
              )}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: theme.primaryLight, borderColor: theme.border }]}
            onPress={() => {
              hapticLight();
              setIsAddModalOpen(true);
            }}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Ionicons name="add" size={16} color={theme.primary} />
            <Text style={[styles.addBtnText, { color: theme.primary }]} maxFontSizeMultiplier={1.35}>
              {t('common.add')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Filter Bar */}
        {dayTasks.length > 0 && (
          <View style={styles.filterWrapper}>
            <TaskFilterBar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              selectedTag={selectedTag}
              onSelectTag={setSelectedTag}
              theme={theme}
              counts={tagCounts}
            />
          </View>
        )}

        {/* Selected Day Tasks */}
        <View style={styles.tasksList}>
          {dayTasks.length > 0 ? (
            filteredTasks.length > 0 ? (
              filteredTasks.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  theme={theme}
                  onToggle={onToggleTask}
                  onDelete={handleDeleteRequest}
                  onEdit={handleEditRequest}
                  onToggleSubtask={onToggleSubtask}
                  onStartFocus={onStartFocus}
                />
              ))
            ) : (
              <View style={[styles.filterEmptyCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Ionicons name="search-outline" size={28} color={theme.textDim} style={{ marginBottom: 6 }} />
                <Text style={[styles.filterEmptyTitle, { color: theme.text }]}>{t('calendar.noMatchingTasks')}</Text>
                <TouchableOpacity
                  style={[styles.clearBtn, { backgroundColor: theme.primaryLight, borderColor: theme.border }]}
                  onPress={() => {
                    hapticLight();
                    animateLayout();
                    setSearchQuery('');
                    setSelectedTag('all');
                  }}
                >
                  <Text style={[styles.clearBtnText, { color: theme.primary }]}>{t('calendar.clearFilter')}</Text>
                </TouchableOpacity>
              </View>
            )
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>
                {t('calendar.emptyDateTitle')}
              </Text>
              <Text style={[styles.emptySubtitle, { color: theme.textMuted }]} numberOfLines={2}>
                {t('calendar.emptyDateSubtitle')}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Add Task Modal */}
      <AddTaskModal
        visible={isAddModalOpen}
        selectedDateStr={selectedDateStr}
        theme={theme}
        onClose={() => setIsAddModalOpen(false)}
        onAddTask={onAddTask}
      />

      {/* Edit Task Modal */}
      <EditTaskModal
        visible={taskToEdit !== null}
        task={taskToEdit}
        theme={theme}
        onClose={() => setTaskToEdit(null)}
        onSave={onEditTask}
      />

      {/* Delete Task Modal */}
      <DeleteTaskModal
        visible={taskToDelete !== null}
        task={taskToDelete}
        selectedDateStr={selectedDateStr}
        theme={theme}
        onClose={() => setTaskToDelete(null)}
        onDeleteSingle={onDeleteSingle}
        onDeleteInstance={onDeleteInstance}
        onDeleteFuture={onDeleteFuture}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 10,
    paddingBottom: 32,
  },
  agendaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 6,
    marginBottom: 12,
  },
  agendaTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  agendaSubtitle: {
    fontSize: 12,
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 36,
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  addBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  tasksList: {
    paddingHorizontal: 20,
  },
  emptyContainer: {
    paddingVertical: 36,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 4,
  },
  filterWrapper: {
    paddingHorizontal: 20,
  },
  filterEmptyCard: {
    padding: 22,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterEmptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
  },
  clearBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  clearBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
