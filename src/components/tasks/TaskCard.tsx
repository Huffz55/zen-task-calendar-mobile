import { memo, useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Animated,
  PanResponder,
  Linking,
} from 'react-native';
import { CustomTag, DailyTask } from '../../types';
import { ThemeColors } from '../../constants/colors';
import { resolveTagConfig } from '../../constants/tags';
import { Ionicons } from '@expo/vector-icons';
import { hapticLight, hapticSelection, hapticSuccess, hapticWarning } from '../../hooks/useHaptics';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { playBambooTap, playSoftSwoosh } from '../../services/audio/audioService';
import { animateLayout, PRESS_SPRING_CONFIG } from '../../utils/animations';
import { CloseButton } from '../common/CloseButton';
import { SwipeableBottomSheet, useBottomSheetClose } from '../common/SwipeableBottomSheet';
import { formatDurationCompact, formatMinutesCompact, useTranslation } from '../../i18n';

const EMPTY_CUSTOM_TAGS: CustomTag[] = [];

function createTaskSwipeController(panX: Animated.Value) {
  let swipeThreshold: 'left' | 'right' | null = null;
  let onToggleHandler: (source: 'checkbox' | 'swipe') => void = () => {};
  let onDeleteHandler: (task: DailyTask) => void = () => {};
  let currentTask: DailyTask | null = null;

  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, gestureState) => {
      return Math.abs(gestureState.dx) > 16 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.4;
    },
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: () => {
      swipeThreshold = null;
    },
    onPanResponderMove: (_, gestureState) => {
      const rawDx = gestureState.dx;
      const clamped =
        rawDx > 95
          ? 95 + (rawDx - 95) * 0.25
          : rawDx < -95
          ? -95 + (rawDx + 95) * 0.25
          : rawDx;
      panX.setValue(clamped);

      if (rawDx > 78 && swipeThreshold !== 'right') {
        swipeThreshold = 'right';
        hapticSelection();
      } else if (rawDx < -78 && swipeThreshold !== 'left') {
        swipeThreshold = 'left';
        hapticSelection();
      } else if (Math.abs(rawDx) <= 70 && swipeThreshold !== null) {
        swipeThreshold = null;
      }
    },
    onPanResponderRelease: (_, gestureState) => {
      swipeThreshold = null;
      if (gestureState.dx > 78) {
        onToggleHandler('swipe');
      } else if (gestureState.dx < -78 && currentTask) {
        playSoftSwoosh();
        hapticWarning();
        onDeleteHandler(currentTask);
      }
      Animated.spring(panX, {
        toValue: 0,
        damping: 20,
        stiffness: 240,
        mass: 0.7,
        useNativeDriver: true,
      }).start();
    },
    onPanResponderTerminate: () => {
      swipeThreshold = null;
      Animated.spring(panX, {
        toValue: 0,
        damping: 20,
        stiffness: 240,
        useNativeDriver: true,
      }).start();
    },
  });

  return {
    panHandlers: panResponder.panHandlers,
    updateHandlers: (cfg: {
      onToggle: (source: 'checkbox' | 'swipe') => void;
      onDelete: (task: DailyTask) => void;
      task: DailyTask;
    }) => {
      onToggleHandler = cfg.onToggle;
      onDeleteHandler = cfg.onDelete;
      currentTask = cfg.task;
    },
  };
}

interface TaskCardProps {
  task: DailyTask;
  theme: ThemeColors;
  customTags?: CustomTag[];
  onToggle: (taskId: string, options?: { skipSound?: boolean }) => void;
  onDelete: (task: DailyTask) => void;
  onEdit?: (task: DailyTask) => void;
  onTogglePin?: (taskId: string) => void;
  onDeferTask?: (taskId: string) => void;
  onToggleSubtask?: (taskId: string, subtaskId: string) => void;
  onStartFocus?: (task: { id: string; title: string }) => void;
}

export const TaskCard = memo(function TaskCard({
  task,
  theme,
  customTags = EMPTY_CUSTOM_TAGS,
  onToggle,
  onDelete,
  onEdit,
  onTogglePin,
  onDeferTask,
  onToggleSubtask,
  onStartFocus,
}: TaskCardProps) {
  const { t, language } = useTranslation();
  const reducedMotion = useReducedMotion();
  const [isSubtasksExpanded, setIsSubtasksExpanded] = useState(false);
  const [isNoteExpanded, setIsNoteExpanded] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const tagConfig = task.tag ? resolveTagConfig(task.tag, customTags, language) : null;
  const trimmedNote = task.notes?.trim() ?? '';
  const hasNote = trimmedNote.length > 0;

  // Extract link if task contains a valid http/https URL
  const linkInfo = useMemo(() => {
    const match = task.title.match(/(?:^|\s)(https?:\/\/[^\s]+|www\.[^\s]+)/i);
    if (!match) return null;
    const raw = match[1].replace(/[.,)]+$/, '');
    const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return null;
      }
      if (!parsed.hostname.includes('.')) {
        return null;
      }
      const host = parsed.hostname.replace(/^www\./, '');
      return { url: parsed.toString(), displayLabel: host || t('common.link') };
    } catch {
      return null;
    }
  }, [task.title, t]);

  // Entrance, press, and checkmark micro-animations
  const [enterAnim] = useState(() => new Animated.Value(reducedMotion ? 1 : 0));
  const [checkScale] = useState(() => new Animated.Value(1));
  const [cardScale] = useState(() => new Animated.Value(1));
  const [panX] = useState(() => new Animated.Value(0));
  const [swipeController] = useState(() => createTaskSwipeController(panX));

  useEffect(() => {
    if (reducedMotion) {
      enterAnim.setValue(1);
      return;
    }
    Animated.spring(enterAnim, {
      toValue: 1,
      damping: 22,
      mass: 0.7,
      stiffness: 210,
      useNativeDriver: true,
    }).start();
  }, [enterAnim, reducedMotion]);

  const triggerCheckBounce = useCallback(() => {
    if (reducedMotion) return;
    Animated.sequence([
      Animated.timing(checkScale, { toValue: 0.78, duration: 65, useNativeDriver: true }),
      Animated.spring(checkScale, { toValue: 1, friction: 3.8, tension: 90, useNativeDriver: true }),
    ]).start();
  }, [checkScale, reducedMotion]);

  const handleToggleFromGesture = useCallback(
    (source: 'checkbox' | 'swipe') => {
      triggerCheckBounce();
      const skipSound = source === 'swipe';
      if (skipSound) {
        playSoftSwoosh();
        hapticSuccess();
      } else if (!task.isCompleted) {
        playBambooTap();
        hapticSuccess();
      } else {
        hapticLight();
      }
      onToggle(task.taskId, { skipSound });
    },
    [onToggle, task.isCompleted, task.taskId, triggerCheckBounce]
  );

  useEffect(() => {
    swipeController.updateHandlers({
      onToggle: handleToggleFromGesture,
      onDelete,
      task,
    });
  }, [handleToggleFromGesture, onDelete, swipeController, task]);

  const handleCardPressIn = () => {
    if (!onEdit || reducedMotion) return;
    Animated.spring(cardScale, { toValue: 0.985, ...PRESS_SPRING_CONFIG }).start();
  };

  const handleCardPressOut = () => {
    if (!onEdit || reducedMotion) return;
    Animated.spring(cardScale, { toValue: 1, ...PRESS_SPRING_CONFIG }).start();
  };

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

  const enterTranslateY = enterAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-12, 0],
  });

  const enterScale = enterAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.96, 1],
  });

  const enterOpacity = enterAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <Animated.View
      style={[
        styles.swipeContainer,
        {
          opacity: enterOpacity,
          transform: [{ translateY: enterTranslateY }, { scale: enterScale }],
        },
      ]}
    >
      {/* Background Swipe Indicators (Hidden at rest, reveals on swipe) */}
      <View style={styles.swipeBackground} pointerEvents="none">
        <Animated.View style={[styles.swipeActionLeft, { opacity: swipeOpacityLeft }]}>
          <Ionicons name="checkmark-circle" size={22} color={theme.success} />
          <Text style={[styles.swipeActionText, { color: theme.success }]}>{t('tasks.swipeDone')}</Text>
        </Animated.View>
        <Animated.View style={[styles.swipeActionRight, { opacity: swipeOpacityRight }]}>
          <Text style={[styles.swipeActionDeleteText, { color: theme.danger }]}>{t('tasks.swipeDelete')}</Text>
          <Ionicons name="trash-outline" size={20} color={theme.danger} />
        </Animated.View>
      </View>

      {/* Foreground Draggable Card */}
      <Animated.View
        {...swipeController.panHandlers}
        style={[
          styles.card,
          {
            backgroundColor: theme.card,
            borderColor: task.isCompleted ? theme.border : (task.isPinned ? theme.warning : theme.border),
            borderWidth: task.isPinned && !task.isCompleted ? 1.5 : 1,
            transform: [{ translateX: panX }, { scale: cardScale }],
          },
        ]}
      >
        {/* Pinned Top Banner */}
        {task.isPinned && !task.isCompleted && (
          <View style={styles.pinnedBanner}>
            <Ionicons name="star" size={12} color={theme.warning} />
            <Text style={[styles.pinnedBannerText, { color: theme.warning }]}>{t('tasks.focusOfTheDay')}</Text>
          </View>
        )}

        <View style={styles.cardMainRow}>
          {/* Checkbox */}
          <Animated.View style={{ transform: [{ scale: checkScale }] }}>
            <TouchableOpacity
              style={[
                styles.checkbox,
                {
                  borderColor: task.isCompleted ? theme.primary : theme.textDim,
                  backgroundColor: task.isCompleted ? theme.primary : 'transparent',
                },
              ]}
              onPress={() => handleToggleFromGesture('checkbox')}
              activeOpacity={0.7}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: task.isCompleted }}
              accessibilityLabel={t(
                task.isCompleted ? 'tasks.a11yMarkIncomplete' : 'tasks.a11yMarkCompleted',
                { title: task.title }
              )}
            >
              {task.isCompleted && <Ionicons name="checkmark" size={14} color={theme.onPrimary} />}
            </TouchableOpacity>
          </Animated.View>

          {/* Content */}
          <Pressable
            style={styles.content}
            onPressIn={handleCardPressIn}
            onPressOut={handleCardPressOut}
            onPress={() => {
              if (onEdit) {
                hapticLight();
                onEdit(task);
              }
            }}
            disabled={!onEdit}
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
              ellipsizeMode="tail"
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
                  <Text style={[styles.badgeText, { color: tagConfig.color }]} numberOfLines={1}>
                    {tagConfig.label}
                  </Text>
                </View>
              )}

              {task.recurrence !== 'none' && (
                <View style={[styles.badge, { backgroundColor: theme.surfaceMuted, flexDirection: 'row', alignItems: 'center', gap: 3 }]}>
                  <Ionicons name="repeat-outline" size={10} color={theme.accent || theme.primary} />
                  <Text style={[styles.badgeText, { color: theme.accent || theme.primary }]} numberOfLines={1}>
                    {t(`tasks.recurrence.${task.recurrence}`)}
                  </Text>
                </View>
              )}

              {/* Focus Time Badge */}
              {task.focusedSeconds && task.focusedSeconds > 0 ? (
                <View style={[styles.badge, { backgroundColor: theme.primaryLight, flexDirection: 'row', alignItems: 'center', gap: 3 }]}>
                  <Ionicons name="timer-outline" size={10} color={theme.primary} />
                  <Text style={[styles.badgeText, styles.tabularText, { color: theme.primary }]} numberOfLines={1}>
                    {formatDurationCompact(task.focusedSeconds, language)}
                  </Text>
                </View>
              ) : null}

              {/* Estimated Duration Badge */}
              {task.estimatedMinutes && task.estimatedMinutes > 0 ? (
                <View style={[styles.badge, { backgroundColor: theme.surfaceMuted, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.border, flexDirection: 'row', alignItems: 'center', gap: 3 }]}>
                  <Ionicons name="time-outline" size={10} color={theme.textDim} />
                  <Text style={[styles.badgeText, styles.tabularText, { color: theme.textDim }]} numberOfLines={1}>
                    {formatMinutesCompact(task.estimatedMinutes, language)}
                  </Text>
                </View>
              ) : null}

              {/* Reminder Time Badge */}
              {task.reminderTime ? (
                <View style={[styles.badge, { backgroundColor: theme.surfaceMuted, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.border, flexDirection: 'row', alignItems: 'center', gap: 3 }]}>
                  <Ionicons name="notifications-outline" size={10} color={theme.primary} />
                  <Text style={[styles.badgeText, styles.tabularText, { color: theme.textDim }]} numberOfLines={1}>
                    {task.reminderTime}
                  </Text>
                </View>
              ) : null}

              {/* Note Indicator Badge */}
              {hasNote && (
                <TouchableOpacity
                  style={[
                    styles.badge,
                    {
                      backgroundColor: isNoteExpanded ? theme.primaryLight : theme.surfaceMuted,
                      borderWidth: StyleSheet.hairlineWidth,
                      borderColor: isNoteExpanded ? theme.primary : theme.border,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 3,
                    },
                  ]}
                  onPress={(e) => {
                    e.stopPropagation();
                    hapticLight();
                    animateLayout();
                    setIsNoteExpanded(prev => !prev);
                  }}
                  activeOpacity={0.7}
                  hitSlop={{ top: 12, bottom: 12, left: 6, right: 6 }}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: isNoteExpanded }}
                  accessibilityLabel={t('tasks.a11yToggleNote')}
                >
                  <Ionicons
                    name="document-text-outline"
                    size={10}
                    color={isNoteExpanded ? theme.primary : theme.textDim}
                  />
                  <Text
                    style={[
                      styles.badgeText,
                      { color: isNoteExpanded ? theme.primary : theme.textDim },
                    ]}
                    numberOfLines={1}
                  >
                    {t('tasks.noteBadge')}
                  </Text>
                </TouchableOpacity>
              )}

              {/* Quick Link Badge */}
              {linkInfo && (
                <TouchableOpacity
                  style={[styles.badge, { backgroundColor: theme.primaryLight, borderColor: theme.primary, borderWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', gap: 3, maxWidth: 145 }]}
                  onPress={(e) => {
                    e.stopPropagation();
                    hapticLight();
                    Linking.openURL(linkInfo.url).catch(() => {});
                  }}
                  activeOpacity={0.7}
                  hitSlop={{ top: 12, bottom: 12, left: 6, right: 6 }}
                  accessibilityRole="link"
                  accessibilityLabel={linkInfo.displayLabel}
                >
                  <Ionicons name="link-outline" size={11} color={theme.primary} />
                  <Text style={[styles.badgeText, { color: theme.primary, fontWeight: '600', flexShrink: 1 }]} numberOfLines={1} ellipsizeMode="middle">
                    {linkInfo.displayLabel}
                  </Text>
                </TouchableOpacity>
              )}

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
                    animateLayout();
                    setIsSubtasksExpanded(!isSubtasksExpanded);
                  }}
                  activeOpacity={0.7}
                  hitSlop={{ top: 12, bottom: 12, left: 6, right: 6 }}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: isSubtasksExpanded }}
                  accessibilityLabel={`${completedSubtasksCount}/${subtasks.length}`}
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
          </Pressable>

          {/* Actions */}
          <View style={styles.actionsRow}>
            {!task.isCompleted ? (
              <>
                {/* Quick Focus Button */}
                {onStartFocus && (
                  <TouchableOpacity
                    style={[styles.focusActionBtn, { backgroundColor: theme.primaryLight }]}
                    onPress={() => {
                      hapticSuccess();
                      onStartFocus({ id: task.taskId, title: task.title });
                    }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityRole="button"
                    accessibilityLabel={t('tasks.a11yFocusTask')}
                  >
                    <Ionicons name="timer-outline" size={15} color={theme.primary} />
                  </TouchableOpacity>
                )}

                {/* More Options Button */}
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => {
                    hapticLight();
                    setIsMenuOpen(true);
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel={t('tasks.a11yTaskOptions')}
                >
                  <Ionicons name="ellipsis-horizontal" size={17} color={theme.textDim} />
                </TouchableOpacity>
              </>
            ) : (
              /* Completed Task: ONLY Delete */
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => {
                  hapticWarning();
                  onDelete(task);
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel={t('tasks.a11yDeleteCompleted')}
              >
                <Ionicons name="trash-outline" size={16} color={theme.textDim} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Mobile Task Actions Bottom Sheet Modal */}
        <SwipeableBottomSheet visible={isMenuOpen} onClose={() => setIsMenuOpen(false)} theme={theme} maxHeight="75%">
          <TaskActionsSheetBody
            task={task}
            theme={theme}
            onTogglePin={onTogglePin}
            onDeferTask={onDeferTask}
            onEdit={onEdit}
            onDelete={onDelete}
            onImmediateClose={() => setIsMenuOpen(false)}
          />
        </SwipeableBottomSheet>

        {/* Expandable Note Preview */}
        {isNoteExpanded && hasNote && (
          <View style={[styles.notePreviewBox, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}>
            <Text style={[styles.notePreviewText, { color: theme.textMuted }]}>
              {trimmedNote}
            </Text>
          </View>
        )}

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
                hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: sub.isCompleted }}
                accessibilityLabel={sub.title}
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
                  {sub.isCompleted && <Ionicons name="checkmark" size={10} color={theme.onPrimary} />}
                </View>
                <Text
                  style={[
                    styles.subtaskTitle,
                    {
                      color: sub.isCompleted ? theme.textDim : theme.text,
                      textDecorationLine: sub.isCompleted ? 'line-through' : 'none',
                    },
                  ]}
                  numberOfLines={2}
                >
                  {sub.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </Animated.View>
    </Animated.View>
  );
});

function TaskActionsSheetBody({
  task,
  theme,
  onTogglePin,
  onDeferTask,
  onEdit,
  onDelete,
  onImmediateClose,
}: {
  task: DailyTask;
  theme: ThemeColors;
  onTogglePin?: (taskId: string) => void;
  onDeferTask?: (taskId: string) => void;
  onEdit?: (task: DailyTask) => void;
  onDelete: (task: DailyTask) => void;
  onImmediateClose: () => void;
}) {
  const { t } = useTranslation();
  const sheetClose = useBottomSheetClose();

  return (
    <>
      <View style={[styles.menuHeader, { borderBottomColor: theme.border }]}>
        <Text style={[styles.menuTitle, { color: theme.text }]} numberOfLines={1} ellipsizeMode="tail">
          {task.title}
        </Text>
        <CloseButton theme={theme} accessibilityLabel={t('common.close')} />
      </View>

      {onTogglePin && (
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => {
            hapticLight();
            onTogglePin(task.taskId);
            sheetClose?.();
          }}
        >
          <Ionicons
            name={task.isPinned ? 'star' : 'star-outline'}
            size={18}
            color={task.isPinned ? theme.warning : theme.text}
          />
          <Text style={[styles.menuItemText, { color: theme.text }]}>
            {task.isPinned ? t('tasks.menuUnpinFocus') : t('tasks.menuPinFocus')}
          </Text>
        </TouchableOpacity>
      )}

      {onDeferTask && !task.isCompleted && (
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => {
            hapticLight();
            onDeferTask(task.taskId);
            sheetClose?.();
          }}
        >
          <Ionicons name="arrow-forward-circle-outline" size={18} color={theme.text} />
          <Text style={[styles.menuItemText, { color: theme.text }]}>{t('tasks.menuDeferTomorrow')}</Text>
        </TouchableOpacity>
      )}

      {onEdit && (
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => {
            hapticLight();
            onImmediateClose();
            onEdit(task);
          }}
        >
          <Ionicons name="pencil-outline" size={18} color={theme.text} />
          <Text style={[styles.menuItemText, { color: theme.text }]}>{t('tasks.menuEditTask')}</Text>
        </TouchableOpacity>
      )}

      <View style={[styles.menuDivider, { backgroundColor: theme.border }]} />

      <TouchableOpacity
        style={styles.menuItem}
        onPress={() => {
          hapticWarning();
          onImmediateClose();
          onDelete(task);
        }}
      >
        <Ionicons name="trash-outline" size={18} color={theme.danger} />
        <Text style={[styles.menuItemText, { color: theme.danger, fontWeight: '600' }]}>{t('tasks.menuDeleteTask')}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.cancelBtn, { backgroundColor: theme.surfaceMuted }]}
        onPress={() => {
          hapticLight();
          sheetClose?.();
        }}
      >
        <Text style={[styles.cancelBtnText, { color: theme.textMuted }]}>{t('common.cancel')}</Text>
      </TouchableOpacity>
    </>
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
  tabularText: {
    fontVariant: ['tabular-nums'],
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
    fontVariant: ['tabular-nums'],
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
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtn: {
    minWidth: 32,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
  },
  subtasksList: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  notePreviewBox: {
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  notePreviewText: {
    fontSize: 12,
    lineHeight: 17,
  },
  subtaskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 40,
    paddingVertical: 4,
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
    flex: 1,
    fontSize: 13,
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 6,
  },
  menuTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  menuItemText: {
    fontSize: 15,
    fontWeight: '500',
  },
  menuDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 4,
  },
  cancelBtn: {
    marginTop: 8,
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
