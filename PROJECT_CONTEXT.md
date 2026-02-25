# Project Context - Mathlingo

Last update: 2026-02-25

## 1) What this project is today

Mathlingo is currently a multi-part learning platform:

1. Frontend: React + Vite (`frontend/`) with Supabase auth/progress.
2. Academic backend: Node + Express (`backend/`) for curriculum, adaptive questions, attempt flow, tutor help, and final exams.
3. Legacy/core backend: FastAPI (`app/`) with users, modules, progress, mastery engine, adaptive exercise engine, and certificates.
4. Shared curriculum package: JS curriculum definitions (`curriculum/`) consumed by the Node backend.

The product direction shown by recent commits is focused on:
- grade-based learning paths,
- adaptive question difficulty,
- AI tutor help with fallback behavior,
- final exam mode with stricter rules,
- Supabase-backed user session/progress in frontend.

## 2) Current architecture map

### Frontend (`frontend/`)

- Routing and pages:
  - `src/App.jsx`
  - `src/pages/Dashboard.jsx`
  - `src/pages/Course.jsx`
  - `src/pages/Lesson.jsx`
  - `src/pages/Branch.jsx`
- State:
  - `src/context/AuthContext.jsx` (Supabase auth session)
  - `src/context/ProgressContext.jsx` (Supabase progress table)
- Academic API client:
  - `src/services/academicApi.js`
  - default base URL uses `VITE_AI_API_URL` or `http://localhost:4010`
- Curriculum helpers:
  - `src/lib/academicCurriculum.js`
- Question UI:
  - `src/components/questions/QuestionCard.jsx`

### Node academic backend (`backend/`)

- Entrypoint:
  - `backend/server.js`
- Main API controller:
  - `backend/controllers/academicController.js`
- Engines:
  - `backend/academic/questionEngine.js`
  - `backend/academic/attemptManager.js`
  - `backend/academic/tutorAI.js`
  - `backend/academic/finalExamGenerator.js`
  - `backend/academic/xpSystem.js`

### Shared curriculum (`curriculum/`)

- Aggregation and indexes:
  - `curriculum/index.js`
- Grade definitions:
  - `curriculum/grades/grade1.js` ... `curriculum/grades/grade5.js`
- Shared helpers:
  - `curriculum/core/shared.js`

### FastAPI backend (`app/`)

- Entrypoint:
  - `app/main.py`
- Routes:
  - auth/progress/modules/users/topics/attempts/adaptive/diagnostic/certificates
- Services:
  - mastery engine (`app/services/mastery_engine.py`)
  - adaptive engine (`app/services/adaptation_engine.py`)
  - auth/progress/module/certificate services

## 3) Functional status (what is already done)

### Learning flow (frontend + Node backend)

Implemented:
1. Dashboard loads curriculum cards and branch cards from academic API.
2. Course view resolves grade lessons and locks lessons progressively.
3. Lesson view generates dynamic questions and tracks question state.
4. Attempt flow:
   - max attempts = 3,
   - hint then full-solution behavior,
   - lock after full help or max attempts,
   - XP only on valid conditions.
5. Adaptive difficulty updates through `/api/academic/level/update`.
6. Final grade exam generation and exam rules (no AI help, pass threshold, XP multiplier).

### FastAPI domain (legacy/core)

Implemented:
1. JWT auth, registration, token login.
2. Module and progress management.
3. Mastery update model with criticality, thresholds, decay/revalidation logic.
4. Adaptive next-exercise selection based on mastery/dependencies.
5. Certificate verification endpoint.

## 4) Current quality checks

Executed in this workspace:

1. Backend tests (FastAPI): `12 passed`
2. Frontend production build: `vite build` successful

Notes:
- FastAPI tests show deprecation warnings (Pydantic v2 config style, FastAPI startup event, `datetime.utcnow` usage).
- No automated tests found for `backend/` Node academic API or frontend UI behavior.

## 5) Key risks / inconsistencies to resolve

1. Two backend worlds coexist (FastAPI and Node academic API) with different responsibilities and storage models.
2. Academic question/attempt state in Node backend is in-memory (`Map`), so progress resets on backend restart.
3. API port mismatch risk:
   - frontend default: `http://localhost:4010`
   - Node backend default in code: `PORT || 4000`
   This needs explicit env alignment.
4. Root `README.md` does not fully describe the current dual-backend + Supabase architecture.
5. Missing explicit `.env.example` files for `frontend/` and `backend/`.

## 6) Recommended source-of-truth boundaries

If current direction remains unchanged, use this ownership model:

1. Frontend auth/progress identity: Supabase (`frontend/src/context/*`, `frontend/src/supabase/client.js`).
2. Academic runtime logic: Node backend (`backend/academic/*` + `curriculum/*`).
3. FastAPI backend: keep for mastery/certificate APIs only if still needed by product roadmap, otherwise plan merge/deprecation.

## 7) Local run checklist (ordered)

1. Start Node academic backend:
   - `cd backend`
   - `npm install`
   - `npm start`
2. Start frontend:
   - `cd frontend`
   - `npm install`
   - `npm run dev`
3. Ensure frontend env points to Node backend:
   - `VITE_AI_API_URL=http://localhost:<NODE_PORT>`
4. For FastAPI work/tests only:
   - from repo root: `.\.venv\Scripts\python -m pytest -q`

## 8) Immediate cleanup backlog (priority order)

1. Align and document ports/env vars across frontend + backend.
2. Add `frontend/.env.example` and `backend/.env.example`.
3. Update root README to reflect real architecture and startup paths.
4. Add tests for Node `academicController` flows (generate/help/submit/final exam).
5. Decide long-term role of FastAPI vs Node academic backend to reduce duplication.
