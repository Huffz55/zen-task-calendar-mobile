import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { DailyTask, RecurrenceType, TaskTag, Subtask } from '../types';
import { ThemeColors } from '../constants/colors';
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
import { useSwipeTabNavigation } from '../hooks/useSwipeTabNavigation';

interface TodayScreenProps {
  theme: ThemeColors;
  currentStreak: number;
  tasks: DailyTask[];
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  getTaskCountForDate: (dateStr: string) => number;
  onToggleTask: (taskId: string) => void;
  onAddTask: (title: string, dateStr: string, recurrence: RecurrenceType, tag?: TaskTag, subtasks?: Subtask[], estimatedMinutes?: number, isPinned?: boolean) => void;
  onEditTask: (taskId: string, newTitle: string, newTag?: TaskTag, subtasks?: Subtask[], estimatedMinutes?: number, isPinned?: boolean) => void;
  onTogglePin?: (taskId: string) => void;
  onDeferTask?: (taskId: string, currentDateStr: string) => void;
  onDuplicateTask?: (taskId: string, dateStr: string) => void;
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
  onSelectDate,
  getTaskCountForDate,
  onToggleTask,
  onAddTask,
  onEditTask,
  onTogglePin,
  onDeferTask,
  onDuplicateTask,
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
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const isToday = selectedDateStr === todayStr;

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.isCompleted).length;
  const { panHandlers, containerStyle } = useSwipeTabNavigation('today');

  const totalEstimatedMinutes = tasks.reduce((sum, t) => sum + (t.estimatedMinutes || 0), 0);
  const formatEstimatedTotal = (mins: number) => {
    if (mins <= 0) return null;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0) return m > 0 ? `${h}h ${m}m planned` : `${h}h planned`;
    return `${m}m planned`;
  };
  const plannedTotalStr = formatEstimatedTotal(totalEstimatedMinutes);

  const handleToggle = (taskId: string) => {
    const target = tasks.find(t => t.taskId === taskId);
    if (target && !target.isCompleted) {
      const willBeAllDone = completedTasks + 1 === totalTasks && totalTasks > 0;
      if (willBeAllDone) {
        setShowSakura(true);
      }
    }
    onToggleTask(taskId);
  };

  const handleDateSelect = (date: Date) => {
    playWaterDrop();
    onSelectDate(date);
  };

  const tagCounts = {
    all: tasks.length,
    work: tasks.filter(t => t.tag === 'work').length,
    personal: tasks.filter(t => t.tag === 'personal').length,
    health: tasks.filter(t => t.tag === 'health').length,
    ideas: tasks.filter(t => t.tag === 'ideas').length,
    priority: tasks.filter(t => t.tag === 'priority').length,
  };

  const filteredTasks = tasks.filter(task => {
    const matchesSearch =
      searchQuery.trim() === '' ||
      task.title.toLowerCase().includes(searchQuery.toLowerCase().trim());
    const matchesTag = selectedTag === 'all' || task.tag === selectedTag;
    return matchesSearch && matchesTag;
  });

  return (
    <Animated.View style={[styles.container, { backgroundColor: theme.background }, containerStyle]} {...panHandlers}>
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
        onSelectDate={handleDateSelect}
        getTaskCountForDate={getTaskCountForDate}
        theme={theme}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
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
            activeOpacity={0.7}
          >
            <View style={styles.rolloverLeft}>
              <Ionicons name="sparkles" size={16} color={theme.primary} />
              <Text style={[styles.rolloverText, { color: theme.text }]}>
                {overdueCount} overdue {overdueCount === 1 ? 'task' : 'tasks'}
              </Text>
            </View>
            <View style={[styles.rolloverPill, { backgroundColor: theme.primaryLight }]}>
              <Text style={[styles.rolloverPillText, { color: theme.primary }]}>Roll over 🌸</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Progress Summary & Planned Time */}
        {totalTasks > 0 && (
          <View style={styles.summaryRow}>
            <View style={styles.summaryLeft}>
              <Text style={[styles.summaryText, { color: theme.textDim }]}>
                {completedTasks} of {totalTasks} completed
              </Text>
              {plannedTotalStr && (
                <Text style={[styles.plannedTimeBadge, { color: theme.primary, backgroundColor: theme.primaryLight }]}>
                  {plannedTotalStr}
                </Text>
              )}
            </View>
            {completedTasks === totalTasks && (
              <Text style={[styles.perfectBadge, { color: theme.success }]}>
                Perfect Day! 🌸
              </Text>
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
            filteredTasks.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                theme={theme}
                onToggle={handleToggle}
                onDelete={t => setTaskToDelete(t)}
                onEdit={t => setTaskToEdit(t)}
                onTogglePin={onTogglePin}
                onDeferTask={onDeferTask ? () => onDeferTask(task.taskId, selectedDateStr) : undefined}
                onDuplicateTask={onDuplicateTask ? () => onDuplicateTask(task.taskId, selectedDateStr) : undefined}
                onToggleSubtask={onToggleSubtask}
                onStartFocus={onStartFocus}
              />
            ))
          ) : (
            <View style={[styles.filterEmptyContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Ionicons name="search-outline" size={32} color={theme.textDim} style={{ marginBottom: 8 }} />
              <Text style={[styles.filterEmptyTitle, { color: theme.text }]}>No matching tasks found</Text>
              <Text style={[styles.filterEmptySubtitle, { color: theme.textDim }]}>
                No tasks match your search or selected tag.
              </Text>
              <TouchableOpacity
                style={[styles.clearFilterBtn, { backgroundColor: theme.primaryLight, borderColor: theme.border }]}
                onPress={() => {
                  hapticLight();
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
            <Text style={styles.emptyIcon}>🌸</Text>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>
              Clear mind, peaceful day
            </Text>
            <Text style={[styles.emptySubtitle, { color: theme.textDim }]}>
              No tasks planned for this day. Tap the plus button to add a new goal.
            </Text>
            <TouchableOpacity
              style={[styles.emptyAddBtn, { backgroundColor: theme.primaryLight, borderColor: theme.border }]}
              onPress={() => {
                hapticLight();
                setIsAddModalOpen(true);
              }}
            >
              <Ionicons name="add" size={18} color={theme.primary} />
              <Text style={[styles.emptyAddText, { color: theme.primary }]}>Add Task</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Floating Action Button (+) */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.primary, shadowColor: theme.primary }]}
        onPress={() => {
          hapticLight();
          setIsAddModalOpen(true);
        }}
        activeOpacity={0.85}
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
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 110,
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
  },
  rolloverText: {
    fontSize: 13,
    fontWeight: '600',
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
  },
  summaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  summaryText: {
    fontSize: 12,
    fontWeight: '600',
  },
  plannedTimeBadge: {
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 8,
  },
  perfectBadge: {
    fontSize: 12,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyIcon: {
    fontSize: 42,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
    marginBottom: 20,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
  },
  emptyAddText: {
    fontSize: 13,
    fontWeight: '700',
  },
  fab: {
    position: 'absolute',
    bottom: 92,
    right: 20,
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
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
  filterEmptySubtitle: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 14,
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
});
