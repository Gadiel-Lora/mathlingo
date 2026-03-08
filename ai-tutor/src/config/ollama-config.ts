import dotenv from 'dotenv';
dotenv.config();

export const OLLAMA_CONFIG = {
  baseUrl: process.env.OLLAMA_URL || 'http://localhost:11434',
  model: process.env.OLLAMA_MODEL || 'mistral',
  temperature: parseFloat(process.env.OLLAMA_TEMPERATURE || '0.7'),
  maxTokens: parseInt(process.env.OLLAMA_MAX_TOKENS || '1000'),
  timeout: parseInt(process.env.OLLAMA_TIMEOUT || '30000'),
};

export const TUTOR_CONFIG = {
  language: 'spanish',
  socraticApproach: true,
  maxHintLevel: 3 as const,
  exerciseFormat: 'json',
  conversationHistoryLimit: 20,
  port: parseInt(process.env.PORT || '3001'),
};
