import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { Task } from '../../types';
import { ThemeColors, withAlpha } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { hapticLight, hapticSuccess, hapticWarning } from '../../hooks/useHaptics';
import { playWaterDrop, playBambooTap, playSoftSwoosh } from '../../services/audio/audioService';
import { animateLayout } from '../../utils/animations';
import { BottomSheetScrollView, SwipeableBottomSheet } from './SwipeableBottomSheet';

interface ZenTriageModalProps {
  visible: boolean;
  theme: ThemeColors;
  inboxTasks: Task[];
  onTriageDecision: (taskId: string, decision: 'today' | 'someday' | 'delete') => void;
  onQuickAddTask: (title: string) => void;
  onClose: () => void;
}

export function ZenTriageModal({
  visible,
  theme,
  inboxTasks,
  onTriageDecision,
  onQuickAddTask,
  onClose,
}: ZenTriageModalProps) {
  const [newTitle, setNewTitle] = useState('');
  const [skippedIds, setSkippedIds] = useState<string[]>([]);

  const handleClose = () => {
    setSkippedIds([]);
    onClose();
  };

  const pendingTasks = useMemo(
    () => inboxTasks.filter(t => !skippedIds.includes(t.id)),
    [inboxTasks, skippedIds]
  );
  const currentTask = pendingTasks[0];

  const handleDecision = (taskId: string, decision: 'today' | 'someday' | 'delete') => {
    animateLayout();
    if (decision === 'today') {
      playWaterDrop();
      hapticSuccess();
    } else if (decision === 'delete') {
      playSoftSwoosh();
      hapticWarning();
    } else {
      playBambooTap();
      hapticLight();
      setSkippedIds(prev => (prev.includes(taskId) ? prev : [...prev, taskId]));
    }
    onTriageDecision(taskId, decision);
  };

  const handleAdd = () => {
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    playWaterDrop();
    hapticLight();
    animateLayout();
    onQuickAddTask(trimmed);
    setNewTitle('');
  };

  return (
    <SwipeableBottomSheet visible={visible} onClose={handleClose} theme={theme} maxHeight="85%" useKeyboardAvoiding>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.iconBox, { backgroundColor: theme.primaryLight }]}>
            <Ionicons name="file-tray-full-outline" size={20} color={theme.primary} />
          </View>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
              Inbox
            </Text>
            <View style={[styles.badge, { backgroundColor: theme.primaryLight }]}>
              <Text style={[styles.badgeText, { color: theme.primary }]}>
                {pendingTasks.length}
              </Text>
            </View>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => {
            hapticLight();
            handleClose();
          }}
          style={styles.closeBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Close inbox"
        >
          <Ionicons name="close" size={20} color={theme.textDim} />
        </TouchableOpacity>
      </View>

      <BottomSheetScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        {/* Quick Capture Input */}
        <View style={[styles.inputRow, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}>
          <TextInput
            style={[styles.input, { color: theme.text }]}
            value={newTitle}
            onChangeText={setNewTitle}
            placeholder="Add to inbox"
            placeholderTextColor={theme.textDim}
            onSubmitEditing={handleAdd}
            returnKeyType="done"
          />
          <TouchableOpacity
            onPress={handleAdd}
            disabled={!newTitle.trim()}
            style={[
              styles.addBtn,
              { backgroundColor: theme.primary, opacity: newTitle.trim() ? 1 : 0.5 },
            ]}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Ionicons name="arrow-down" size={16} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Focused Task / Empty State */}
        {pendingTasks.length > 0 && currentTask ? (
          <View style={styles.cardContainer}>
            <View style={[styles.taskCard, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}>
              <Text style={[styles.taskOrder, { color: theme.textDim }]}>
                {pendingTasks.length} REMAINING
              </Text>
              <Text style={[styles.taskTitle, { color: theme.text }]} numberOfLines={4} ellipsizeMode="tail">
                {currentTask.title}
              </Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionsGrid}>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: theme.primaryLight, borderColor: theme.border }]}
                onPress={() => handleDecision(currentTask.id, 'today')}
                activeOpacity={0.75}
              >
                <Ionicons name="checkmark-circle-outline" size={22} color={theme.primary} />
                <Text style={[styles.actionBtnText, { color: theme.primary }]}>Today</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}
                onPress={() => handleDecision(currentTask.id, 'someday')}
                activeOpacity={0.75}
              >
                <Ionicons name="time-outline" size={22} color={theme.textDim} />
                <Text style={[styles.actionBtnText, { color: theme.text }]}>Later</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  {
                    backgroundColor: withAlpha(theme.danger, theme.isDark ? 0.16 : 0.1),
                    borderColor: withAlpha(theme.danger, 0.35),
                  },
                ]}
                onPress={() => handleDecision(currentTask.id, 'delete')}
                activeOpacity={0.75}
              >
                <Ionicons name="trash-outline" size={22} color={theme.danger} />
                <Text style={[styles.actionBtnText, { color: theme.danger }]}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIconCircle, { backgroundColor: theme.primaryLight }]}>
              <Ionicons name="checkmark-done-outline" size={26} color={theme.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>
              {inboxTasks.length > 0 ? 'Caught up for now' : 'Inbox Empty'}
            </Text>
            {inboxTasks.length > 0 && (
              <Text style={[styles.emptySubtitle, { color: theme.textMuted }]}>
                {inboxTasks.length} {inboxTasks.length === 1 ? 'item' : 'items'} saved for later
              </Text>
            )}
          </View>
        )}
      </BottomSheetScrollView>

      {/* Footer Close */}
      <TouchableOpacity
        style={[styles.footerBtn, { backgroundColor: theme.primaryLight }]}
        onPress={() => {
          hapticLight();
          handleClose();
        }}
        activeOpacity={0.75}
      >
        <Text style={[styles.footerBtnText, { color: theme.primary }]}>Done</Text>
      </TouchableOpacity>
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    paddingRight: 8,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  closeBtn: {
    padding: 4,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 16,
  },
  input: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 8,
  },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContainer: {
    marginVertical: 8,
  },
  taskCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
  },
  taskOrder: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 4,
    fontVariant: ['tabular-nums'],
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  emptyContainer: {
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
  },
  footerBtn: {
    marginTop: 14,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
