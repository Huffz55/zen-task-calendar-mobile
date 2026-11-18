import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CustomList } from '../types';
import { ThemeColors } from '../constants/colors';
import { Header } from '../components/common/Header';
import { ListCard } from '../components/lists/ListCard';
import { AddListModal } from '../components/lists/AddListModal';
import { BottomSheetScrollView, SwipeableBottomSheet } from '../components/common/SwipeableBottomSheet';
import { Ionicons } from '@expo/vector-icons';
import { hapticLight, hapticSelection } from '../hooks/useHaptics';
import { animateLayout } from '../utils/animations';
import { useSwipeTabNavigation } from '../hooks/useSwipeTabNavigation';

const DEFAULT_FOLDERS = ['Study', 'Work', 'Market'];
const CUSTOM_FOLDERS_KEY = '@noteapp_custom_folders';

interface ListsScreenProps {
  theme: ThemeColors;
  currentStreak: number;
  lists: CustomList[];
  onAddList: (title: string, folder?: string) => void;
  onUpdateListFolder?: (listId: string, folder?: string) => void;
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
  onUpdateListFolder,
  onDeleteList,
  onAddItem,
  onDeleteItem,
  onToggleItem,
  onOpenThemeModal,
  onOpenSettingsModal,
  onOpenSyncModal,
}: ListsScreenProps) {
  const [isAddListOpen, setIsAddListOpen] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<string>('ALL');
  const [savedFolders, setSavedFolders] = useState<string[]>(DEFAULT_FOLDERS);
  const [isAddFolderOpen, setIsAddFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [movingList, setMovingList] = useState<CustomList | null>(null);
  const swipeHandlers = useSwipeTabNavigation('lists');

  useEffect(() => {
    AsyncStorage.getItem(CUSTOM_FOLDERS_KEY).then(raw => {
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setSavedFolders(parsed);
          }
        } catch {
          // Keep default folders
        }
      }
    });
  }, []);

  const allFolders = useMemo(() => {
    const set = new Set<string>(savedFolders);
    lists.forEach(l => {
      if (l.folder && l.folder.trim()) set.add(l.folder.trim());
    });
    return Array.from(set);
  }, [savedFolders, lists]);

  const filteredLists = useMemo(() => {
    if (selectedFolder === 'ALL') return lists;
    return lists.filter(l => l.folder === selectedFolder);
  }, [lists, selectedFolder]);

  const handleCreateFolder = () => {
    const clean = newFolderName.trim();
    if (!clean) return;
    hapticLight();
    const updated = Array.from(new Set([...allFolders, clean]));
    setSavedFolders(updated);
    AsyncStorage.setItem(CUSTOM_FOLDERS_KEY, JSON.stringify(updated)).catch(() => {});
    setSelectedFolder(clean);
    setNewFolderName('');
    setIsAddFolderOpen(false);
  };

  const handleAddListWithFolder = (title: string, folder?: string) => {
    if (folder && !allFolders.includes(folder)) {
      const updated = Array.from(new Set([...allFolders, folder]));
      setSavedFolders(updated);
      AsyncStorage.setItem(CUSTOM_FOLDERS_KEY, JSON.stringify(updated)).catch(() => {});
    }
    onAddList(title, folder);
  };

  const handleMoveFolderRequest = useCallback((l: CustomList) => {
    setMovingList(l);
  }, []);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      {...swipeHandlers}
    >
      <Header
        theme={theme}
        currentStreak={currentStreak}
        onOpenThemeModal={onOpenThemeModal}
        onOpenSettingsModal={onOpenSettingsModal}
        onOpenSyncModal={onOpenSyncModal}
        title="Lists"
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={styles.scrollContent}
      >
        {/* Folders Grid */}
        <View style={styles.foldersSection}>
          <View style={styles.foldersGrid}>
            <TouchableOpacity
              style={[
                styles.folderCard,
                {
                  backgroundColor: selectedFolder === 'ALL' ? theme.primaryLight : theme.surface,
                  borderColor: selectedFolder === 'ALL' ? theme.primary : theme.border,
                },
              ]}
              onPress={() => {
                hapticSelection();
                animateLayout();
                setSelectedFolder('ALL');
              }}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityState={{ selected: selectedFolder === 'ALL' }}
            >
              <View style={styles.folderTopRow}>
                <Ionicons
                  name="layers-outline"
                  size={18}
                  color={selectedFolder === 'ALL' ? theme.primary : theme.textMuted}
                />
                <Text
                  style={[
                    styles.folderCount,
                    { color: selectedFolder === 'ALL' ? theme.primary : theme.textDim },
                  ]}
                >
                  {lists.length}
                </Text>
              </View>
              <Text
                style={[
                  styles.folderName,
                  { color: selectedFolder === 'ALL' ? theme.primary : theme.text },
                ]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                All
              </Text>
            </TouchableOpacity>

            {allFolders.map(folder => {
              const count = lists.filter(l => l.folder === folder).length;
              const isActive = selectedFolder === folder;
              return (
                <TouchableOpacity
                  key={folder}
                  style={[
                    styles.folderCard,
                    {
                      backgroundColor: isActive ? theme.primaryLight : theme.surface,
                      borderColor: isActive ? theme.primary : theme.border,
                    },
                  ]}
                  onPress={() => {
                    hapticSelection();
                    animateLayout();
                    setSelectedFolder(isActive ? 'ALL' : folder);
                  }}
                  activeOpacity={0.75}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isActive }}
                >
                  <View style={styles.folderTopRow}>
                    <Ionicons
                      name={isActive ? 'folder-open' : 'folder-outline'}
                      size={18}
                      color={isActive ? theme.primary : theme.textMuted}
                    />
                    <Text
                      style={[
                        styles.folderCount,
                        { color: isActive ? theme.primary : theme.textDim },
                      ]}
                    >
                      {count}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.folderName,
                      { color: isActive ? theme.primary : theme.text },
                    ]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {folder}
                  </Text>
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              style={[
                styles.folderCard,
                styles.newFolderCard,
                { backgroundColor: theme.surfaceMuted, borderColor: theme.border },
              ]}
              onPress={() => {
                hapticLight();
                setIsAddFolderOpen(true);
              }}
              activeOpacity={0.75}
            >
              <Ionicons name="add-circle-outline" size={18} color={theme.primary} />
              <Text style={[styles.folderName, { color: theme.primary }]} numberOfLines={1}>
                Folder
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Top Add List Button */}
        <TouchableOpacity
          style={[styles.newListBar, { backgroundColor: theme.surface, borderColor: theme.border }]}
          onPress={() => {
            hapticLight();
            setIsAddListOpen(true);
          }}
          activeOpacity={0.75}
        >
          <View style={styles.newListLeft}>
            <View style={[styles.plusCircle, { backgroundColor: theme.primaryLight }]}>
              <Ionicons name="add" size={20} color={theme.primary} />
            </View>
            <Text style={[styles.newListText, { color: theme.text }]}>New List</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={theme.textDim} />
        </TouchableOpacity>

        {/* Lists Container */}
        {filteredLists.length > 0 ? (
          filteredLists.map(list => (
            <ListCard
              key={list.id}
              list={list}
              theme={theme}
              onToggleItem={onToggleItem}
              onAddItem={onAddItem}
              onDeleteItem={onDeleteItem}
              onDeleteList={onDeleteList}
              onMoveFolder={onUpdateListFolder ? handleMoveFolderRequest : undefined}
            />
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIconCircle, { backgroundColor: theme.primaryLight }]}>
              <Ionicons name="list-outline" size={26} color={theme.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>
              {selectedFolder === 'ALL' ? 'No lists yet' : `No lists in ${selectedFolder}`}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Add List Modal */}
      <AddListModal
        visible={isAddListOpen}
        theme={theme}
        folders={allFolders}
        defaultFolder={selectedFolder === 'ALL' ? null : selectedFolder}
        onClose={() => setIsAddListOpen(false)}
        onAddList={handleAddListWithFolder}
      />

      {/* New Folder Sheet */}
      <SwipeableBottomSheet
        visible={isAddFolderOpen}
        onClose={() => setIsAddFolderOpen(false)}
        theme={theme}
        maxHeight="50%"
        useKeyboardAvoiding
      >
        <View style={styles.modalHeader}>
          <Text style={[styles.modalTitle, { color: theme.text }]}>New Folder</Text>
          <TouchableOpacity
            onPress={() => {
              hapticLight();
              setIsAddFolderOpen(false);
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={20} color={theme.textDim} />
          </TouchableOpacity>
        </View>
        <TextInput
          style={[
            styles.folderInput,
            { backgroundColor: theme.surfaceMuted, color: theme.text, borderColor: theme.border },
          ]}
          placeholder="Folder name"
          placeholderTextColor={theme.textDim}
          value={newFolderName}
          onChangeText={setNewFolderName}
          autoFocus
          maxLength={32}
          returnKeyType="done"
          onSubmitEditing={handleCreateFolder}
        />
        <TouchableOpacity
          style={[
            styles.modalSubmitBtn,
            {
              backgroundColor: newFolderName.trim() ? theme.primary : theme.surfaceMuted,
              opacity: newFolderName.trim() ? 1 : 0.6,
            },
          ]}
          onPress={handleCreateFolder}
          disabled={!newFolderName.trim()}
        >
          <Text style={{ fontSize: 15, fontWeight: '700', color: newFolderName.trim() ? '#ffffff' : theme.textDim }}>
            Create Folder
          </Text>
        </TouchableOpacity>
      </SwipeableBottomSheet>

      {/* Move List to Folder Sheet */}
      <SwipeableBottomSheet
        visible={movingList !== null}
        onClose={() => setMovingList(null)}
        theme={theme}
        maxHeight="65%"
      >
        <View style={styles.modalHeader}>
          <Text style={[styles.modalTitle, { color: theme.text }]} numberOfLines={1} ellipsizeMode="tail">
            Move {movingList?.title || 'List'}
          </Text>
          <TouchableOpacity
            onPress={() => {
              hapticLight();
              setMovingList(null);
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={20} color={theme.textDim} />
          </TouchableOpacity>
        </View>
        <BottomSheetScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.moveOptions}>
          <TouchableOpacity
            style={[
              styles.moveOptionRow,
              {
                backgroundColor: !movingList?.folder ? theme.primaryLight : theme.surfaceMuted,
                borderColor: !movingList?.folder ? theme.primary : theme.border,
              },
            ]}
            onPress={() => {
              if (movingList) {
                hapticLight();
                onUpdateListFolder?.(movingList.id, undefined);
              }
              setMovingList(null);
            }}
          >
            <Ionicons name="layers-outline" size={18} color={theme.text} />
            <Text style={[styles.moveOptionText, { color: theme.text }]} numberOfLines={1}>
              No Folder
            </Text>
          </TouchableOpacity>
          {allFolders.map(f => {
            const active = movingList?.folder === f;
            return (
              <TouchableOpacity
                key={f}
                style={[
                  styles.moveOptionRow,
                  {
                    backgroundColor: active ? theme.primaryLight : theme.surfaceMuted,
                    borderColor: active ? theme.primary : theme.border,
                  },
                ]}
                onPress={() => {
                  if (movingList) {
                    hapticLight();
                    onUpdateListFolder?.(movingList.id, f);
                  }
                  setMovingList(null);
                }}
              >
                <Ionicons name="folder-outline" size={18} color={active ? theme.primary : theme.text} />
                <Text
                  style={[styles.moveOptionText, { color: active ? theme.primary : theme.text }]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {f}
                </Text>
              </TouchableOpacity>
            );
          })}
        </BottomSheetScrollView>
      </SwipeableBottomSheet>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 36,
  },
  foldersSection: {
    marginBottom: 14,
  },
  foldersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  folderCard: {
    width: '31%',
    minWidth: 86,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
  },
  newFolderCard: {
    alignItems: 'center',
    justifyContent: 'center',
    borderStyle: 'dashed',
  },
  folderTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  folderCount: {
    fontSize: 11,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  folderName: {
    fontSize: 13,
    fontWeight: '600',
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
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  folderInput: {
    fontSize: 15,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  modalSubmitBtn: {
    paddingVertical: 14,
    borderRadius: 18,
    alignItems: 'center',
  },
  moveOptions: {
    gap: 8,
  },
  moveOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  moveOptionText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
});
