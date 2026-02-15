from fastapi import FastAPI

import app.models  # noqa: F401
from app.core.database import create_tables
from app.routes import adaptive, attempts, auth, certificates, diagnostic, module as modules, progress, topics, users

app = FastAPI(title='Mathlingo API')


@app.on_event('startup')
def on_startup() -> None:
    """Initialize database tables in the configured DATABASE_URL on startup."""
    create_tables()

app.include_router(auth.router)
app.include_router(progress.router)
app.include_router(modules.router)
app.include_router(users.router)
app.include_router(topics.router)
app.include_router(attempts.router)
app.include_router(adaptive.router)
app.include_router(diagnostic.router)
app.include_router(certificates.router)


@app.get('/')
def root():
    """Simple health check endpoint."""
    return {'status': 'ok'}
