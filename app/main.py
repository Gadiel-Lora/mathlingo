from fastapi import FastAPI

from app.core.database import Base, engine
from app.routes import adaptive, attempts, auth, diagnostic, module as modules, progress, topics, users

Base.metadata.create_all(bind=engine)

app = FastAPI(title='Mathlingo API')

app.include_router(auth.router)
app.include_router(progress.router)
app.include_router(modules.router)
app.include_router(users.router)
app.include_router(topics.router)
app.include_router(attempts.router)
app.include_router(adaptive.router)
app.include_router(diagnostic.router)


@app.get('/')
def root():
    """Simple health check endpoint."""
    return {'status': 'ok'}
