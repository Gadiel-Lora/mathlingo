from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import declarative_base, sessionmaker

from app.core.config import settings

DATABASE_URL = settings.DATABASE_URL

# SQLite needs check_same_thread=False, PostgreSQL does not.
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
    """Yield a request-scoped SQLAlchemy session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _ensure_sqlite_column(table_name: str, column_name: str, ddl: str) -> None:
    """Apply a lightweight SQLite migration when a column is missing."""
    if not DATABASE_URL.startswith('sqlite'):
        return

    inspector = inspect(engine)
    if table_name not in inspector.get_table_names():
        return

    existing_columns = {column['name'] for column in inspector.get_columns(table_name)}
    if column_name in existing_columns:
        return

    with engine.begin() as connection:
        connection.execute(text(ddl))


def _run_compat_migrations() -> None:
    _ensure_sqlite_column(
        table_name='exercises',
        column_name='topic_id',
        ddl='ALTER TABLE exercises ADD COLUMN topic_id INTEGER',
    )


def create_tables() -> None:
    """Create all mapped tables."""
    Base.metadata.create_all(bind=engine)
    _run_compat_migrations()
