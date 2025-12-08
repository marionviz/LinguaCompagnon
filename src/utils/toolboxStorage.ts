// src/utils/toolboxStorage.ts

import { ToolBoxData, ToolBoxItem, LearningStrategy, ToolBoxCategory } from '../types/toolbox.types';

const STORAGE_KEY = 'linguacompagnon_toolbox';

const getDefaultData = (): ToolBoxData => ({
  items: [],
  strategies: [],
  totalItemsAdded: 0,
  categoryCounts: {
    grammar: 0,
    vocabulary: 0,
    conjugation: 0,
    pronunciation: 0,
    strategy: 0,
  },
});

export const getToolBoxData = (): ToolBoxData => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return getDefaultData();
    return JSON.parse(stored);
  } catch (error) {
    console.error('Erreur lecture toolbox:', error);
    return getDefaultData();
  }
};

export const saveToolBoxData = (data: ToolBoxData): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Erreur sauvegarde toolbox:', error);
  }
};

export const addToolBoxItem = (item: Omit<ToolBoxItem, 'id' | 'addedDate' | 'reviewCount'>): ToolBoxItem => {
  const data = getToolBoxData();
  
  const newItem: ToolBoxItem = {
    ...item,
    id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    addedDate: new Date().toISOString(),
    reviewCount: 0,
  };
  
  data.items.push(newItem);
  data.totalItemsAdded += 1;
  data.categoryCounts[item.category] += 1;
  
  saveToolBoxData(data);
  return newItem;
};

export const removeToolBoxItem = (itemId: string): void => {
  const data = getToolBoxData();
  const itemIndex = data.items.findIndex(item => item.id === itemId);
  
  if (itemIndex !== -1) {
    const category = data.items[itemIndex].category;
    data.items.splice(itemIndex, 1);
    data.categoryCounts[category] = Math.max(0, data.categoryCounts[category] - 1);
    saveToolBoxData(data);
  }
};

export const updateToolBoxItem = (itemId: string, updates: Partial<ToolBoxItem>): void => {
  const data = getToolBoxData();
  const itemIndex = data.items.findIndex(item => item.id === itemId);
  
  if (itemIndex !== -1) {
    data.items[itemIndex] = { ...data.items[itemIndex], ...updates };
    saveToolBoxData(data);
  }
};

export const reviewToolBoxItem = (itemId: string): void => {
  const data = getToolBoxData();
  const item = data.items.find(item => item.id === itemId);
  
  if (item) {
    item.reviewCount += 1;
    item.lastReviewed = new Date().toISOString();
    saveToolBoxData(data);
  }
};

export const getItemsByCategory = (category: ToolBoxCategory): ToolBoxItem[] => {
  const data = getToolBoxData();
  return data.items.filter(item => item.category === category);
};

export const getRecentItems = (limit: number = 10): ToolBoxItem[] => {
  const data = getToolBoxData();
  return [...data.items]
    .sort((a, b) => new Date(b.addedDate).getTime() - new Date(a.addedDate).getTime())
    .slice(0, limit);
};

export const addLearningStrategy = (strategy: Omit<LearningStrategy, 'id' | 'discoveredDate' | 'timesUsed'>): LearningStrategy => {
  const data = getToolBoxData();
  
  const newStrategy: LearningStrategy = {
    ...strategy,
    id: `strategy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    discoveredDate: new Date().toISOString(),
    timesUsed: 0,
  };
  
  data.strategies.push(newStrategy);
  saveToolBoxData(data);
  return newStrategy;
};

export const incrementStrategyUsage = (strategyId: string): void => {
  const data = getToolBoxData();
  const strategy = data.strategies.find(s => s.id === strategyId);
  
  if (strategy) {
    strategy.timesUsed += 1;
    saveToolBoxData(data);
  }
};

export const exportToolBoxData = (): string => {
  const data = getToolBoxData();
  return JSON.stringify(data, null, 2);
};

export const clearToolBoxData = (): void => {
  localStorage.removeItem(STORAGE_KEY);
};