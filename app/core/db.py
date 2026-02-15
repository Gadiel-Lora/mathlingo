import os

from sqlalchemy import create_engine
from sqlalchemy.engine import make_url
from sqlalchemy.orm import declarative_base, sessionmaker

from app.core.config import settings

# Load .env values in local environments when python-dotenv is available.
try:
    from dotenv import load_dotenv
except ModuleNotFoundError:  # pragma: no cover - optional dependency
    load_dotenv = None

if load_dotenv is not None:
    load_dotenv()

# PostgreSQL URL is resolved from environment first, then settings fallback.
DATABASE_URL = os.getenv('DATABASE_URL', settings.DATABASE_URL)
if not DATABASE_URL:
    raise RuntimeError('DATABASE_URL is required to initialize the database engine')

engine = create_engine(
    DATABASE_URL,
    # Keep connections healthy in long-running API workers.
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

Base = declarative_base()


def get_db():
    """Yield a request-scoped SQLAlchemy session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _safe_db_url(raw_url: str) -> str:
    """Return a DSN with hidden password for startup logging."""
    return make_url(raw_url).render_as_string(hide_password=True)


def create_tables() -> None:
    """Create all mapped tables after importing the model registry."""
    import app.models  # noqa: F401

    # Startup trace to verify create_all targets the expected PostgreSQL database.
    print(f'Database URL: {_safe_db_url(DATABASE_URL)}')
    table_names = sorted(Base.metadata.tables.keys())
    print(f"Preparing to create tables: {', '.join(table_names)}")
    Base.metadata.create_all(bind=engine)
