
"""Application settings, read from environment variables and backend/.env."""

import os
from dataclasses import dataclass
from pathlib import Path
from typing import List

from dotenv import load_dotenv

# This file lives in backend/app/, so BASE_DIR is backend/.
BASE_DIR = Path(__file__).resolve().parent.parent

# Real environment variables take precedence over .env.
load_dotenv(BASE_DIR / ".env")

_SQLITE_PREFIX = "sqlite:///"


def _resolve_path(value: str) -> Path:
    path = Path(value)
    return path if path.is_absolute() else (BASE_DIR / path).resolve()


def _resolve_database_url(raw: str) -> str:
    """Resolve local SQLite paths and configure PostgreSQL for psycopg 3."""

    if raw.startswith(_SQLITE_PREFIX):
        location = raw[len(_SQLITE_PREFIX):]
        if location and location != ":memory:" and not Path(location).is_absolute():
            return _SQLITE_PREFIX + (BASE_DIR / location).resolve().as_posix()
        return raw

    # Use the installed psycopg 3 driver for Neon/PostgreSQL.
    if raw.startswith("postgres://"):
        return "postgresql+psycopg://" + raw[len("postgres://"):]

    if raw.startswith("postgresql://"):
        return "postgresql+psycopg://" + raw[len("postgresql://"):]

    return raw


@dataclass(frozen=True)
class Settings:
    app_name: str
    version: str
    database_url: str
    upload_dir: Path
    max_upload_bytes: int
    cors_origins: List[str]


def load_settings() -> Settings:
    origins = os.getenv("CORS_ORIGINS", "http://localhost:5173")

    return Settings(
        app_name=os.getenv("APP_NAME", "HazardAtlas API"),
        version="0.1.0",
        database_url=_resolve_database_url(
            os.getenv("DATABASE_URL", "sqlite:///./hazardatlas.db")
        ),
        upload_dir=_resolve_path(os.getenv("UPLOAD_DIR", "uploads")),
        max_upload_bytes=int(float(os.getenv("MAX_UPLOAD_MB", "5")) * 1024 * 1024),
        cors_origins=[origin.strip() for origin in origins.split(",") if origin.strip()],
    )


settings = load_settings()
