import React from 'react';
import { useApp } from '../../context/AppContext';
import { ListsScreen } from '../../screens/ListsScreen';

export default function ListsRoute() {
  const {
    theme,
    currentStreak,
    lists,
    addList,
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
      onAddList={title => {
        addList(title);
        showToast({
          type: 'success',
          title: 'List Created',
          message: `"${title}" created 📝`,
        });
      }}
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
