export interface ChatMessage {
  msg: string;
  sender: 'student' | 'ai';
  timestamp?: number;
  role?: 'assistant' | 'user'; // Aliases para compatibilidad con la DB si es necesario
  content?: string;
}

export interface AIResponse {
  answer: string;
  type: string;
}
