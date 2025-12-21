// src/hooks/useToolBox.ts

import { useState, useEffect, useCallback } from 'react';
import { 
  ToolBoxData,
  ToolBoxItem,
  ToolBoxCategory,
  LearningStrategy
} from '../types/toolbox.types';
import {
  getToolBoxData,
  saveToolBoxData,
  addToolBoxItem,
  removeToolBoxItem,
  updateToolBoxItem,
  reviewToolBoxItem,
  getItemsByCategory,
  getRecentItems,
  addLearningStrategy,
  incrementStrategyUsage,
  exportToolBoxData,
} from '../utils/toolboxStorage';

export const useToolBox = () => {
  // ✅ État local qui force le re-render quand localStorage change
  const [data, setData] = useState<ToolBoxData>(getToolBoxData());

  // ✅ Fonction pour recharger les données
  const refresh = useCallback(() => {
    setData(getToolBoxData());
  }, []);

  // ✅ Écouter les changements de localStorage
  useEffect(() => {
    const handleStorageChange = () => {
      console.log('🔄 localStorage changé, rechargement data');
      refresh();
    };

    // Écouter l'event custom
    window.addEventListener('toolboxUpdated', handleStorageChange);
    
    // Écouter aussi les changements directs de storage (si plusieurs onglets)
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('toolboxUpdated', handleStorageChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [refresh]);

  const addItem = useCallback((item: Omit<ToolBoxItem, 'id' | 'addedDate' | 'reviewCount'>) => {
    const newItem = addToolBoxItem(item);
    refresh();
    window.dispatchEvent(new Event('toolboxUpdated'));
    return newItem;
  }, [refresh]);

  const removeItem = useCallback((id: string) => {
    removeToolBoxItem(id);
    refresh();
    window.dispatchEvent(new Event('toolboxUpdated'));
  }, [refresh]);

  const updateItem = useCallback((itemId: string, updates: Partial<ToolBoxItem>) => {
    updateToolBoxItem(itemId, updates);
    refresh();
    window.dispatchEvent(new Event('toolboxUpdated'));
  }, [refresh]);

  const reviewItem = useCallback((itemId: string) => {
    reviewToolBoxItem(itemId);
    refresh();
    window.dispatchEvent(new Event('toolboxUpdated'));
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
    window.dispatchEvent(new Event('toolboxUpdated'));
    return newStrategy;
  }, [refresh]);

  const useStrategy = useCallback((strategyId: string) => {
    incrementStrategyUsage(strategyId);
    refresh();
    window.dispatchEvent(new Event('toolboxUpdated'));
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