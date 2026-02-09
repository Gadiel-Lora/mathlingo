# Mathlingo

Mathlingo es una app educativa con backend en FastAPI (API REST con JWT) y frontend en React + Vite. El backend se mantiene **solo** como API y el frontend consume esas rutas sin plantillas.

**Arquitectura**
1. Backend: FastAPI (API REST, JWT, SQLite).
2. Frontend: React + Vite (consume la API por HTTP).

**Tecnologías**
1. Python 3.12, FastAPI, SQLAlchemy, SQLite, JWT.
2. React 18, Vite, Axios.

**Ejecución local**
1. Backend: crea `.env` en la raíz si no existe.
2. Variables mínimas en `.env`:
`DATABASE_URL=sqlite:///./mathlingo.db`
`SECRET_KEY=supersecretkey`
`ALGORITHM=HS256`
`ACCESS_TOKEN_EXPIRE_MINUTES=60`
3. Instala dependencias y levanta:
`.\.venv\Scripts\python -m uvicorn app.main:app --reload --port 8001`
4. Frontend:
`cd frontend`
`npm install`
`npm run dev`
5. En `frontend/.env`:
`VITE_API_URL=http://127.0.0.1:8001`

**Deploy Backend (Render)**
1. `render.yaml` ya define la app, el disco persistente y variables de entorno.
2. La base SQLite se guarda en `/var/data/mathlingo.db` (disco persistente).
3. Render requiere plan de pago para discos persistentes.
4. Variables recomendadas:
`DATABASE_URL=sqlite:////var/data/mathlingo.db`
`SECRET_KEY` (generado en Render)
`ALGORITHM=HS256`
`ACCESS_TOKEN_EXPIRE_MINUTES=60`

**Deploy Frontend (Vercel)**
1. Importa el repo y configura `Root Directory = frontend`.
2. Build: `npm run build`.
3. Output: `dist`.
4. En Variables de Entorno agrega `VITE_API_URL` con la URL pública del backend.

**Endpoints principales**
1. `POST /auth/register`
2. `POST /auth/token`
3. `GET /modules/`
4. `POST /modules/`
5. `GET /progress/`
6. `POST /progress/`
7. `GET /progress/summary`
8. `POST /users/promote`

**Tests**
1. Ejecuta `pytest`.
2. Los tests usan una DB temporal y no tocan la DB real.

**Por qué Python solo como API**
El backend mantiene la lógica y seguridad, mientras el frontend evoluciona de forma independiente.
