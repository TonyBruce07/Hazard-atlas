
"""SQLAlchemy engine, session factory, declarative base and safe MVP schema migration."""

from datetime import datetime, timezone
from typing import Iterator

from sqlalchemy import create_engine, event, inspect, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import settings

_is_sqlite = settings.database_url.startswith("sqlite")

engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False} if _is_sqlite else {},
)

if _is_sqlite:

    @event.listens_for(engine, "connect")
    def _enable_foreign_keys(dbapi_connection, _record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def get_db() -> Iterator[Session]:
    """FastAPI dependency: one session per request, always closed."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _migrate_sqlite() -> None:
    """Safely add new MVP columns to existing SQLite databases."""

    inspector = inspect(engine)

    if "hazards" in inspector.get_table_names():
        existing_columns = {
            column["name"]
            for column in inspector.get_columns("hazards")
        }

        migrations = {
            "severity": "VARCHAR(20) NOT NULL DEFAULT 'medium'",
            "priority_score": "INTEGER NOT NULL DEFAULT 0",
            "assigned_authority": "VARCHAR(100)",
            "updated_at": "DATETIME",
            "resolution_notes": "TEXT",
            "resolved_at": "DATETIME",
            "resolved_by": "VARCHAR(100)",
            "verified_at": "DATETIME",
            "verified_by": "VARCHAR(100)",
        }

        with engine.begin() as connection:
            for column_name, column_definition in migrations.items():
                if column_name not in existing_columns:
                    connection.execute(
                        text(
                            f"ALTER TABLE hazards ADD COLUMN "
                            f"{column_name} {column_definition}"
                        )
                    )

            connection.execute(
                text(
                    "UPDATE hazards SET updated_at = created_at "
                    "WHERE updated_at IS NULL"
                )
            )

    # Add tracking codes to existing citizen reports.
    inspector = inspect(engine)

    if "citizen_reports" in inspector.get_table_names():
        report_columns = {
            column["name"]
            for column in inspector.get_columns("citizen_reports")
        }

        with engine.begin() as connection:
            if "tracking_code" not in report_columns:
                connection.execute(
                    text(
                        "ALTER TABLE citizen_reports "
                        "ADD COLUMN tracking_code VARCHAR(32)"
                    )
                )
            if "reported_severity" not in report_columns:
                connection.execute(
                    text(
                        "ALTER TABLE citizen_reports "
                        "ADD COLUMN reported_severity VARCHAR(20) "
                        "NOT NULL DEFAULT 'medium'"
                    )
                )

            # Backfill existing reports that don't have a tracking code.
            from secrets import token_urlsafe

            existing_codes = set(
                connection.execute(
                    text(
                        "SELECT tracking_code FROM citizen_reports "
                        "WHERE tracking_code IS NOT NULL"
                    )
                ).scalars()
            )

            rows = connection.execute(
                text(
                    "SELECT id FROM citizen_reports "
                    "WHERE tracking_code IS NULL"
                )
            ).scalars().all()

            for report_id in rows:
                while True:
                    code = token_urlsafe(16).upper()
                    if code not in existing_codes:
                        existing_codes.add(code)
                        break

                connection.execute(
                    text(
                        "UPDATE citizen_reports "
                        "SET tracking_code = :code WHERE id = :report_id"
                    ),
                    {"code": code, "report_id": report_id},
                )

            connection.execute(
                text(
                    "CREATE UNIQUE INDEX IF NOT EXISTS "
                    "ix_citizen_reports_tracking_code "
                    "ON citizen_reports (tracking_code)"
                )
            )


def init_db() -> None:
    """Register models, create missing tables and migrate existing SQLite schema."""

    from app import models  # noqa: F401

    Base.metadata.create_all(bind=engine)

    if _is_sqlite:
        _migrate_sqlite()
