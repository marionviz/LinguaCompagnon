// src/types/toolbox.types.ts

export type ToolBoxCategory = 'grammar' | 'vocabulary' | 'conjugation' | 'pronunciation' | 'strategy';

export interface ToolBoxItem {
  id: string;
  category: ToolBoxCategory;
  title: string;
  description: string;
  example?: string;
  learningStrategy?: string; // La stratégie pour retenir ceci
  errorContext?: string; // Contexte de l'erreur commise
  addedDate: string; // ✅ CHANGÉ : string au lieu de Date (pour localStorage)
  reviewCount: number; // Nombre de fois consulté
  lastReviewed?: string; // ✅ CHANGÉ : string au lieu de Date
  tags?: string[]; // Ex: ["auxiliaire", "mouvement"]
  practicePrompt?: string; // ✅ AJOUTÉ : pour éviter l'erreur "does not exist"
}

export interface LearningStrategy {
  id: string;
  name: string; // ✅ AJOUTÉ : propriété manquante
  title: string;
  description: string;
  whenToUse?: string; // ✅ AJOUTÉ : optionnel
  example?: string; // ✅ AJOUTÉ : optionnel
  discoveredDate: string; // ✅ CHANGÉ : string au lieu de Date
  timesUsed: number;
  effectiveness?: 'low' | 'medium' | 'high'; // ✅ CHANGÉ : optionnel
}

export interface ToolBoxData {
  items: ToolBoxItem[];
  strategies: LearningStrategy[];
  totalItemsAdded: number;
  categoryCounts: Record<ToolBoxCategory, number>;
}

export interface SessionData {
  id: string;
  startTime: string; // ✅ CHANGÉ : string au lieu de Date
  endTime: string; // ✅ CHANGÉ : string au lieu de Date
  duration: number; // en minutes
  itemsAdded: number;
  strategiesDiscovered: number;
  reflectionCompleted: boolean;
  reflectionText?: string;
}