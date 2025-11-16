export type MessageRole = 'user' | 'model';

export type Feedback = 'thumbs-up' | 'thumbs-down';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  text: string;
  feedback?: Feedback;
}