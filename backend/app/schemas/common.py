from datetime import datetime, timezone
from typing import Annotated

from pydantic import AfterValidator, BaseModel, ConfigDict


def _as_utc(value: datetime) -> datetime:
    # SQLite returns naive datetimes; everything we store is UTC, so say so explicitly in the API.
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value


UTCDatetime = Annotated[datetime, AfterValidator(_as_utc)]


class ORMModel(BaseModel):
    """Base for response models built from SQLAlchemy objects."""

    model_config = ConfigDict(from_attributes=True)
