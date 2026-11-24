import { useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { ListsScreen } from '../../screens/ListsScreen';
import { useTranslation } from '../../i18n';

export default function ListsRoute() {
  const { t } = useTranslation();
  const {
    theme,
    currentStreak,
    lists,
    unscheduledTasks,
    toggleTaskCompletion,
    handleSingleDelete,
    workspaceResetCount,
    addList,
    updateListFolder,
    handleDeleteList,
    addListItem,
    deleteListItem,
    toggleListItem,
    showToast,
    setIsThemeModalOpen,
    setIsSettingsModalOpen,
    setIsSyncModalOpen,
  } = useApp();

  const handleAddList = useCallback(
    (title: string, folder?: string) => {
      addList(title, folder);
      showToast({
        type: 'success',
        title: t('toasts.listCreatedTitle'),
        message: t('toasts.listCreatedMessage', { title }),
      });
    },
    [addList, showToast, t]
  );

  const handleOpenThemeModal = useCallback(() => setIsThemeModalOpen(true), [setIsThemeModalOpen]);
  const handleOpenSettingsModal = useCallback(() => setIsSettingsModalOpen(true), [setIsSettingsModalOpen]);
  const handleOpenSyncModal = useCallback(() => setIsSyncModalOpen(true), [setIsSyncModalOpen]);

  return (
    <ListsScreen
      theme={theme}
      currentStreak={currentStreak}
      lists={lists}
      unscheduledTasks={unscheduledTasks}
      onToggleUnscheduledTask={toggleTaskCompletion}
      onDeleteUnscheduledTask={handleSingleDelete}
      workspaceResetCount={workspaceResetCount}
      onAddList={handleAddList}
      onUpdateListFolder={updateListFolder}
      onDeleteList={handleDeleteList}
      onAddItem={addListItem}
      onDeleteItem={deleteListItem}
      onToggleItem={toggleListItem}
      onOpenThemeModal={handleOpenThemeModal}
      onOpenSettingsModal={handleOpenSettingsModal}
      onOpenSyncModal={handleOpenSyncModal}
    />
  );
}
