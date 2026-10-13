import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { CustomList } from '../types';
import { ThemeColors } from '../constants/colors';
import { Header } from '../components/common/Header';
import { ListCard } from '../components/lists/ListCard';
import { AddListModal } from '../components/lists/AddListModal';
import { Ionicons } from '@expo/vector-icons';
import { hapticLight } from '../hooks/useHaptics';

interface ListsScreenProps {
  theme: ThemeColors;
  currentStreak: number;
  lists: CustomList[];
  onAddList: (title: string) => void;
  onDeleteList: (listId: string) => void;
  onAddItem: (listId: string, text: string) => void;
  onDeleteItem: (listId: string, itemId: string) => void;
  onToggleItem: (listId: string, itemId: string) => void;
  onOpenThemeModal: () => void;
  onOpenSettingsModal?: () => void;
  onOpenSyncModal?: () => void;
}

export function ListsScreen({
  theme,
  currentStreak,
  lists,
  onAddList,
  onDeleteList,
  onAddItem,
  onDeleteItem,
  onToggleItem,
  onOpenThemeModal,
  onOpenSettingsModal,
  onOpenSyncModal,
}: ListsScreenProps) {
  const [isAddListOpen, setIsAddListOpen] = useState(false);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Header
        theme={theme}
        currentStreak={currentStreak}
        onOpenThemeModal={onOpenThemeModal}
        onOpenSettingsModal={onOpenSettingsModal}
        onOpenSyncModal={onOpenSyncModal}
        title="Custom Lists"
        subtitle="Notes & Checklists"
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Top Add List Button */}
        <TouchableOpacity
          style={[styles.newListBar, { backgroundColor: theme.surface, borderColor: theme.border }]}
          onPress={() => {
            hapticLight();
            setIsAddListOpen(true);
          }}
          activeOpacity={0.7}
        >
          <View style={styles.newListLeft}>
            <View style={[styles.plusCircle, { backgroundColor: theme.primaryLight }]}>
              <Ionicons name="add" size={20} color={theme.primary} />
            </View>
            <Text style={[styles.newListText, { color: theme.text }]}>Create New List...</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={theme.textDim} />
        </TouchableOpacity>

        {/* Lists Container */}
        {lists.length > 0 ? (
          lists.map(list => (
            <ListCard
              key={list.id}
              list={list}
              theme={theme}
              onToggleItem={onToggleItem}
              onAddItem={onAddItem}
              onDeleteItem={onDeleteItem}
              onDeleteList={onDeleteList}
            />
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📝</Text>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No lists yet</Text>
            <Text style={[styles.emptySubtitle, { color: theme.textDim }]}>
              You can create custom checklists for shopping, projects, or personal goals.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Add List Modal */}
      <AddListModal
        visible={isAddListOpen}
        theme={theme}
        onClose={() => setIsAddListOpen(false)}
        onAddList={onAddList}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 110,
  },
  newListBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 16,
  },
  newListLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  plusCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newListText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 70,
    paddingHorizontal: 20,
  },
  emptyIcon: {
    fontSize: 44,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
  },
});
