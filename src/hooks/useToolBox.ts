typescript// src/hooks/useToolBox.ts

import { useState, useEffect, useCallback } from 'react';
import { 
  ToolBoxData, 
  ToolBoxItem, 
  LearningStrategy,
  ToolBoxCategory 
} from '@/types/toolbox.types';
import {
  getToolBoxData,
  addToolBoxItem as addItem,
  removeToolBoxItem,
  updateToolBoxItem,
  markItemAsReviewed,
  addLearningStrategy as addStrategy,
  incrementStrategyUsage,
  exportToolBoxData,
} from '@/utils/toolboxStorage';

export const useToolBox = () => {
  const [toolboxData, setToolboxData] = useState<ToolBoxData>(getToolBoxData());
  const [isLoading, setIsLoading] = useState(false);

  // Recharger les données depuis localStorage
  const refresh = useCallback(() => {
    setToolboxData(getToolBoxData());
  }, []);

  // Ajouter un item
  const addToolBoxItem = useCallback((
    item: Omit<ToolBoxItem, 'id' | 'addedDate' | 'reviewCount'>
  ) => {
    setIsLoading(true);
    try {
      addItem(item);
      refresh();
      return true;
    } catch (error) {
      console.error('Error adding item:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [refresh]);

  // Supprimer un item
  const removeItem = useCallback((itemId: string) => {
    removeToolBoxItem(itemId);
    refresh();
  }, [refresh]);

  // Mettre à jour un item
  const updateItem = useCallback((itemId: string, updates: Partial<ToolBoxItem>) => {
    updateToolBoxItem(itemId, updates);
    refresh();
  }, [refresh]);

  // Marquer comme consulté
  const reviewItem = useCallback((itemId: string) => {
    markItemAsReviewed(itemId);
    refresh();
  }, [refresh]);

  // Ajouter une stratégie
  const addLearningStrategy = useCallback((
    strategy: Omit<LearningStrategy, 'id' | 'discoveredDate' | 'timesUsed'>
  ) => {
    setIsLoading(true);
    try {
      addStrategy(strategy);
      refresh();
      return true;
    } catch (error) {
      console.error('Error adding strategy:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [refresh]);

  // Utiliser une stratégie
  const useStrategy = useCallback((strategyId: string) => {
    incrementStrategyUsage(strategyId);
    refresh();
  }, [refresh]);

  // Filtrer par catégorie
  const getItemsByCategory = useCallback((category: ToolBoxCategory) => {
    return toolboxData.items.filter(item => item.category === category);
  }, [toolboxData.items]);

  // Items récents
  const getRecentItems = useCallback((limit: number = 5) => {
    return [...toolboxData.items]
      .sort((a, b) => b.addedDate.getTime() - a.addedDate.getTime())
      .slice(0, limit);
  }, [toolboxData.items]);

  // Export
  const exportData = useCallback(() => {
    exportToolBoxData();
  }, []);

  return {
    toolboxData,
    isLoading,
    addToolBoxItem,
    removeItem,
    updateItem,
    reviewItem,
    addLearningStrategy,
    useStrategy,
    getItemsByCategory,
    getRecentItems,
    exportData,
    refresh,
  };
};