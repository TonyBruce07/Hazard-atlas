
from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base, utcnow

if TYPE_CHECKING:
    from app.models.citizen_report import CitizenReport
    from app.models.hazard_history import HazardHistory


class Hazard(Base):
    """A real-world road hazard with authority and resolution tracking."""

    __tablename__ = "hazards"

    id: Mapped[int] = mapped_column(primary_key=True)

    hazard_type: Mapped[str] = mapped_column(String(50), index=True)
    latitude: Mapped[Optional[float]] = mapped_column(nullable=True)
    longitude: Mapped[Optional[float]] = mapped_column(nullable=True)
    address: Mapped[str] = mapped_column(String(255))
    city: Mapped[str] = mapped_column(String(100), index=True)

    status: Mapped[str] = mapped_column(
        String(30), default="open", index=True
    )
    severity: Mapped[str] = mapped_column(
        String(20), default="medium", index=True
    )
    priority_score: Mapped[int] = mapped_column(
        Integer, default=0, index=True
    )
    assigned_authority: Mapped[Optional[str]] = mapped_column(
        String(100), nullable=True
    )

    # Resolution tracking
    resolution_notes: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True
    )
    resolved_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    resolved_by: Mapped[Optional[str]] = mapped_column(
        String(100), nullable=True
    )

    # Verification tracking
    verified_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    verified_by: Mapped[Optional[str]] = mapped_column(
        String(100), nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )

    reports: Mapped[List["CitizenReport"]] = relationship(
        back_populates="hazard"
    )

    # Permanent audit history
    history: Mapped[List["HazardHistory"]] = relationship(
        back_populates="hazard",
        cascade="all, delete-orphan",
        order_by="HazardHistory.created_at",
    )
