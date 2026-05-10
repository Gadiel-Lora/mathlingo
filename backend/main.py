from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend import models  # noqa: F401
from backend.core.database import create_tables
from backend.routes import (
    academic,
    adaptive,
    admin,
    attempts,
    auth,
    certificates,
    diagnostic,
    learning,
    module as modules,
    progress,
    topics,
    users,
)
from backend.services.academic_service import bootstrap_curriculum_data
from backend.services.exercise_service import ExerciseService
from backend.core.database import SessionLocal


@asynccontextmanager
async def lifespan(_: FastAPI):
    """Initialize database tables in the configured DATABASE_URL on startup."""
    create_tables()
    bootstrap_curriculum_data()
    
    # Load exercise seed data
    db = SessionLocal()
    try:
        await ExerciseService.seed_exercises(db)
    finally:
        db.close()
    
    yield


app = FastAPI(title='Mathlingo API', lifespan=lifespan)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(progress.router)
app.include_router(modules.router)
app.include_router(users.router)
app.include_router(topics.router)
app.include_router(attempts.router)
app.include_router(adaptive.router)
app.include_router(diagnostic.router)
app.include_router(certificates.router)
app.include_router(academic.router)
app.include_router(learning.router)
app.include_router(admin.router)


@app.get('/')
def root():
    """Simple health check endpoint."""
    return {'status': 'ok'}
