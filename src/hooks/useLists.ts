import { useState, useEffect, useCallback } from 'react';
import { CustomList, ListItem } from '../types';
import { IListStorage, defaultListStorage } from '../services/storage/taskStorage';
import { springLayout } from '../utils/animations';

function generateUniqueId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`;
}

export function useLists(storage: IListStorage = defaultListStorage) {
  const [lists, setLists] = useState<CustomList[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    storage.loadLists().then(loaded => {
      if (mounted) {
        setLists(loaded);
        setIsLoaded(true);
      }
    });
    return () => { mounted = false; };
  }, [storage]);

  useEffect(() => {
    if (isLoaded) {
      storage.saveLists(lists);
    }
  }, [lists, isLoaded, storage]);

  // Real-time cloud subscription
  useEffect(() => {
    if (storage.subscribeLists) {
      const unsubscribe = storage.subscribeLists((remoteLists) => {
        setLists(remoteLists);
      });
      return unsubscribe;
    }
  }, [storage]);

  const addList = useCallback((title: string) => {
    const trimmed = title.trim();
    if (!trimmed) return;
    const newList: CustomList = {
      id: generateUniqueId(),
      title: trimmed,
      items: [],
    };
    springLayout();
    setLists(prev => [...prev, newList]);
    return newList;
  }, []);

  const deleteList = useCallback((listId: string) => {
    springLayout();
    setLists(prev => prev.filter(l => l.id !== listId));
  }, []);

  const restoreList = useCallback((list: CustomList) => {
    setLists(prev => {
      if (prev.some(l => l.id === list.id)) {
        return prev.map(l => l.id === list.id ? list : l);
      }
      return [...prev, list];
    });
  }, []);

  const addListItem = useCallback((listId: string, text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    springLayout();
    setLists(prev => prev.map(list => {
      if (list.id === listId) {
        const newItem: ListItem = {
          id: generateUniqueId(),
          text: trimmed,
          completed: false,
        };
        return { ...list, items: [...list.items, newItem] };
      }
      return list;
    }));
  }, []);

  const deleteListItem = useCallback((listId: string, itemId: string) => {
    springLayout();
    setLists(prev => prev.map(list => {
      if (list.id === listId) {
        return { ...list, items: list.items.filter(item => item.id !== itemId) };
      }
      return list;
    }));
  }, []);

  const toggleListItem = useCallback((listId: string, itemId: string) => {
    springLayout();
    setLists(prev => prev.map(list => {
      if (list.id === listId) {
        return {
          ...list,
          items: list.items.map(item =>
            item.id === itemId ? { ...item, completed: !item.completed } : item
          ),
        };
      }
      return list;
    }));
  }, []);

  return {
    lists,
    isLoaded,
    addList,
    deleteList,
    restoreList,
    addListItem,
    deleteListItem,
    toggleListItem,
  };
}
