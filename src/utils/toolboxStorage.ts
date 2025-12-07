typescript// src/utils/toolboxStorage.ts

import { ToolBoxData, ToolBoxItem, LearningStrategy, SessionData } from '@/types/toolbox.types';

const STORAGE_KEY = 'linguacompagnon_toolbox';
const SESSIONS_KEY = 'linguacompagnon_sessions';

// Initialisation des données par défaut
const defaultToolBoxData: ToolBoxData = {
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
};

// === TOOLBOX OPERATIONS ===

export const getToolBoxData = (): ToolBoxData => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return defaultToolBoxData;
    
    const parsed = JSON.parse(stored);
    // Reconvertir les dates
    parsed.items = parsed.items.map((item: any) => ({
      ...item,
      addedDate: new Date(item.addedDate),
      lastReviewed: item.lastReviewed ? new Date(item.lastReviewed) : undefined,
    }));
    
    return parsed;
  } catch (error) {
    console.error('Error loading toolbox:', error);
    return defaultToolBoxData;
  }
};

export const saveToolBoxData = (data: ToolBoxData): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving toolbox:', error);
  }
};

export const addToolBoxItem = (item: Omit<ToolBoxItem, 'id' | 'addedDate' | 'reviewCount'>): ToolBoxItem => {
  const data = getToolBoxData();
  
  const newItem: ToolBoxItem = {
    ...item,
    id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    addedDate: new Date(),
    reviewCount: 0,
  };
  
  data.items.push(newItem);
  data.totalItemsAdded++;
  data.categoryCounts[item.category]++;
  
  saveToolBoxData(data);
  return newItem;
};

export const removeToolBoxItem = (itemId: string): void => {
  const data = getToolBoxData();
  const itemIndex = data.items.findIndex(item => item.id === itemId);
  
  if (itemIndex !== -1) {
    const category = data.items[itemIndex].category;
    data.items.splice(itemIndex, 1);
    data.categoryCounts[category]--;
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

export const markItemAsReviewed = (itemId: string): void => {
  const data = getToolBoxData();
  const item = data.items.find(item => item.id === itemId);
  
  if (item) {
    item.reviewCount++;
    item.lastReviewed = new Date();
    saveToolBoxData(data);
  }
};

// === STRATEGIES OPERATIONS ===

export const addLearningStrategy = (strategy: Omit<LearningStrategy, 'id' | 'discoveredDate' | 'timesUsed'>): LearningStrategy => {
  const data = getToolBoxData();
  
  const newStrategy: LearningStrategy = {
    ...strategy,
    id: `strategy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    discoveredDate: new Date(),
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
    strategy.timesUsed++;
    saveToolBoxData(data);
  }
};

// === SESSIONS OPERATIONS ===

export const getSessions = (): SessionData[] => {
  try {
    const stored = localStorage.getItem(SESSIONS_KEY);
    if (!stored) return [];
    
    const parsed = JSON.parse(stored);
    return parsed.map((session: any) => ({
      ...session,
      startTime: new Date(session.startTime),
      endTime: new Date(session.endTime),
    }));
  } catch (error) {
    console.error('Error loading sessions:', error);
    return [];
  }
};

export const addSession = (session: SessionData): void => {
  try {
    const sessions = getSessions();
    sessions.push(session);
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
  } catch (error) {
    console.error('Error saving session:', error);
  }
};

// === EXPORT OPERATIONS ===

export const exportToolBoxData = (): void => {
  const data = getToolBoxData();
  const sessions = getSessions();
  
  const exportData = {
    toolbox: data,
    sessions: sessions,
    exportDate: new Date().toISOString(),
    version: '1.0',
  };
  
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
    type: 'application/json' 
  });
  
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `linguacompagnon_backup_${new Date().toISOString().split('T')[0]}.json`;
  link.click();
  URL.revokeObjectURL(url);
};

export const clearAllData = (): void => {
  if (confirm('Êtes-vous sûr de vouloir supprimer toutes vos données ? Cette action est irréversible.')) {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(SESSIONS_KEY);
  }
};
