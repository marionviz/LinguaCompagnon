// Types spécifiques pour le mode oral (LiveTutor)
// Séparés des types principaux pour éviter les conflits

export interface CourseWeekOral {
  id: number;
  title: string;
  description: string;
  topics: string[];
  vocabulary: string[];
  grammar: string[];
  objective: string;
}

export enum ConnectionState {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR',
}

export interface AudioState {
  isPlaying: boolean;
  isListening: boolean;
  volume: number;
}

export interface Correction {
  originalSentence: string;
  correctedSentence: string;
  explanation: string;
}