import os
from pathlib import Path
from typing import Protocol

DEFAULT_DATABASE_URL = "sqlite:///./mathlingo.db"
DEFAULT_SECRET_KEY = "supersecretkey"
DEFAULT_ALGORITHM = "HS256"
DEFAULT_ACCESS_TOKEN_EXPIRE_MINUTES = 60


def _load_dotenv(path: str = ".env") -> None:
    env_path = Path(path)
    if not env_path.exists():
        return

    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        key, _, value = line.partition("=")
        if not key:
            continue
        os.environ.setdefault(key.strip(), value.strip())


class SettingsProtocol(Protocol):
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int


try:
    from pydantic_settings import BaseSettings as _PydanticBaseSettings
except ModuleNotFoundError:
    _PydanticBaseSettings = None


if _PydanticBaseSettings is not None:
    class _PydanticSettings(_PydanticBaseSettings):
        DATABASE_URL: str = DEFAULT_DATABASE_URL
        SECRET_KEY: str = DEFAULT_SECRET_KEY
        ALGORITHM: str = DEFAULT_ALGORITHM
        ACCESS_TOKEN_EXPIRE_MINUTES: int = DEFAULT_ACCESS_TOKEN_EXPIRE_MINUTES

        class Config:
            env_file = ".env"

    settings: SettingsProtocol = _PydanticSettings()
else:
    _load_dotenv()

    class _FallbackSettings:
        DATABASE_URL: str = os.getenv("DATABASE_URL", DEFAULT_DATABASE_URL)
        SECRET_KEY: str = os.getenv("SECRET_KEY", DEFAULT_SECRET_KEY)
        ALGORITHM: str = os.getenv("ALGORITHM", DEFAULT_ALGORITHM)
        ACCESS_TOKEN_EXPIRE_MINUTES: int = int(
            os.getenv(
                "ACCESS_TOKEN_EXPIRE_MINUTES",
                str(DEFAULT_ACCESS_TOKEN_EXPIRE_MINUTES),
            )
        )

    settings: SettingsProtocol = _FallbackSettings()
