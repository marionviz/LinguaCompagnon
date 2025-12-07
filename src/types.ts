export type MessageRole = 'user' | 'model';

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  hasPractice?: boolean;
}

export interface Correction {
  error: string;           // L'erreur commise
  correction: string;      // La correction
  explanation: string;     // L'explication
  category: 'grammar' | 'vocabulary' | 'conjugation' | 'pronunciation';
  example?: string;        // Exemple contextuel
}