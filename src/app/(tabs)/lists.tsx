import React from 'react';
import { useApp } from '../../context/AppContext';
import { ListsScreen } from '../../screens/ListsScreen';
import { useTranslation } from '../../i18n';

export default function ListsRoute() {
  const { t } = useTranslation();
  const {
    theme,
    currentStreak,
    lists,
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

  return (
    <ListsScreen
      theme={theme}
      currentStreak={currentStreak}
      lists={lists}
      workspaceResetCount={workspaceResetCount}
      onAddList={(title, folder) => {
        addList(title, folder);
        showToast({
          type: 'success',
          title: t('toasts.listCreatedTitle'),
          message: t('toasts.listCreatedMessage', { title }),
        });
      }}
      onUpdateListFolder={updateListFolder}
      onDeleteList={handleDeleteList}
      onAddItem={addListItem}
      onDeleteItem={deleteListItem}
      onToggleItem={toggleListItem}
      onOpenThemeModal={() => setIsThemeModalOpen(true)}
      onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
      onOpenSyncModal={() => setIsSyncModalOpen(true)}
    />
  );
}
