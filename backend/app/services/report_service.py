"""Database operations for citizen reports."""
from sqlalchemy import select
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models import CitizenReport, Hazard
from app.schemas import HazardStatus, ReportCreate


def create_report(db: Session, data: ReportCreate, photo_filename: Optional[str]) -> CitizenReport:
    """Store a new citizen report together with the hazard it describes.

    For now every report creates its own Hazard (one-to-one). Because the two are separate
    tables, later duplicate detection can point many reports at a single hazard without
    touching the original submissions.
    """
    hazard = Hazard(
        hazard_type=data.hazard_type.value,
        latitude=data.latitude,
        longitude=data.longitude,
        address=data.street,
        city=data.city,
        status=HazardStatus.OPEN.value,
    )
    report = CitizenReport(description=data.description, photo_path=photo_filename, reported_severity=data.reported_severity.value, hazard=hazard)
    db.add(report)  # the hazard is saved too, via the relationship
    db.commit()
    db.refresh(report)
    return report


def list_reports(db: Session, limit: int, offset: int) -> List[CitizenReport]:
    statement = (
        select(CitizenReport)
        .options(joinedload(CitizenReport.hazard))
        .order_by(CitizenReport.created_at.desc(), CitizenReport.id.desc())
        .limit(limit)
        .offset(offset)
    )
    return list(db.scalars(statement))


def get_report(db: Session, report_id: int) -> Optional[CitizenReport]:
    return db.get(CitizenReport, report_id, options=[joinedload(CitizenReport.hazard)])
def get_report_by_tracking_code(
    db: Session,
    tracking_code: str,
) -> Optional[CitizenReport]:
    """Find a citizen report using its private tracking code."""

    statement = (
        select(CitizenReport)
        .options(joinedload(CitizenReport.hazard))
        .where(CitizenReport.tracking_code == tracking_code)
    )

    return db.scalars(statement).first()