# Mathlingo

Mathlingo is an educational app with a FastAPI backend (REST API with JWT) and a React + Vite frontend. The backend stays API-only and the frontend consumes it over HTTP.

**Architecture**
1. Backend: FastAPI (REST, JWT, SQLite).
2. Frontend: React + Vite (API client).

**Technologies**
1. Python 3.12, FastAPI, SQLAlchemy, SQLite, JWT.
2. React 18, Vite, Axios.

**Local setup**
1. Backend: create `.env` in the repo root if missing.
2. Minimal `.env` values:
`DATABASE_URL=sqlite:///./mathlingo.db`
`SECRET_KEY=supersecretkey`
`ALGORITHM=HS256`
`ACCESS_TOKEN_EXPIRE_MINUTES=60`
3. Start backend:
`\.\.venv\Scripts\python -m uvicorn app.main:app --reload --port 8001`
4. Frontend:
`cd frontend`
`npm install`
`npm run dev`
5. Frontend env in `frontend/.env`:
`VITE_API_URL=http://127.0.0.1:8001`

**Backend deploy (Render)**
1. `render.yaml` defines the service, disk, and env vars.
2. SQLite file lives at `/var/data/mathlingo.db` on the persistent disk.
3. Env vars:
`DATABASE_URL=sqlite:////var/data/mathlingo.db`
`SECRET_KEY` (generated on Render)
`ALGORITHM=HS256`
`ACCESS_TOKEN_EXPIRE_MINUTES=60`

**Frontend deploy (Vercel)**
1. Import repo in Vercel.
2. Project settings:
`Framework Preset: Vite`
`Root Directory: frontend`
`Install Command: npm install`
`Build Command: npm run build`
`Output Directory: dist`
3. Env vars:
`VITE_API_URL=https://mathlingo-backend.onrender.com`
4. Redeploy with "Clear cache" enabled.
5. Example public URL:
`https://mathlingo.vercel.app`
6. Keep `frontend/.env` for local dev only; Vercel uses dashboard env vars.

**Main endpoints**
1. `POST /auth/register`
2. `POST /auth/token`
3. `GET /modules/`
4. `POST /modules/`
5. `GET /progress/`
6. `POST /progress/`
7. `GET /progress/summary`
8. `POST /users/promote`

**Tests**
1. Backend + API contract tests (httpx):
`pytest`
2. Tests use a temporary SQLite DB and do not touch production data.

**Why Python only as API**
The backend focuses on security and data. The frontend evolves independently.


