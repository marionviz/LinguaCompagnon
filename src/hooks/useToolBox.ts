// src/hooks/useToolBox.ts

import { useState, useEffect, useCallback } from 'react';
import { ToolBoxData, ToolBoxItem, LearningStrategy, ToolBoxCategory } from '../types/toolbox.types';
import {
  getToolBoxData,
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
  const [data, setData] = useState<ToolBoxData>(getToolBoxData());

  const refresh = useCallback(() => {
    setData(getToolBoxData());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addItem = useCallback((item: Omit<ToolBoxItem, 'id' | 'addedDate' | 'reviewCount'>) => {
    const newItem = addToolBoxItem(item);
    refresh();
    return newItem;
  }, [refresh]);

  const removeItem = useCallback((itemId: string) => {
    removeToolBoxItem(itemId);
    refresh();
  }, [refresh]);

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