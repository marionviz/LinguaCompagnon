export type MessageRole = 'user' | 'model';

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  hasPractice?: boolean;
}