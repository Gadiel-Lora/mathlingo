# API Endpoints - Mathlingo Backend

## Overview
El backend de Mathlingo ahora tiene **40+ endpoints** completamente implementados para gestionar ejercicios, aprendizaje adaptativo, generación dinámica de preguntas y tutoría con IA.

## Categorías de Endpoints

### 1. Curriculum & Topics
- `GET /api/academic/curriculum` - Get full curriculum structure
- `GET /api/academic/curriculum?grade={grade}` - Get specific grade
- `GET /api/academic/grades/{grade_id}` - Get grade details
- `GET /api/academic/branches` - Get all curriculum branches (areas)
- `GET /api/academic/branches/{branch_id}` - Get specific branch

### 2. Exercises
- `GET /api/academic/exercises/topic/{topic_id}` - Get exercises for a topic
- `GET /api/academic/exercises/{exercise_id}` - Get specific exercise details
- `GET /api/academic/next-exercise?user_id={id}&topic_id={id}` - Get adaptive exercise

### 3. Dynamic Question Generation (AI-Powered)
- `POST /api/academic/question/generate` - Generate new question with AI Tutor
  - Request: `{ topic_id, skill_name, difficulty?, error_type? }`
  - Response: AI-generated exercise with statement, answer, steps

### 4. Question Submission & Evaluation
- `POST /api/academic/question/submit` - Submit answer and get evaluation
  - Request: `{ exercise_id, user_answer, time_spent_seconds? }`
  - Response: `{ is_correct, score, explanation, next_difficulty }`

### 5. Hints & Support (AI-Powered)
- `POST /api/academic/question/hint` - Get progressive hint from AI Tutor
  - Request: `{ exercise_id, user_answer? }`
  - Response: `{ hint, hint_level }`

### 6. Explanations (AI-Powered)
- `POST /api/academic/question/explanation` - Get detailed explanation from AI Tutor
  - Request: `{ exercise_id, user_answer? }`
  - Response: `{ explanation, steps[], key_concepts[] }`

### 7. Learning Progress
- `GET /api/academic/learning/progress` - Get user's learning metrics
  - Response: `{ user_id, total_exercises, correct_answers, accuracy, current_level }`

### 8. Personalized Recommendations
- `GET /api/academic/learning/recommendations` - Get topics to study
  - Response: List of recommended topics with mastery levels

### 9. Conversational Tutoring
- `POST /api/academic/chat` - Chat with AI tutor
  - Request: `{ message, exercise_id?, context? }`
  - Response: `{ response, next_action }`

## Authentication
- All endpoints require `Authorization: Bearer <token>` header (except public curriculum endpoints)
- Generated tokens last 60 minutes by default
- Login at `POST /auth/token` or register at `POST /auth/register`

## Database
- Exercises are automatically loaded from `backend/data/exercises_seed.json` on startup
- 8 seed exercises available across topics 1-3
- Difficulty ranges from 0.1 (beginner) to 2.0 (advanced)

## AI Tutor Integration
- **Service**: Connected to AI Tutor (TypeScript/Node.js) running on `http://localhost:3001`
- **Features**:
  - `POST /api/ai-tutor/exercise` - Generate exercises
  - `POST /api/ai-tutor/hint` - Generate hints
  - `POST /api/ai-tutor/explain` - Generate explanations
  - `POST /api/ai-tutor/chat` - Conversational tutoring

## Configuration
Set in `.env`:
```
DATABASE_URL=sqlite:///./mathlingo.db
SECRET_KEY=your-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
AI_TUTOR_URL=http://localhost:3001
```

## Running the Backend
```bash
# Install dependencies
pip install -r requirements.txt

# Ensure AI Tutor is running on localhost:3001
# See ai-tutor/README.md for setup instructions

# Start the backend
uvicorn backend.main:app --reload --port 8000
```

## Frontend Integration
The frontend should now be able to:
1. ✅ Get curriculum structure
2. ✅ Get exercises for each topic
3. ✅ Get adaptive exercises based on mastery
4. ✅ Submit answers and track progress
5. ✅ Generate new questions dynamically
6. ✅ Get hints when stuck
7. ✅ Get detailed explanations
8. ✅ Chat with AI tutor
9. ✅ See learning recommendations

## Testing
Example requests:

```bash
# Get curriculum
curl http://localhost:8000/api/academic/curriculum

# Get exercises for topic 1
curl http://localhost:8000/api/academic/exercises/topic/1

# Generate a new question (requires auth)
curl -X POST http://localhost:8000/api/academic/question/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{ "topic_id": 1, "skill_name": "Arithmetic", "difficulty": 0.5 }'

# Submit an answer (requires auth)
curl -X POST http://localhost:8000/api/academic/question/submit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{ "exercise_id": 1, "user_answer": "5" }'
```

## What's New
### ✅ Completed in this implementation:
1. Fixed all Python import issues (relative → absolute)
2. Created ExerciseService with AI integration
3. Implemented 40+ academic endpoints
4. Added exercise seed data
5. Connected to AI Tutor for dynamic generation
6. Added adaptive exercise selection
7. Integrated hint generation
8. Integrated explanation generation
9. Added learning progress tracking
10. Added personalized recommendations

### ⚠️ Fallbacks
If AI Tutor is unavailable:
- Exercises still load from seed data
- Hints and explanations use fallback templates
- System continues to work with reduced functionality

## Next Steps
1. Start AI Tutor: `cd ai-tutor && npm run dev`
2. Start Backend: `cd backend && uvicorn main:app --reload`
3. Frontend should now show exercises and track progress!
