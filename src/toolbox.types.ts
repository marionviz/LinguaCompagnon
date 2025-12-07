typescript// src/types/toolbox.types.ts

export type ToolBoxCategory = 'grammar' | 'vocabulary' | 'conjugation' | 'pronunciation' | 'strategy';

export interface ToolBoxItem {
  id: string;
  category: ToolBoxCategory;
  title: string;
  description: string;
  example?: string;
  learningStrategy?: string; // La stratégie pour retenir ceci
  errorContext?: string; // Contexte de l'erreur commise
  addedDate: Date;
  reviewCount: number; // Nombre de fois consulté
  lastReviewed?: Date;
  tags?: string[]; // Ex: ["auxiliaire", "mouvement"]
}

export interface LearningStrategy {
  id: string;
  title: string;
  description: string;
  whenToUse: string;
  example: string;
  discoveredDate: Date;
  timesUsed: number;
  effectiveness: 'low' | 'medium' | 'high'; // Auto-évaluation
}

export interface ToolBoxData {
  items: ToolBoxItem[];
  strategies: LearningStrategy[];
  totalItemsAdded: number;
  categoryCounts: Record<ToolBoxCategory, number>;
}

export interface SessionData {
  id: string;
  startTime: Date;
  endTime: Date;
  duration: number; // en minutes
  itemsAdded: number;
  strategiesDiscovered: number;
  reflectionCompleted: boolean;
  reflectionText?: string;
}