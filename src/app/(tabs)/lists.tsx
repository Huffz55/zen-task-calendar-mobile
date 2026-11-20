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

  return (
    <ListsScreen
      theme={theme}
      currentStreak={currentStreak}
      lists={lists}
      unscheduledTasks={unscheduledTasks}
      onToggleUnscheduledTask={(taskId, dateStr) => toggleTaskCompletion(taskId, dateStr)}
      onDeleteUnscheduledTask={handleSingleDelete}
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
