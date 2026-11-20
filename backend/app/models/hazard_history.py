
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base, utcnow


class HazardHistory(Base):
    """Permanent record of changes made to a road hazard."""

    __tablename__ = "hazard_history"

    id: Mapped[int] = mapped_column(primary_key=True)

    hazard_id: Mapped[int] = mapped_column(
        ForeignKey("hazards.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )

    action: Mapped[str] = mapped_column(
        String(50), nullable=False, index=True
    )

    previous_status: Mapped[Optional[str]] = mapped_column(
        String(30), nullable=True
    )

    new_status: Mapped[Optional[str]] = mapped_column(
        String(30), nullable=True
    )

    previous_severity: Mapped[Optional[str]] = mapped_column(
        String(20), nullable=True
    )

    new_severity: Mapped[Optional[str]] = mapped_column(
        String(20), nullable=True
    )

    assigned_authority: Mapped[Optional[str]] = mapped_column(
        String(100), nullable=True
    )

    notes: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True
    )

    performed_by: Mapped[Optional[str]] = mapped_column(
        String(100), nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utcnow,
        nullable=False,
        index=True,
    )

    hazard = relationship(
        "Hazard",
        back_populates="history",
    )
