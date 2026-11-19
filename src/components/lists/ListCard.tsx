import React, { memo, useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Animated } from 'react-native';
import { CustomList } from '../../types';
import { ThemeColors } from '../../constants/colors';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { hapticLight, hapticWarning } from '../../hooks/useHaptics';
import { animateLayout } from '../../utils/animations';

interface ListCardProps {
  list: CustomList;
  theme: ThemeColors;
  onToggleItem: (listId: string, itemId: string) => void;
  onAddItem: (listId: string, text: string) => void;
  onDeleteItem: (listId: string, itemId: string) => void;
  onDeleteList: (listId: string) => void;
  onMoveFolder?: (list: CustomList) => void;
}

export const ListCard = memo(function ListCard({
  list,
  theme,
  onToggleItem,
  onAddItem,
  onDeleteItem,
  onDeleteList,
  onMoveFolder,
}: ListCardProps) {
  const [newItemText, setNewItemText] = useState('');
  const [isExpanded, setIsExpanded] = useState(true);

  const totalItems = list.items.length;
  const completedCount = list.items.filter(i => i.completed).length;
  const progress = totalItems > 0 ? completedCount / totalItems : 0;

  const enterAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(enterAnim, {
      toValue: 1,
      damping: 22,
      mass: 0.75,
      stiffness: 200,
      useNativeDriver: true,
    }).start();
  }, [enterAnim]);

  const handleAddItem = () => {
    if (!newItemText.trim()) return;
    hapticLight();
    onAddItem(list.id, newItemText.trim());
    setNewItemText('');
  };

  const translateY = enterAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-10, 0],
  });

  return (
    <Animated.View
      style={[
        styles.card,
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
          opacity: enterAnim,
          transform: [{ translateY }],
        },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.titleRow}
          onPress={() => {
            hapticLight();
            animateLayout();
            setIsExpanded(!isExpanded);
          }}
          activeOpacity={0.7}
          hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
        >
          <Ionicons
            name={isExpanded ? 'chevron-down' : 'chevron-forward'}
            size={18}
            color={theme.primary}
          />
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={2} ellipsizeMode="tail">
            {list.title}
          </Text>
          <View style={[styles.countBadge, { backgroundColor: theme.surfaceMuted }]}>
            <Text style={[styles.countText, { color: theme.textDim }]}>
              {completedCount}/{totalItems}
            </Text>
          </View>
        </TouchableOpacity>

        <View style={styles.headerActions}>
          {onMoveFolder && (
            <TouchableOpacity
              onPress={() => {
                hapticLight();
                onMoveFolder(list);
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={{ padding: 4 }}
            >
              <Ionicons name="folder-outline" size={16} color={theme.textDim} />
            </TouchableOpacity>
          )}

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

      {list.folder && (
        <View style={[styles.folderTagRow]}>
          <View style={[styles.folderBadge, { backgroundColor: theme.primaryLight }]}>
            <Ionicons name="folder-outline" size={10} color={theme.primary} />
            <Text style={[styles.folderBadgeText, { color: theme.primary }]} numberOfLines={1} ellipsizeMode="tail">
              {list.folder}
            </Text>
          </View>
        </View>
      )}

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
                hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: item.completed }}
                accessibilityLabel={item.text}
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
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityRole="button"
                accessibilityLabel={`Delete ${item.text}`}
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
    </Animated.View>
  );
});

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
    flexShrink: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    flexShrink: 1,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    flexShrink: 0,
  },
  folderTagRow: {
    flexDirection: 'row',
    marginTop: 6,
    marginLeft: 26,
  },
  folderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  folderBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  countText: {
    fontSize: 11,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
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
