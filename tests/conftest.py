import os

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Force test environment values before importing the app.
os.environ['DATABASE_URL'] = 'sqlite:///./test_default.db'
os.environ['SECRET_KEY'] = 'testsecret'
os.environ['ALGORITHM'] = 'HS256'
os.environ['ACCESS_TOKEN_EXPIRE_MINUTES'] = '60'

from app.main import app
from app.core import database as db_module
from app.core import deps as deps_module
from app.core.database import Base
import app.models  # noqa: F401


@pytest.fixture()
def client(tmp_path):
    db_path = tmp_path / 'test.db'
    engine = create_engine(
        f'sqlite:///{db_path}',
        connect_args={'check_same_thread': False},
    )
    TestingSessionLocal = sessionmaker(
        autocommit=False,
        autoflush=False,
        bind=engine,
    )

    Base.metadata.create_all(bind=engine)

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[db_module.get_db] = override_get_db
    app.dependency_overrides[deps_module.get_db] = override_get_db

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)
