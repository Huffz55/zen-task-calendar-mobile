import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { DailyTask, RecurrenceType, TaskTag } from '../types';
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

interface CalendarScreenProps {
  theme: ThemeColors;
  currentStreak: number;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  getTasksForDate: (dateStr: string) => DailyTask[];
  getTaskCountForDate: (dateStr: string) => number;
  onToggleTask: (taskId: string) => void;
  onAddTask: (title: string, dateStr: string, recurrence: RecurrenceType, tag?: TaskTag) => void;
  onEditTask: (taskId: string, newTitle: string, newTag?: TaskTag) => void;
  onDeleteSingle: (taskId: string) => void;
  onDeleteInstance: (taskId: string, dateStr: string) => void;
  onDeleteFuture: (taskId: string, dateStr: string) => void;
  onOpenThemeModal: () => void;
  onOpenSettingsModal?: () => void;
  onOpenSyncModal?: () => void;
}

export function CalendarScreen({
  theme,
  currentStreak,
  selectedDate,
  onSelectDate,
  getTasksForDate,
  getTaskCountForDate,
  onToggleTask,
  onAddTask,
  onEditTask,
  onDeleteSingle,
  onDeleteInstance,
  onDeleteFuture,
  onOpenThemeModal,
  onOpenSettingsModal,
  onOpenSyncModal,
}: CalendarScreenProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<DailyTask | null>(null);
  const [taskToEdit, setTaskToEdit] = useState<DailyTask | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<TaskTag | 'all'>('all');

  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
  const dayTasks = getTasksForDate(selectedDateStr);

  const tagCounts = {
    all: dayTasks.length,
    work: dayTasks.filter(t => t.tag === 'work').length,
    personal: dayTasks.filter(t => t.tag === 'personal').length,
    health: dayTasks.filter(t => t.tag === 'health').length,
    ideas: dayTasks.filter(t => t.tag === 'ideas').length,
    priority: dayTasks.filter(t => t.tag === 'priority').length,
  };

  const filteredTasks = dayTasks.filter(task => {
    const matchesSearch =
      searchQuery.trim() === '' ||
      task.title.toLowerCase().includes(searchQuery.toLowerCase().trim());
    const matchesTag = selectedTag === 'all' || task.tag === selectedTag;
    return matchesSearch && matchesTag;
  });

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Header
        theme={theme}
        currentStreak={currentStreak}
        onOpenThemeModal={onOpenThemeModal}
        onOpenSettingsModal={onOpenSettingsModal}
        onOpenSyncModal={onOpenSyncModal}
        title="Calendar"
        subtitle="Monthly Overview"
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Month Calendar Grid */}
        <CalendarGrid
          selectedDate={selectedDate}
          onSelectDate={onSelectDate}
          getTaskCountForDate={getTaskCountForDate}
          theme={theme}
        />

        {/* Selected Day Agenda Header */}
        <View style={styles.agendaHeader}>
          <View>
            <Text style={[styles.agendaTitle, { color: theme.text }]}>
              {format(selectedDate, 'EEEE, MMMM d')}
            </Text>
            <Text style={[styles.agendaSubtitle, { color: theme.textDim }]}>
              {dayTasks.length} {dayTasks.length === 1 ? 'task' : 'tasks'} planned
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: theme.primaryLight, borderColor: theme.border }]}
            onPress={() => {
              hapticLight();
              setIsAddModalOpen(true);
            }}
          >
            <Ionicons name="add" size={16} color={theme.primary} />
            <Text style={[styles.addBtnText, { color: theme.primary }]}>Add</Text>
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
                  onDelete={t => setTaskToDelete(t)}
                  onEdit={t => setTaskToEdit(t)}
                />
              ))
            ) : (
              <View style={[styles.filterEmptyCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Ionicons name="search-outline" size={28} color={theme.textDim} style={{ marginBottom: 6 }} />
                <Text style={[styles.filterEmptyTitle, { color: theme.text }]}>No matching tasks found</Text>
                <TouchableOpacity
                  style={[styles.clearBtn, { backgroundColor: theme.primaryLight, borderColor: theme.border }]}
                  onPress={() => {
                    hapticLight();
                    setSearchQuery('');
                    setSelectedTag('all');
                  }}
                >
                  <Text style={[styles.clearBtnText, { color: theme.primary }]}>Clear Filter</Text>
                </TouchableOpacity>
              </View>
            )
          ) : (
            <View style={[styles.emptyCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.emptyText, { color: theme.textDim }]}>
                No tasks planned for this date.
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 10,
    paddingBottom: 110,
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
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
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
  emptyCard: {
    padding: 20,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
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
