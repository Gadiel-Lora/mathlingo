import express from 'express';
import dotenv from 'dotenv';
import adaptiveController from './controllers/adaptive-controller';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Main Adaptive Engine Routes
app.use('/api/adaptive', adaptiveController);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'elite-math-adaptive-engine' });
});

app.listen(PORT, () => {
    console.log(`Adaptive Engine running on port ${PORT}`);
});

export default app;
