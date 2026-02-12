from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from app.core.config import settings

DATABASE_URL = settings.DATABASE_URL

# Use SQLite connect args only when the URL requires it.
connect_args = {}
if DATABASE_URL.startswith('sqlite'):
    connect_args = {'check_same_thread': False}

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

Base = declarative_base()


def get_db():
    """Yield a database session for request-scoped usage."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_tables() -> None:
    """Create all tables for the current metadata."""
    Base.metadata.create_all(bind=engine)
