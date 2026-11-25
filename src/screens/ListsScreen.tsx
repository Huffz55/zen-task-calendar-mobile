import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { CustomList, Task } from '../types';
import { ThemeColors } from '../constants/colors';
import { CUSTOM_FOLDERS_STORAGE_KEY } from '../services/storage/taskStorage';
import { safeJsonParse, sanitizeText } from '../services/validation/validator';
import { Header } from '../components/common/Header';
import { ListCard } from '../components/lists/ListCard';
import { AddListModal } from '../components/lists/AddListModal';
import { CloseButton } from '../components/common/CloseButton';
import { BottomSheetScrollView, SwipeableBottomSheet, useBottomSheetClose } from '../components/common/SwipeableBottomSheet';
import { Ionicons } from '@expo/vector-icons';
import { hapticLight, hapticSelection } from '../hooks/useHaptics';
import { animateLayout } from '../utils/animations';
import { useSwipeTabNavigation } from '../hooks/useSwipeTabNavigation';
import { useTranslation } from '../i18n';

interface ListsScreenProps {
  theme: ThemeColors;
  currentStreak: number;
  lists: CustomList[];
  unscheduledTasks?: Task[];
  onToggleUnscheduledTask?: (taskId: string, dateStr: string) => void;
  onDeleteUnscheduledTask?: (taskId: string) => void;
  workspaceResetCount?: number;
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
  unscheduledTasks = [],
  onToggleUnscheduledTask,
  onDeleteUnscheduledTask,
  workspaceResetCount = 0,
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
  const { t } = useTranslation();
  const [isAddListOpen, setIsAddListOpen] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<string>('ALL');
  const [savedFolders, setSavedFolders] = useState<string[]>([]);
  const [isAddFolderOpen, setIsAddFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [movingList, setMovingList] = useState<CustomList | null>(null);
  const folderSubmittingRef = useRef(false);
  const swipeHandlers = useSwipeTabNavigation('lists');

  useEffect(() => {
    if (isAddFolderOpen) {
      folderSubmittingRef.current = false;
    }
  }, [isAddFolderOpen]);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(CUSTOM_FOLDERS_STORAGE_KEY)
      .then(raw => {
        if (!mounted) return;
        if (!raw) {
          setSavedFolders([]);
          setSelectedFolder('ALL');
          return;
        }
        const parsed = safeJsonParse<unknown>(raw);
        if (Array.isArray(parsed)) {
          const valid = parsed
            .filter((item): item is string => typeof item === 'string')
            .map(item => sanitizeText(item, 40))
            .filter(Boolean);
          setSavedFolders(Array.from(new Set(valid)));
        } else {
          setSavedFolders([]);
          setSelectedFolder('ALL');
        }
      })
      .catch(() => {
        if (mounted) {
          setSavedFolders([]);
        }
      });
    return () => {
      mounted = false;
    };
  }, [workspaceResetCount]);

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
    if (folderSubmittingRef.current) return;
    const clean = newFolderName.trim();
    if (!clean) return;
    folderSubmittingRef.current = true;
    hapticLight();
    const updated = Array.from(new Set([...allFolders, clean]));
    setSavedFolders(updated);
    AsyncStorage.setItem(CUSTOM_FOLDERS_STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
    setSelectedFolder(clean);
    setNewFolderName('');
    setIsAddFolderOpen(false);
  };

  const handleAddListWithFolder = (title: string, folder?: string) => {
    if (folder && !allFolders.includes(folder)) {
      const updated = Array.from(new Set([...allFolders, folder]));
      setSavedFolders(updated);
      AsyncStorage.setItem(CUSTOM_FOLDERS_STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
    }
    onAddList(title, folder);
  };

  const handleMoveFolderRequest = useCallback((l: CustomList) => {
    setMovingList(l);
  }, []);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      {...swipeHandlers}
    >
      <Header
        theme={theme}
        currentStreak={currentStreak}
        onOpenThemeModal={onOpenThemeModal}
        onOpenSettingsModal={onOpenSettingsModal}
        onOpenSyncModal={onOpenSyncModal}
        title={t('lists.title')}
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
                  maxFontSizeMultiplier={1.35}
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
                maxFontSizeMultiplier={1.35}
              >
                {t('common.all')}
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
                      maxFontSizeMultiplier={1.35}
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
                    maxFontSizeMultiplier={1.35}
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
              accessibilityRole="button"
            >
              <Ionicons name="add-circle-outline" size={18} color={theme.primary} />
              <Text style={[styles.folderName, { color: theme.primary }]} numberOfLines={1} maxFontSizeMultiplier={1.45}>
                {t('lists.folderButton')}
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
          accessibilityRole="button"
        >
          <View style={styles.newListLeft}>
            <View style={[styles.plusCircle, { backgroundColor: theme.primaryLight }]}>
              <Ionicons name="add" size={20} color={theme.primary} />
            </View>
            <Text style={[styles.newListText, { color: theme.text }]}>{t('lists.newList')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={theme.textDim} />
        </TouchableOpacity>

        {/* Lists Container */}
        {filteredLists.length > 0 || (selectedFolder === 'ALL' && unscheduledTasks.length > 0) ? (
          <>
            {filteredLists.map(list => (
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
            ))}

            {selectedFolder === 'ALL' && unscheduledTasks.length > 0 && (
              <View style={[styles.unscheduledCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={styles.unscheduledHeader}>
                  <Ionicons name="albums-outline" size={17} color={theme.primary} />
                  <Text style={[styles.unscheduledTitle, { color: theme.text }]} numberOfLines={1}>
                    {t('lists.unscheduledTasksTitle')}
                  </Text>
                  <View style={[styles.unscheduledBadge, { backgroundColor: theme.surfaceMuted }]}>
                    <Text style={[styles.unscheduledCount, { color: theme.textDim }]}>
                      {unscheduledTasks.length}
                    </Text>
                  </View>
                </View>
                <View style={styles.unscheduledList}>
                  {unscheduledTasks.map(task => {
                    const isCompleted = Array.isArray(task.completedDates) && task.completedDates.includes(task.date);
                    return (
                      <View key={task.id} style={styles.unscheduledRow}>
                        <TouchableOpacity
                          style={[
                            styles.unscheduledCheckbox,
                            {
                              borderColor: isCompleted ? theme.primary : theme.textDim,
                              backgroundColor: isCompleted ? theme.primary : 'transparent',
                            },
                          ]}
                          onPress={() => {
                            hapticLight();
                            onToggleUnscheduledTask?.(task.id, task.date);
                          }}
                          activeOpacity={0.7}
                          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                          accessibilityRole="checkbox"
                          accessibilityState={{ checked: isCompleted }}
                          accessibilityLabel={task.title}
                        >
                          {isCompleted && <Ionicons name="checkmark" size={12} color={theme.onPrimary} />}
                        </TouchableOpacity>
                        <Text
                          style={[
                            styles.unscheduledText,
                            {
                              color: isCompleted ? theme.textDim : theme.text,
                              textDecorationLine: isCompleted ? 'line-through' : 'none',
                            },
                          ]}
                        >
                          {task.title}
                        </Text>
                        {onDeleteUnscheduledTask && (
                          <TouchableOpacity
                            onPress={() => {
                              hapticLight();
                              onDeleteUnscheduledTask(task.id);
                            }}
                            hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
                            accessibilityRole="button"
                            accessibilityLabel={t('lists.a11yDeleteItem', { item: task.title })}
                          >
                            <Ionicons name="close" size={16} color={theme.textDim} />
                          </TouchableOpacity>
                        )}
                      </View>
                    );
                  })}
                </View>
              </View>
            )}
          </>
        ) : (
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIconCircle, { backgroundColor: theme.primaryLight }]}>
              <Ionicons name="list-outline" size={26} color={theme.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>
              {selectedFolder === 'ALL'
                ? t('lists.emptyAll')
                : t('lists.emptyFolder', { folder: selectedFolder })}
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
        <NewFolderSheetBody
          theme={theme}
          title={t('lists.newFolderTitle')}
          placeholder={t('lists.folderNamePlaceholder')}
          submitLabel={t('lists.createFolder')}
          closeLabel={t('common.close')}
          value={newFolderName}
          onChangeText={setNewFolderName}
          onSubmit={handleCreateFolder}
        />
      </SwipeableBottomSheet>

      {/* Move List to Folder Sheet */}
      <SwipeableBottomSheet
        visible={movingList !== null}
        onClose={() => setMovingList(null)}
        theme={theme}
        maxHeight="65%"
      >
        <MoveListSheetBody
          theme={theme}
          movingList={movingList}
          allFolders={allFolders}
          title={t('lists.moveListTitle', { title: movingList?.title || t('lists.defaultListLabel') })}
          noFolderLabel={t('lists.noFolder')}
          closeLabel={t('common.close')}
          onSelectFolder={(folder) => {
            if (movingList) {
              hapticLight();
              onUpdateListFolder?.(movingList.id, folder);
            }
          }}
        />
      </SwipeableBottomSheet>
    </KeyboardAvoidingView>
  );
}

function NewFolderSheetBody({
  theme,
  title,
  placeholder,
  submitLabel,
  closeLabel,
  value,
  onChangeText,
  onSubmit,
}: {
  theme: ThemeColors;
  title: string;
  placeholder: string;
  submitLabel: string;
  closeLabel: string;
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
}) {
  const sheetClose = useBottomSheetClose();
  const handleCreate = () => {
    if (!value.trim()) return;
    onSubmit();
    sheetClose?.();
  };

  return (
    <>
      <View style={styles.modalHeader}>
        <Text style={[styles.modalTitle, { color: theme.text }]}>{title}</Text>
        <CloseButton theme={theme} accessibilityLabel={closeLabel} />
      </View>
      <TextInput
        style={[
          styles.folderInput,
          { backgroundColor: theme.surfaceMuted, color: theme.text, borderColor: theme.border },
        ]}
        placeholder={placeholder}
        placeholderTextColor={theme.textDim}
        value={value}
        onChangeText={onChangeText}
        autoFocus
        maxLength={32}
        returnKeyType="done"
        onSubmitEditing={handleCreate}
      />
      <TouchableOpacity
        style={[
          styles.modalSubmitBtn,
          {
            backgroundColor: value.trim() ? theme.primary : theme.surfaceMuted,
            opacity: value.trim() ? 1 : 0.6,
          },
        ]}
        onPress={handleCreate}
        disabled={!value.trim()}
      >
        <Text style={{ fontSize: 15, fontWeight: '700', color: value.trim() ? theme.onPrimary : theme.textDim }}>
          {submitLabel}
        </Text>
      </TouchableOpacity>
    </>
  );
}

function MoveListSheetBody({
  theme,
  movingList,
  allFolders,
  title,
  noFolderLabel,
  closeLabel,
  onSelectFolder,
}: {
  theme: ThemeColors;
  movingList: CustomList | null;
  allFolders: string[];
  title: string;
  noFolderLabel: string;
  closeLabel: string;
  onSelectFolder: (folder?: string) => void;
}) {
  const sheetClose = useBottomSheetClose();

  return (
    <>
      <View style={styles.modalHeader}>
        <Text style={[styles.modalTitle, { color: theme.text }]} numberOfLines={1} ellipsizeMode="tail">
          {title}
        </Text>
        <CloseButton theme={theme} accessibilityLabel={closeLabel} />
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
            onSelectFolder(undefined);
            sheetClose?.();
          }}
        >
          <Ionicons name="layers-outline" size={18} color={theme.text} />
          <Text style={[styles.moveOptionText, { color: theme.text }]} numberOfLines={1}>
            {noFolderLabel}
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
                onSelectFolder(f);
                sheetClose?.();
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
    </>
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
    minHeight: 48,
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
  unscheduledCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
  },
  unscheduledHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  unscheduledTitle: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  unscheduledBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  unscheduledCount: {
    fontSize: 11,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  unscheduledList: {
    gap: 10,
  },
  unscheduledRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 28,
  },
  unscheduledCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unscheduledText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
});
