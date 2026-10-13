import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { DailyTask } from '../../types';
import { ThemeColors } from '../../constants/colors';
import { TAGS } from '../../constants/tags';
import { Ionicons } from '@expo/vector-icons';
import { hapticLight, hapticWarning } from '../../hooks/useHaptics';

interface TaskCardProps {
  task: DailyTask;
  theme: ThemeColors;
  onToggle: (taskId: string) => void;
  onDelete: (task: DailyTask) => void;
  onEdit?: (task: DailyTask) => void;
}

export function TaskCard({ task, theme, onToggle, onDelete, onEdit }: TaskCardProps) {
  const tagConfig = task.tag ? TAGS[task.tag] : null;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.card,
          borderColor: task.isCompleted ? theme.border : theme.border,
          opacity: task.isCompleted ? 0.75 : 1,
        },
      ]}
    >
      {/* Checkbox */}
      <TouchableOpacity
        style={[
          styles.checkbox,
          {
            borderColor: task.isCompleted ? theme.primary : theme.textDim,
            backgroundColor: task.isCompleted ? theme.primary : 'transparent',
          },
        ]}
        onPress={() => {
          hapticLight();
          onToggle(task.taskId);
        }}
        activeOpacity={0.7}
      >
        {task.isCompleted && <Ionicons name="checkmark" size={14} color="#ffffff" />}
      </TouchableOpacity>

      {/* Content */}
      <TouchableOpacity
        style={styles.content}
        onPress={() => {
          if (onEdit) {
            hapticLight();
            onEdit(task);
          }
        }}
        activeOpacity={onEdit ? 0.7 : 1}
      >
        <Text
          style={[
            styles.title,
            {
              color: task.isCompleted ? theme.textDim : theme.text,
              textDecorationLine: task.isCompleted ? 'line-through' : 'none',
            },
          ]}
          numberOfLines={2}
        >
          {task.title}
        </Text>

        {/* Badges Row */}
        <View style={styles.badgeRow}>
          {tagConfig && (
            <View
              style={[
                styles.badge,
                { backgroundColor: theme.isDark ? tagConfig.bgDark : tagConfig.bgLight },
              ]}
            >
              <Text style={[styles.badgeText, { color: tagConfig.color }]}>
                {tagConfig.label}
              </Text>
            </View>
          )}

          {task.recurrence !== 'none' && (
            <View style={[styles.badge, { backgroundColor: theme.surfaceMuted }]}>
              <Text style={[styles.badgeText, { color: theme.accent }]}>
                🔁 {task.recurrence}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>

      {/* Actions */}
      <View style={styles.actionsRow}>
        {onEdit && (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => {
              hapticLight();
              onEdit(task);
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="pencil-outline" size={16} color={theme.textDim} />
          </TouchableOpacity>
        )}

        {/* Delete Button */}
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => {
            hapticWarning();
            onDelete(task);
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="trash-outline" size={16} color={theme.textDim} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 10,
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: -0.2,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionBtn: {
    padding: 6,
  },
});
