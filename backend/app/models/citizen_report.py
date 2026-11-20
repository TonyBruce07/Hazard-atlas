import secrets
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base, utcnow

if TYPE_CHECKING:
    from app.models.hazard import Hazard


def generate_tracking_code() -> str:
    """Generate a secure, random citizen-facing tracking code."""
    return secrets.token_urlsafe(16).upper()


class CitizenReport(Base):
    """One citizen's original submission."""
    reported_severity: Mapped[str] = mapped_column(
    String(20),
    nullable=False,
    default="medium",
)

    __tablename__ = "citizen_reports"

    id: Mapped[int] = mapped_column(primary_key=True)

    tracking_code: Mapped[str] = mapped_column(
        String(32),
        unique=True,
        index=True,
        nullable=False,
        default=generate_tracking_code,
    )

    hazard_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("hazards.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    description: Mapped[str] = mapped_column(Text)

    photo_path: Mapped[Optional[str]] = mapped_column(
    Text,
    nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utcnow,
        index=True,
    )

    hazard: Mapped[Optional["Hazard"]] = relationship(
        back_populates="reports"
    )