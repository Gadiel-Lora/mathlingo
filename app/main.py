from fastapi import FastAPI

from app.core.database import Base, engine
from app.routes import auth, module as modules, progress, users

Base.metadata.create_all(bind=engine)

app = FastAPI(title='Mathlingo API')

app.include_router(auth.router)
app.include_router(progress.router)
app.include_router(modules.router)
app.include_router(users.router)


@app.get('/')
def root():
    return {'status': 'ok'}
