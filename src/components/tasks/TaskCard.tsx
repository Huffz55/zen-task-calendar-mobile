import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  PanResponder,
} from 'react-native';
import { DailyTask } from '../../types';
import { ThemeColors } from '../../constants/colors';
import { TAGS } from '../../constants/tags';
import { Ionicons } from '@expo/vector-icons';
import { hapticLight, hapticSuccess, hapticWarning } from '../../hooks/useHaptics';
import { playBambooTap, playSoftSwoosh } from '../../services/audio/audioService';

interface TaskCardProps {
  task: DailyTask;
  theme: ThemeColors;
  onToggle: (taskId: string) => void;
  onDelete: (task: DailyTask) => void;
  onEdit?: (task: DailyTask) => void;
  onTogglePin?: (taskId: string) => void;
  onDeferTask?: () => void;
  onDuplicateTask?: () => void;
  onToggleSubtask?: (taskId: string, subtaskId: string) => void;
  onStartFocus?: (task: { id: string; title: string }) => void;
}

function formatMinutes(seconds: number): string {
  const mins = Math.round(seconds / 60);
  if (mins >= 60) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  }
  return `${mins}m`;
}

export function TaskCard({
  task,
  theme,
  onToggle,
  onDelete,
  onEdit,
  onTogglePin,
  onDeferTask,
  onDuplicateTask,
  onToggleSubtask,
  onStartFocus,
}: TaskCardProps) {
  const [isSubtasksExpanded, setIsSubtasksExpanded] = useState(false);
  const tagConfig = task.tag ? TAGS[task.tag] : null;

  // Swipe animation setup
  const [panX] = useState(() => new Animated.Value(0));

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) => {
          return Math.abs(gestureState.dx) > 15 && Math.abs(gestureState.dy) < 12;
        },
        onPanResponderMove: (_, gestureState) => {
          panX.setValue(gestureState.dx);
        },
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dx > 80) {
            // Swiped right -> Complete
            playSoftSwoosh();
            playBambooTap();
            hapticSuccess();
            onToggle(task.taskId);
          } else if (gestureState.dx < -80) {
            // Swiped left -> Delete
            playSoftSwoosh();
            hapticWarning();
            onDelete(task);
          }
          Animated.spring(panX, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 4,
          }).start();
        },
      }),
    [onDelete, onToggle, panX, task]
  );

  const subtasks = task.subtasks || [];
  const completedSubtasksCount = subtasks.filter(s => s.isCompleted).length;
  const subtaskPercent = subtasks.length > 0 ? (completedSubtasksCount / subtasks.length) * 100 : 0;

  // Swipe indicator opacities - only visible while actively swiping
  const swipeOpacityLeft = panX.interpolate({
    inputRange: [0, 25, 75],
    outputRange: [0, 0.6, 1],
    extrapolate: 'clamp',
  });

  const swipeOpacityRight = panX.interpolate({
    inputRange: [-75, -25, 0],
    outputRange: [1, 0.6, 0],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.swipeContainer}>
      {/* Background Swipe Indicators (Hidden at rest, reveals on swipe) */}
      <View style={styles.swipeBackground} pointerEvents="none">
        <Animated.View style={[styles.swipeActionLeft, { opacity: swipeOpacityLeft }]}>
          <Ionicons name="checkmark-circle" size={22} color="#10b981" />
          <Text style={styles.swipeActionText}>Done</Text>
        </Animated.View>
        <Animated.View style={[styles.swipeActionRight, { opacity: swipeOpacityRight }]}>
          <Text style={styles.swipeActionDeleteText}>Delete</Text>
          <Ionicons name="trash-outline" size={20} color="#ef4444" />
        </Animated.View>
      </View>

      {/* Foreground Draggable Card */}
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.card,
          {
            backgroundColor: theme.card,
            borderColor: task.isCompleted ? theme.border : (task.isPinned ? '#f59e0b' : theme.border),
            borderWidth: task.isPinned && !task.isCompleted ? 1.5 : 1,
            transform: [{ translateX: panX }],
          },
        ]}
      >
        {/* Pinned Top Banner */}
        {task.isPinned && !task.isCompleted && (
          <View style={styles.pinnedBanner}>
            <Ionicons name="star" size={12} color="#f59e0b" />
            <Text style={styles.pinnedBannerText}>Focus of the Day</Text>
          </View>
        )}

        <View style={styles.cardMainRow}>
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
              if (!task.isCompleted) {
                playBambooTap();
                hapticSuccess();
              } else {
                hapticLight();
              }
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
                  <Text style={[styles.badgeText, { color: theme.accent || theme.primary }]}>
                    🔁 {task.recurrence}
                  </Text>
                </View>
              )}

              {/* Focus Time Badge */}
              {task.focusedSeconds && task.focusedSeconds > 0 ? (
                <View style={[styles.badge, { backgroundColor: theme.primaryLight }]}>
                  <Text style={[styles.badgeText, { color: theme.primary }]}>
                    ⏱️ {formatMinutes(task.focusedSeconds)}
                  </Text>
                </View>
              ) : null}

              {/* Estimated Duration Badge */}
              {task.estimatedMinutes && task.estimatedMinutes > 0 ? (
                <View style={[styles.badge, { backgroundColor: theme.surfaceMuted, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.border }]}>
                  <Text style={[styles.badgeText, { color: theme.textDim }]}>
                    ⏱️ {task.estimatedMinutes >= 60
                      ? `${Math.floor(task.estimatedMinutes / 60)}h ${task.estimatedMinutes % 60 ? `${task.estimatedMinutes % 60}m` : ''}`.trim()
                      : `${task.estimatedMinutes}m`}
                  </Text>
                </View>
              ) : null}

              {/* Subtasks Badge */}
              {subtasks.length > 0 && (
                <TouchableOpacity
                  style={[
                    styles.subtaskBadge,
                    {
                      backgroundColor: theme.surfaceMuted,
                      borderColor: theme.border,
                    },
                  ]}
                  onPress={() => {
                    hapticLight();
                    setIsSubtasksExpanded(!isSubtasksExpanded);
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="checkbox-outline" size={12} color={theme.primary} />
                  <Text style={[styles.subtaskBadgeText, { color: theme.text }]}>
                    {completedSubtasksCount}/{subtasks.length}
                  </Text>
                  <Ionicons
                    name={isSubtasksExpanded ? 'chevron-up' : 'chevron-down'}
                    size={11}
                    color={theme.textDim}
                  />
                </TouchableOpacity>
              )}
            </View>

            {/* Subtask Mini Progress Bar */}
            {subtasks.length > 0 && (
              <View style={[styles.progressTrack, { backgroundColor: theme.surfaceMuted }]}>
                <View
                  style={[
                    styles.progressBar,
                    {
                      width: `${subtaskPercent}%`,
                      backgroundColor: theme.primary,
                    },
                  ]}
                />
              </View>
            )}
          </TouchableOpacity>

          {/* Actions */}
          <View style={styles.actionsRow}>
            {/* Quick Focus Button */}
            {onStartFocus && !task.isCompleted && (
              <TouchableOpacity
                style={[styles.focusActionBtn, { backgroundColor: theme.primaryLight }]}
                onPress={() => {
                  hapticSuccess();
                  onStartFocus({ id: task.taskId, title: task.title });
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="Focus on this task"
              >
                <Ionicons name="timer-outline" size={15} color={theme.primary} />
              </TouchableOpacity>
            )}

            {/* Toggle Pin / Focus of the Day */}
            {onTogglePin && (
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => {
                  hapticLight();
                  onTogglePin(task.taskId);
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel={task.isPinned ? 'Unpin task' : 'Pin as focus of the day'}
              >
                <Ionicons
                  name={task.isPinned ? 'star' : 'star-outline'}
                  size={15}
                  color={task.isPinned ? '#f59e0b' : theme.textDim}
                />
              </TouchableOpacity>
            )}

            {/* Defer to Tomorrow */}
            {onDeferTask && !task.isCompleted && (
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => {
                  hapticLight();
                  onDeferTask();
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="Defer to tomorrow"
              >
                <Ionicons name="arrow-forward-circle-outline" size={16} color={theme.textDim} />
              </TouchableOpacity>
            )}

            {/* Duplicate Task */}
            {onDuplicateTask && (
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => {
                  hapticLight();
                  onDuplicateTask();
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="Duplicate task"
              >
                <Ionicons name="copy-outline" size={15} color={theme.textDim} />
              </TouchableOpacity>
            )}

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

        {/* Expandable Subtasks Checklist */}
        {isSubtasksExpanded && subtasks.length > 0 && (
          <View style={[styles.subtasksList, { borderTopColor: theme.border }]}>
            {subtasks.map(sub => (
              <TouchableOpacity
                key={sub.id}
                style={styles.subtaskItem}
                onPress={() => {
                  if (onToggleSubtask) {
                    if (!sub.isCompleted) {
                      playBambooTap();
                      hapticSuccess();
                    } else {
                      hapticLight();
                    }
                    onToggleSubtask(task.taskId, sub.id);
                  }
                }}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.subCheckbox,
                    {
                      borderColor: sub.isCompleted ? theme.primary : theme.textDim,
                      backgroundColor: sub.isCompleted ? theme.primary : 'transparent',
                    },
                  ]}
                >
                  {sub.isCompleted && <Ionicons name="checkmark" size={10} color="#ffffff" />}
                </View>
                <Text
                  style={[
                    styles.subtaskTitle,
                    {
                      color: sub.isCompleted ? theme.textDim : theme.text,
                      textDecorationLine: sub.isCompleted ? 'line-through' : 'none',
                    },
                  ]}
                >
                  {sub.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  swipeContainer: {
    marginBottom: 10,
    position: 'relative',
  },
  swipeBackground: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderRadius: 18,
  },
  swipeActionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  swipeActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10b981',
  },
  swipeActionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  swipeActionDeleteText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ef4444',
  },
  card: {
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
  },
  pinnedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  pinnedBannerText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#f59e0b',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  cardMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
    flexWrap: 'wrap',
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
  subtaskBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  subtaskBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  progressTrack: {
    height: 3,
    borderRadius: 1.5,
    marginTop: 6,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 1.5,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  focusActionBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtn: {
    padding: 6,
  },
  subtasksList: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  subtaskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 2,
  },
  subCheckbox: {
    width: 16,
    height: 16,
    borderRadius: 5,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtaskTitle: {
    fontSize: 13,
  },
});
