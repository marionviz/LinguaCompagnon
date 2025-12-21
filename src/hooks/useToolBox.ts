// src/hooks/useToolBox.ts

import { useState, useEffect, useCallback } from 'react';
import { getToolBoxData, saveToolBoxData, addToolBoxItem, removeToolBoxItem, /* ... */ } from '../utils/toolboxStorage';

export const useToolBox = () => {
  // ✅ État local qui force le re-render quand localStorage change
  const [data, setData] = useState(getToolBoxData());

  // ✅ Écouter les changements de localStorage
  useEffect(() => {
    const handleStorageChange = () => {
      console.log('🔄 localStorage changé, rechargement data');
      setData(getToolBoxData());
    };

    // Écouter l'event custom
    window.addEventListener('toolboxUpdated', handleStorageChange);
    
    // Écouter aussi les changements directs de storage (si plusieurs onglets)
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('toolboxUpdated', handleStorageChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const addItem = (item: Omit<ToolBoxItem, 'id' | 'addedDate' | 'reviewCount'>) => {
    const newItem = addToolBoxItem(item);
    setData(getToolBoxData()); // ✅ Mettre à jour l'état local
    window.dispatchEvent(new Event('toolboxUpdated')); // ✅ Notifier les autres composants
    return newItem;
  };

  const removeItem = (id: string) => {
    removeToolBoxItem(id);
    setData(getToolBoxData()); // ✅ Mettre à jour l'état local
    window.dispatchEvent(new Event('toolboxUpdated'));
  };

  const updateItem = useCallback((itemId: string, updates: Partial<ToolBoxItem>) => {
    updateToolBoxItem(itemId, updates);
    refresh();
  }, [refresh]);

  const reviewItem = useCallback((itemId: string) => {
    reviewToolBoxItem(itemId);
    refresh();
  }, [refresh]);

  const getByCategory = useCallback((category: ToolBoxCategory) => {
    return getItemsByCategory(category);
  }, []);

  const getRecent = useCallback((limit?: number) => {
    return getRecentItems(limit);
  }, []);

  const addStrategy = useCallback((strategy: Omit<LearningStrategy, 'id' | 'discoveredDate' | 'timesUsed'>) => {
    const newStrategy = addLearningStrategy(strategy);
    refresh();
    return newStrategy;
  }, [refresh]);

  const useStrategy = useCallback((strategyId: string) => {
    incrementStrategyUsage(strategyId);
    refresh();
  }, [refresh]);

  const exportData = useCallback(() => {
    return exportToolBoxData();
  }, []);

  return {
    data,
    addItem,
    removeItem,
    updateItem,
    reviewItem,
    getByCategory,
    getRecent,
    addStrategy,
    useStrategy,
    exportData,
    refresh,
  };
};