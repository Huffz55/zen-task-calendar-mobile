import React from 'react';
import { useApp } from '../../context/AppContext';
import { ListsScreen } from '../../screens/ListsScreen';

export default function ListsRoute() {
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
          title: 'List Created',
          message: `"${title}" created`,
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
