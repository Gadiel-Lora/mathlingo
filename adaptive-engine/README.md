# EliteMath - Adaptive Engine

The core deterministic recommendation module for the EliteMath adaptive learning platform. This backend microservice calculates Bayesian mastery estimations, categorizes mathematical errors based on cognitive taxonomy, calculates risk signals, and recommends the next best action dynamically.

## Architecture

1. **ErrorClassifier**: Given a raw string input, heuristically classifies errors into `ARITHMETIC`, `CONCEPTUAL`, `PROCEDURAL`, `NOTATIONAL`, or `READING`. 
2. **MasteryModel**: Calculates mastery estimations mapped mathematically using Bayesian Probability tracking both `mu` and `sigma` factors.
3. **SignalsCalculator**: Ingests historical database records to construct metrics for retention risk, consistency, and learning velocity.
4. **AdaptiveEngine**: Routes students using hard constraints + the heuristic signals (e.g. Spaced Repetition for forgotten items versus Optional Challenges for fast-track learners).

## Run Instructions
```bash
# 1. Install Dependencies
npm install

# 2. Build TypeScript
npm run build

# 3. Test
npm run test

# 4. Start Local Instance
npm run dev
```

If utilizing AI-assist capabilities on top of deterministic logic, use Docker to boot the Ollama environment locally:
```bash
docker-compose up -d ollama
ollama pull mistral
```
