from contextlib import asynccontextmanager

from fastapi import FastAPI

from backend import models  # noqa: F401
from backend.core.database import create_tables
from backend.routes import adaptive, attempts, auth, certificates, diagnostic, module as modules, progress, topics, users, academic
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


@app.get('/')
def root():
    """Simple health check endpoint."""
    return {'status': 'ok'}
