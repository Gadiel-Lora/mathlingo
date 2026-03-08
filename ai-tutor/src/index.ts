import express from 'express';
import dotenv from 'dotenv';
import aiController from './controllers/ai-controller';
import { TUTOR_CONFIG } from './config/ollama-config';
import { OllamaService } from './services/ollama-service';

dotenv.config();

const app = express();
app.use(express.json());

// Routes
app.use('/api/ai-tutor', aiController);

// Health check
app.get('/health', async (_req, res) => {
  const ollama = new OllamaService();
  const ollamaReachable = await ollama.validateConnection();
  res.json({
    status: 'ok',
    service: 'elitemath-ai-tutor',
    ollama: ollamaReachable ? 'connected' : 'unreachable',
    model: process.env.OLLAMA_MODEL || 'mistral',
  });
});

const PORT = TUTOR_CONFIG.port;
app.listen(PORT, () => {
  console.log(`AI Tutor running on port ${PORT}`);
  console.log(`Ollama endpoint: ${process.env.OLLAMA_URL || 'http://localhost:11434'}`);
});

export default app;
