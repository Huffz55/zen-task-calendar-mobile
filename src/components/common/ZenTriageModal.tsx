import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { Task } from '../../types';
import { ThemeColors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { hapticLight, hapticSuccess, hapticWarning } from '../../hooks/useHaptics';
import { playWaterDrop, playBambooTap, playSoftSwoosh } from '../../services/audio/audioService';

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
  const currentTask = inboxTasks[0];

  const handleDecision = (taskId: string, decision: 'today' | 'someday' | 'delete') => {
    if (decision === 'today') {
      playWaterDrop();
      hapticSuccess();
    } else if (decision === 'delete') {
      playSoftSwoosh();
      hapticWarning();
    } else {
      playBambooTap();
      hapticLight();
    }
    onTriageDecision(taskId, decision);
  };

  const handleAdd = () => {
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    playWaterDrop();
    hapticLight();
    onQuickAddTask(trimmed);
    setNewTitle('');
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={[styles.iconBox, { backgroundColor: theme.primaryLight }]}>
                <Ionicons name="file-tray-full-outline" size={20} color={theme.primary} />
              </View>
              <View>
                <View style={styles.titleRow}>
                  <Text style={[styles.title, { color: theme.text }]}>Inbox & Triage</Text>
                  <View style={[styles.badge, { backgroundColor: theme.primaryLight }]}>
                    <Text style={[styles.badgeText, { color: theme.primary }]}>
                      {inboxTasks.length} Pending
                    </Text>
                  </View>
                </View>
                <Text style={[styles.subtitle, { color: theme.textDim }]}>
                  Clear your mind first, then schedule what actually matters today.
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={20} color={theme.textDim} />
            </TouchableOpacity>
          </View>

          {/* Quick Capture Input */}
          <View style={[styles.inputRow, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}>
            <TextInput
              style={[styles.input, { color: theme.text }]}
              value={newTitle}
              onChangeText={setNewTitle}
              placeholder="Capture a quick thought or task..."
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
            >
              <Ionicons name="arrow-down" size={16} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Focused Task / Empty State */}
          {inboxTasks.length > 0 && currentTask ? (
            <View style={styles.cardContainer}>
              <View style={[styles.taskCard, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}>
                <Text style={[styles.taskOrder, { color: theme.textDim }]}>
                  NEXT IN QUEUE • {inboxTasks.length} LEFT
                </Text>
                <Text style={[styles.taskTitle, { color: theme.text }]}>
                  {currentTask.title}
                </Text>
              </View>

              {/* Action Buttons */}
              <View style={styles.actionsGrid}>
                {/* Do Today */}
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: theme.primaryLight, borderColor: theme.border }]}
                  onPress={() => handleDecision(currentTask.id, 'today')}
                  activeOpacity={0.7}
                >
                  <Ionicons name="checkmark-circle-outline" size={22} color={theme.primary} />
                  <Text style={[styles.actionBtnText, { color: theme.primary }]}>Today</Text>
                  <Text style={[styles.actionBtnHint, { color: theme.textDim }]}>Schedule now</Text>
                </TouchableOpacity>

                {/* Someday / Wait */}
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}
                  onPress={() => handleDecision(currentTask.id, 'someday')}
                  activeOpacity={0.7}
                >
                  <Ionicons name="time-outline" size={22} color={theme.textDim} />
                  <Text style={[styles.actionBtnText, { color: theme.text }]}>Someday</Text>
                  <Text style={[styles.actionBtnHint, { color: theme.textDim }]}>Keep in inbox</Text>
                </TouchableOpacity>

                {/* Delete */}
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: '#fee2e2', borderColor: '#fca5a5' }]}
                  onPress={() => handleDecision(currentTask.id, 'delete')}
                  activeOpacity={0.7}
                >
                  <Ionicons name="trash-outline" size={22} color="#dc2626" />
                  <Text style={[styles.actionBtnText, { color: '#dc2626' }]}>Delete</Text>
                  <Text style={[styles.actionBtnHint, { color: '#ef4444' }]}>Discard</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIconCircle, { backgroundColor: theme.primaryLight }]}>
                <Ionicons name="sparkles-outline" size={26} color={theme.primary} />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>Inbox Zero</Text>
              <Text style={[styles.emptySubtitle, { color: theme.textDim }]}>
                All captured tasks are sorted. Your mind is clear and ready to focus.
              </Text>
            </View>
          )}

          {/* Footer Close */}
          <TouchableOpacity
            style={[styles.footerBtn, { backgroundColor: theme.primaryLight }]}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Text style={[styles.footerBtnText, { color: theme.primary }]}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    padding: 20,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
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
  actionBtnHint: {
    fontSize: 9,
    marginTop: 2,
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
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  footerBtn: {
    marginTop: 16,
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
