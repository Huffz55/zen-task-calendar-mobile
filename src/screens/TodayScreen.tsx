import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { ThemeColors, withAlpha } from '../constants/colors';
import { Header } from '../components/common/Header';
import { DayStrip } from '../components/calendar/DayStrip';
import { TaskCard } from '../components/tasks/TaskCard';
import { AddTaskModal } from '../components/tasks/AddTaskModal';
import { DeleteTaskModal } from '../components/tasks/DeleteTaskModal';
import { EditTaskModal } from '../components/tasks/EditTaskModal';
import { TaskFilterBar } from '../components/tasks/TaskFilterBar';
import { EveningReviewModal } from '../components/common/EveningReviewModal';
import { SakuraPetalsOverlay } from '../components/common/SakuraPetalsOverlay';
import { format } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { hapticLight, hapticSuccess } from '../hooks/useHaptics';
import { playWaterDrop } from '../services/audio/audioService';
import { animateLayout } from '../utils/animations';
import { useSwipeTabNavigation } from '../hooks/useSwipeTabNavigation';

interface TodayScreenProps {
  theme: ThemeColors;
  currentStreak: number;
  tasks: DailyTask[];
  selectedDate: Date;
  todayStr?: string;
  onSelectDate: (date: Date) => void;
  getTaskCountForDate: (dateStr: string) => number;
  onToggleTask: (taskId: string) => void;
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
  onEditTask: (taskId: string, newTitle: string, newTag?: TaskTag, subtasks?: Subtask[], estimatedMinutes?: number, isPinned?: boolean) => void;
  onTogglePin?: (taskId: string) => void;
  onMoveToInbox?: (taskId: string) => void;
  onOpenTriage?: () => void;
  inboxCount?: number;
  onDeferTask?: (taskId: string, currentDateStr: string) => void;
  onDeleteSingle: (taskId: string) => void;
  onDeleteInstance: (taskId: string, dateStr: string) => void;
  onDeleteFuture: (taskId: string, dateStr: string) => void;
  onToggleSubtask?: (taskId: string, subtaskId: string) => void;
  onStartFocus?: (task: { id: string; title: string }) => void;
  onOpenThemeModal: () => void;
  overdueCount: number;
  onRolloverTasks: () => void;
  onOpenSettingsModal?: () => void;
  onOpenSyncModal?: () => void;
  isEveningReviewOpen?: boolean;
  onOpenEveningReview?: () => void;
  onCloseEveningReview?: () => void;
  todayFocusSeconds?: number;
}

export function TodayScreen({
  theme,
  currentStreak,
  tasks,
  selectedDate,
  todayStr,
  onSelectDate,
  getTaskCountForDate,
  onToggleTask,
  onAddTask,
  onEditTask,
  onTogglePin,
  onMoveToInbox,
  onOpenTriage,
  inboxCount = 0,
  onDeferTask,
  onDeleteSingle,
  onDeleteInstance,
  onDeleteFuture,
  onToggleSubtask,
  onStartFocus,
  onOpenThemeModal,
  onOpenSettingsModal,
  onOpenSyncModal,
  overdueCount,
  onRolloverTasks,
  isEveningReviewOpen = false,
  onOpenEveningReview,
  onCloseEveningReview,
  todayFocusSeconds = 0,
}: TodayScreenProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<DailyTask | null>(null);
  const [taskToEdit, setTaskToEdit] = useState<DailyTask | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<TaskTag | 'all'>('all');
  const [showSakura, setShowSakura] = useState(false);

  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
  const resolvedTodayStr = todayStr ?? format(new Date(), 'yyyy-MM-dd');
  const isToday = selectedDateStr === resolvedTodayStr;

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.isCompleted).length;
  const swipeHandlers = useSwipeTabNavigation('today');

  const totalEstimatedMinutes = useMemo(
    () => tasks.reduce((sum, t) => sum + (t.estimatedMinutes || 0), 0),
    [tasks]
  );

  const plannedTotalStr = useMemo(() => {
    if (totalEstimatedMinutes <= 0) return null;
    const h = Math.floor(totalEstimatedMinutes / 60);
    const m = totalEstimatedMinutes % 60;
    if (h > 0) return m > 0 ? `${h}h ${m}m planned` : `${h}h planned`;
    return `${m}m planned`;
  }, [totalEstimatedMinutes]);

  const handleToggle = useCallback(
    (taskId: string) => {
      const target = tasks.find(t => t.taskId === taskId);
      if (target && !target.isCompleted) {
        const willBeAllDone = completedTasks + 1 === totalTasks && totalTasks > 0;
        if (willBeAllDone) {
          setShowSakura(true);
        }
      }
      onToggleTask(taskId);
    },
    [tasks, completedTasks, totalTasks, onToggleTask]
  );

  const handleDateSelect = useCallback(
    (date: Date) => {
      playWaterDrop();
      animateLayout();
      onSelectDate(date);
    },
    [onSelectDate]
  );

  const handleDeferForDate = useCallback(
    (taskId: string) => {
      onDeferTask?.(taskId, selectedDateStr);
    },
    [onDeferTask, selectedDateStr]
  );

  const handleDeleteRequest = useCallback((t: DailyTask) => {
    setTaskToDelete(t);
  }, []);

  const handleEditRequest = useCallback((t: DailyTask) => {
    setTaskToEdit(t);
  }, []);

  // Android hardware back clears active filter/search before navigating away
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

  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = { all: tasks.length };
    for (const t of tasks) {
      if (t.tag) {
        counts[t.tag] = (counts[t.tag] || 0) + 1;
      }
    }
    return counts;
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return tasks.filter(task => {
      const matchesSearch = q === '' || task.title.toLowerCase().includes(q);
      const matchesTag = selectedTag === 'all' || task.tag === selectedTag;
      return matchesSearch && matchesTag;
    });
  }, [tasks, searchQuery, selectedTag]);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      {...swipeHandlers}
    >
      {/* Header */}
      <Header
        theme={theme}
        currentStreak={currentStreak}
        onOpenThemeModal={onOpenThemeModal}
        onOpenSettingsModal={onOpenSettingsModal}
        onOpenSyncModal={onOpenSyncModal}
        onOpenEveningReview={onOpenEveningReview}
        title={isToday ? 'Today' : format(selectedDate, 'MMMM d')}
        subtitle={format(selectedDate, 'EEEE, yyyy')}
      />

      {/* Horizontal Day Strip */}
      <DayStrip
        selectedDate={selectedDate}
        todayStr={resolvedTodayStr}
        onSelectDate={handleDateSelect}
        getTaskCountForDate={getTaskCountForDate}
        theme={theme}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={styles.scrollContent}
      >
        {/* Overdue Rollover Banner */}
        {overdueCount > 0 && isToday && (
          <TouchableOpacity
            style={[styles.rolloverBanner, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}
            onPress={() => {
              hapticSuccess();
              onRolloverTasks();
            }}
            activeOpacity={0.75}
          >
            <View style={styles.rolloverLeft}>
              <Ionicons name="sparkles" size={16} color={theme.primary} />
              <Text style={[styles.rolloverText, { color: theme.text }]} numberOfLines={1}>
                {overdueCount} overdue {overdueCount === 1 ? 'task' : 'tasks'}
              </Text>
            </View>
            <View style={[styles.rolloverPill, { backgroundColor: theme.primaryLight }]}>
              <Text style={[styles.rolloverPillText, { color: theme.primary }]}>Roll over</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Progress Summary, Planned Time & Inbox Button */}
        {(totalTasks > 0 || onOpenTriage) && (
          <View style={styles.summaryRow}>
            <View style={styles.summaryLeft}>
              {totalTasks > 0 && (
                <Text style={[styles.summaryText, { color: theme.textDim }]} numberOfLines={1}>
                  {completedTasks} of {totalTasks} completed
                </Text>
              )}
              {plannedTotalStr && (
                <Text style={[styles.plannedTimeBadge, { color: theme.primary, backgroundColor: theme.primaryLight }]} numberOfLines={1}>
                  {plannedTotalStr}
                </Text>
              )}
              {totalTasks > 0 && completedTasks === totalTasks && (
                <Text style={[styles.perfectBadge, { color: theme.success }]}>
                  All done
                </Text>
              )}
            </View>
            {onOpenTriage && (
              <TouchableOpacity
                style={[
                  styles.inboxActionPill,
                  {
                    backgroundColor: inboxCount > 0 ? theme.primaryLight : theme.surfaceMuted,
                    borderColor: inboxCount > 0 ? theme.primary : theme.border,
                  },
                ]}
                onPress={() => {
                  hapticLight();
                  onOpenTriage();
                }}
                activeOpacity={0.75}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Ionicons
                  name="file-tray-full-outline"
                  size={13}
                  color={inboxCount > 0 ? theme.primary : theme.textMuted}
                />
                <Text
                  style={[
                    styles.inboxActionText,
                    { color: inboxCount > 0 ? theme.primary : theme.textMuted },
                  ]}
                  numberOfLines={1}
                >
                  Inbox{inboxCount > 0 ? ` (${inboxCount})` : ''}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Task Filter & Search Bar (Only shown if there are tasks) */}
        {totalTasks > 0 && (
          <TaskFilterBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedTag={selectedTag}
            onSelectTag={setSelectedTag}
            theme={theme}
            counts={tagCounts}
          />
        )}

        {/* Tasks List */}
        {totalTasks > 0 ? (
          filteredTasks.length > 0 ? (
            <>
              {filteredTasks.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  theme={theme}
                  onToggle={handleToggle}
                  onDelete={handleDeleteRequest}
                  onEdit={handleEditRequest}
                  onTogglePin={onTogglePin}
                  onMoveToInbox={onMoveToInbox}
                  onDeferTask={onDeferTask ? handleDeferForDate : undefined}
                  onToggleSubtask={onToggleSubtask}
                  onStartFocus={onStartFocus}
                />
              ))}
            </>
          ) : (
            <View style={[styles.filterEmptyContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Ionicons name="search-outline" size={32} color={theme.textDim} style={{ marginBottom: 8 }} />
              <Text style={[styles.filterEmptyTitle, { color: theme.text }]}>No matching tasks</Text>
              <TouchableOpacity
                style={[styles.clearFilterBtn, { backgroundColor: theme.primaryLight, borderColor: theme.border, marginTop: 10 }]}
                onPress={() => {
                  hapticLight();
                  animateLayout();
                  setSearchQuery('');
                  setSelectedTag('all');
                }}
              >
                <Text style={[styles.clearFilterText, { color: theme.primary }]}>Clear Filter</Text>
              </TouchableOpacity>
            </View>
          )
        ) : (
          <View style={styles.emptyContainer}>
            <View
              style={[
                styles.emptyHairline,
                { backgroundColor: withAlpha(theme.primary, theme.isDark ? 0.45 : 0.35) },
              ]}
            />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>
              {isToday ? 'A clear slate for today' : 'Nothing scheduled'}
            </Text>
            <Text style={[styles.emptySubtitle, { color: theme.textMuted }]} numberOfLines={2}>
              {isToday
                ? 'Tap + below whenever something needs focus.'
                : 'This day is open and unscheduled.'}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Floating Action Button (+) */}
      <TouchableOpacity
        style={[
          styles.fab,
          {
            backgroundColor: theme.primary,
            borderColor: withAlpha('#ffffff', theme.isDark ? 0.22 : 0.28),
          },
        ]}
        onPress={() => {
          hapticLight();
          setIsAddModalOpen(true);
        }}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Add new task"
      >
        <Ionicons name="add" size={28} color="#ffffff" />
      </TouchableOpacity>

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

      {/* Evening Review Modal */}
      {onCloseEveningReview && (
        <EveningReviewModal
          isOpen={isEveningReviewOpen}
          onClose={onCloseEveningReview}
          theme={theme}
          completedTasks={completedTasks}
          totalTasks={totalTasks}
          focusSeconds={todayFocusSeconds}
          currentStreak={currentStreak}
          overdueCount={overdueCount}
          onRollover={onRolloverTasks}
        />
      )}
      {/* Sakura Petals Celebration Overlay */}
      <SakuraPetalsOverlay
        active={showSakura}
        onFinished={() => setShowSakura(false)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 96,
  },
  rolloverBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 14,
  },
  rolloverLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    marginRight: 8,
  },
  rolloverText: {
    fontSize: 13,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  rolloverPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  rolloverPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  summaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    flex: 1,
  },
  summaryText: {
    fontSize: 12,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  plannedTimeBadge: {
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 8,
    overflow: 'hidden',
    fontVariant: ['tabular-nums'],
  },
  perfectBadge: {
    fontSize: 12,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 28,
  },
  emptyHairline: {
    width: 28,
    height: 1.5,
    borderRadius: 1,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 6,
  },
  fab: {
    position: 'absolute',
    bottom: 22,
    right: 20,
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterEmptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 10,
  },
  filterEmptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  clearFilterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  clearFilterText: {
    fontSize: 12,
    fontWeight: '700',
  },
  inboxActionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    flexShrink: 0,
  },
  inboxActionText: {
    fontSize: 11,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
});
