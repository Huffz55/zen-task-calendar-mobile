import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { CustomList } from '../../types';
import { ThemeColors } from '../../constants/colors';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { hapticLight, hapticWarning } from '../../hooks/useHaptics';

interface ListCardProps {
  list: CustomList;
  theme: ThemeColors;
  onToggleItem: (listId: string, itemId: string) => void;
  onAddItem: (listId: string, text: string) => void;
  onDeleteItem: (listId: string, itemId: string) => void;
  onDeleteList: (listId: string) => void;
}

export function ListCard({
  list,
  theme,
  onToggleItem,
  onAddItem,
  onDeleteItem,
  onDeleteList,
}: ListCardProps) {
  const [newItemText, setNewItemText] = useState('');
  const [isExpanded, setIsExpanded] = useState(true);

  const totalItems = list.items.length;
  const completedCount = list.items.filter(i => i.completed).length;
  const progress = totalItems > 0 ? completedCount / totalItems : 0;

  const handleAddItem = () => {
    if (!newItemText.trim()) return;
    hapticLight();
    onAddItem(list.id, newItemText.trim());
    setNewItemText('');
  };

  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.titleRow}
          onPress={() => setIsExpanded(!isExpanded)}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isExpanded ? 'chevron-down' : 'chevron-forward'}
            size={18}
            color={theme.primary}
          />
          <Text style={[styles.title, { color: theme.text }]}>{list.title}</Text>
          <View style={[styles.countBadge, { backgroundColor: theme.surfaceMuted }]}>
            <Text style={[styles.countText, { color: theme.textDim }]}>
              {completedCount}/{totalItems}
            </Text>
          </View>
        </TouchableOpacity>

        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => {
              hapticLight();
              router.push({ pathname: '/list/[id]', params: { id: list.id } });
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={{ padding: 4 }}
          >
            <Ionicons name="open-outline" size={17} color={theme.textDim} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              hapticWarning();
              onDeleteList(list.id);
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={{ padding: 4 }}
          >
            <Ionicons name="trash-outline" size={17} color={theme.textDim} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Progress Bar */}
      {totalItems > 0 && (
        <View style={[styles.progressBarBg, { backgroundColor: theme.surfaceMuted }]}>
          <View
            style={[
              styles.progressBarFill,
              {
                width: `${Math.round(progress * 100)}%`,
                backgroundColor: theme.primary,
              },
            ]}
          />
        </View>
      )}

      {/* Items List */}
      {isExpanded && (
        <View style={styles.itemsContainer}>
          {list.items.map(item => (
            <View key={item.id} style={styles.itemRow}>
              <TouchableOpacity
                style={[
                  styles.checkbox,
                  {
                    borderColor: item.completed ? theme.primary : theme.textDim,
                    backgroundColor: item.completed ? theme.primary : 'transparent',
                  },
                ]}
                onPress={() => {
                  hapticLight();
                  onToggleItem(list.id, item.id);
                }}
                activeOpacity={0.7}
              >
                {item.completed && <Ionicons name="checkmark" size={12} color="#ffffff" />}
              </TouchableOpacity>

              <Text
                style={[
                  styles.itemText,
                  {
                    color: item.completed ? theme.textDim : theme.text,
                    textDecorationLine: item.completed ? 'line-through' : 'none',
                  },
                ]}
              >
                {item.text}
              </Text>

              <TouchableOpacity
                onPress={() => {
                  hapticLight();
                  onDeleteItem(list.id, item.id);
                }}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Ionicons name="close" size={16} color={theme.textDim} />
              </TouchableOpacity>
            </View>
          ))}

          {/* Inline Add Item Input */}
          <View style={styles.addRow}>
            <TextInput
              style={[
                styles.addInput,
                {
                  backgroundColor: theme.surfaceMuted,
                  color: theme.text,
                  borderColor: theme.border,
                },
              ]}
              placeholder="+ Add an item..."
              placeholderTextColor={theme.textDim}
              value={newItemText}
              onChangeText={setNewItemText}
              returnKeyType="done"
              onSubmitEditing={handleAddItem}
            />
            {newItemText.trim().length > 0 && (
              <TouchableOpacity
                style={[styles.addBtn, { backgroundColor: theme.primary }]}
                onPress={handleAddItem}
              >
                <Ionicons name="arrow-up" size={16} color="#ffffff" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    marginBottom: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countText: {
    fontSize: 11,
    fontWeight: '600',
  },
  progressBarBg: {
    height: 4,
    borderRadius: 2,
    marginVertical: 12,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  itemsContainer: {
    marginTop: 6,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemText: {
    flex: 1,
    fontSize: 14,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  addInput: {
    flex: 1,
    fontSize: 13,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
