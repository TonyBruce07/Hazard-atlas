
"""MVP authority dashboard and hazard-management API."""

from typing import Optional
from collections import Counter
from datetime import datetime
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload
from app.auth import require_authority
from app.database import get_db, utcnow
from app.models import Hazard, HazardHistory
from app.schemas import (
    AuthorityDashboardStats,
    AuthorityHazardUpdate,
    HazardRead,
)
from app.services.priority_service import (
    calculate_priority_breakdown,
    is_hazard_overdue,
)

router = APIRouter(
    prefix="/authority",
    tags=["Authority dashboard"],
    dependencies=[Depends(require_authority)],
)


def _priority_details(hazard: Hazard) -> dict:
    return calculate_priority_breakdown(
        severity=hazard.severity or "medium",
        hazard_type=hazard.hazard_type,
        report_count=max(len(hazard.reports), 1),
        created_at=hazard.created_at,
    )


def _priority(hazard: Hazard) -> int:
    return _priority_details(hazard)["score"]


def _attach_risk_details(hazard: Hazard) -> None:
    hazard.priority_breakdown = _priority_details(hazard)

    overdue, overdue_days = is_hazard_overdue(
        status=hazard.status,
        created_at=hazard.created_at,
    )

    hazard.is_overdue = overdue
    hazard.overdue_days = overdue_days


def _get_hazards(db: Session):
    return list(
        db.scalars(
            select(Hazard).options(
                selectinload(Hazard.reports)
            )
        )
    )


def _add_history(
    db: Session,
    hazard: Hazard,
    action: str,
    previous_status: Optional[str] = None,
    new_status: Optional[str] = None,
    previous_severity: Optional[str] = None,
    new_severity: Optional[str] = None,
    assigned_authority: Optional[str] = None,
    notes: Optional[str] = None,
    performed_by: Optional[str] = None,
):
    """Create a permanent audit-history entry."""

    db.add(
        HazardHistory(
            hazard_id=hazard.id,
            action=action,
            previous_status=previous_status,
            new_status=new_status,
            previous_severity=previous_severity,
            new_severity=new_severity,
            assigned_authority=assigned_authority,
            notes=notes,
            performed_by=performed_by,
            created_at=utcnow(),
        )
    )


@router.get(
    "/dashboard",
    response_model=AuthorityDashboardStats,
)

def dashboard_stats(db: Session = Depends(get_db)):
    hazards = _get_hazards(db)
    scores = [_priority(hazard) for hazard in hazards]

    total = len(hazards)

    open_count = sum(
        hazard.status in (
            "open",
            "reported",
            "under_review",
            "acknowledged",
        )
        for hazard in hazards
    )

    in_progress = sum(
        hazard.status == "in_progress"
        for hazard in hazards
    )

    resolved = sum(
        hazard.status in ("resolved", "verified")
        for hazard in hazards
    )

    return AuthorityDashboardStats(
        total_hazards=total,
        open_hazards=open_count,
        in_progress_hazards=in_progress,
        resolved_hazards=resolved,
        critical_hazards=sum(
            score >= 80 for score in scores
        ),
        high_priority_hazards=sum(
            60 <= score < 80 for score in scores
        ),
        average_priority=(
            round(sum(scores) / total, 1)
            if total
            else 0.0
        ),
    )
@router.get("/analytics")
def authority_analytics(db: Session = Depends(get_db)):
    """Return aggregated road-safety analytics for the authority dashboard."""

    hazards = _get_hazards(db)

    total = len(hazards)

    # Category distribution
    category_counts = Counter(
        (hazard.hazard_type or "other").lower()
        for hazard in hazards
    )

    category_distribution = [
        {"category": category, "count": count}
        for category, count in sorted(
            category_counts.items(),
            key=lambda item: item[1],
            reverse=True,
        )
    ]

    # Severity distribution, including categories with zero records
    severity_counts = Counter(
        (hazard.severity or "medium").lower()
        for hazard in hazards
    )

    severity_distribution = [
        {
            "severity": severity,
            "count": severity_counts.get(severity, 0),
        }
        for severity in ("low", "medium", "high", "critical")
    ]

    # Status distribution
    status_counts = Counter(
        (hazard.status or "open").lower()
        for hazard in hazards
    )

    status_distribution = [
        {"status": status, "count": count}
        for status, count in sorted(status_counts.items())
    ]

    # Monthly reporting trend: last six calendar months
    now = datetime.utcnow()
    current_month = now.year * 12 + now.month - 1

    monthly_counts = Counter()

    for hazard in hazards:
        created_at = hazard.created_at

        if created_at is None:
            continue

        month_key = created_at.year * 12 + created_at.month - 1
        monthly_counts[month_key] += 1

    monthly_trend = []

    for offset in range(5, -1, -1):
        month_key = current_month - offset
        year = month_key // 12
        month = month_key % 12 + 1

        monthly_trend.append({
            "month": f"{year}-{month:02d}",
            "count": monthly_counts.get(month_key, 0),
        })

    # Resolution performance
    resolved_hazards = [
        hazard
        for hazard in hazards
        if hazard.status in ("resolved", "verified")
    ]

    resolved_count = len(resolved_hazards)

    resolution_rate = (
        round((resolved_count / total) * 100, 1)
        if total
        else 0.0
    )

    resolution_durations = []

    for hazard in resolved_hazards:
        if hazard.created_at and hazard.resolved_at:
            duration = (
                hazard.resolved_at - hazard.created_at
            ).total_seconds() / 86400

            resolution_durations.append(max(duration, 0))

    average_resolution_days = (
        round(
            sum(resolution_durations) / len(resolution_durations),
            1,
        )
        if resolution_durations
        else 0.0
    )

    return {
        "total_hazards": total,
        "resolved_hazards": resolved_count,
        "resolution_rate": resolution_rate,
        "average_resolution_days": average_resolution_days,
        "category_distribution": category_distribution,
        "severity_distribution": severity_distribution,
        "status_distribution": status_distribution,
        "monthly_trend": monthly_trend,
    }

@router.get(
    "/hazards",
    response_model=list[HazardRead],
)
def list_authority_hazards(
    status: Optional[str] = Query(default=None),
    hazard_type: Optional[str] = Query(default=None),
    city: Optional[str] = Query(default=None),
    search: Optional[str] = Query(default=None),
    sort: str = Query(
        default="priority",
        pattern="^(priority|newest|oldest)$",
    ),
    limit: int = Query(default=100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    hazards = _get_hazards(db)

    if status:
        hazards = [
            hazard
            for hazard in hazards
            if hazard.status.lower() == status.lower()
        ]

    if hazard_type:
        hazards = [
            hazard
            for hazard in hazards
            if hazard.hazard_type.lower() == hazard_type.lower()
        ]

    if city:
        hazards = [
            hazard
            for hazard in hazards
            if city.lower() in hazard.city.lower()
        ]

    if search:
        term = search.lower()

        hazards = [
            hazard
            for hazard in hazards
            if term in hazard.address.lower()
            or term in hazard.city.lower()
            or term in hazard.hazard_type.lower()
            or term in str(hazard.id)
        ]

    if sort == "priority":
        hazards.sort(
            key=_priority,
            reverse=True,
        )
    elif sort == "newest":
        hazards.sort(
            key=lambda hazard: hazard.created_at,
            reverse=True,
        )
    else:
        hazards.sort(
            key=lambda hazard: hazard.created_at
        )

    # Attach the score and explanation to every returned hazard.
    for hazard in hazards:
        hazard.priority_score = _priority(hazard)
        _attach_risk_details(hazard)

    db.commit()

    return hazards[:limit]


@router.get("/hazards/{hazard_id}/history")
def get_hazard_history(
    hazard_id: int,
    db: Session = Depends(get_db),
):
    """Retrieve the permanent action history for a hazard."""

    hazard = db.get(Hazard, hazard_id)

    if hazard is None:
        raise HTTPException(
            status_code=404,
            detail="Hazard not found",
        )

    history_records = db.scalars(
        select(HazardHistory)
        .where(HazardHistory.hazard_id == hazard_id)
        .order_by(HazardHistory.created_at.asc())
    ).all()

    return [
        {
            "id": record.id,
            "hazard_id": record.hazard_id,
            "action": record.action,
            "previous_status": record.previous_status,
            "new_status": record.new_status,
            "previous_severity": record.previous_severity,
            "new_severity": record.new_severity,
            "assigned_authority": record.assigned_authority,
            "notes": record.notes,
            "performed_by": record.performed_by,
            "created_at": record.created_at,
        }
        for record in history_records
    ]


@router.patch(
    "/hazards/{hazard_id}",
    response_model=HazardRead,
)
def update_authority_hazard(
    hazard_id: int,
    updates: AuthorityHazardUpdate,
    db: Session = Depends(get_db),
):
    hazard = db.get(Hazard, hazard_id)

    if hazard is None:
        raise HTTPException(
            status_code=404,
            detail="Hazard not found",
        )

    update_data = updates.model_dump(exclude_unset=True)

    # Capture original values before applying changes.
    previous_status = hazard.status
    previous_severity = hazard.severity
    previous_authority = hazard.assigned_authority
    previous_resolution_notes = hazard.resolution_notes

    new_status = update_data.get(
        "status",
        previous_status,
    )

    new_severity = update_data.get(
        "severity",
        previous_severity,
    )

    new_authority = update_data.get(
        "assigned_authority",
        previous_authority,
    )

    # Normalize enum values.
    if hasattr(new_status, "value"):
        new_status = new_status.value

    if hasattr(new_severity, "value"):
        new_severity = new_severity.value

    # Apply requested updates, including explicit null values.
    for key, value in update_data.items():
        setattr(
            hazard,
            key,
            value.value if hasattr(value, "value") else value,
        )

    # Record resolution.
    if (
        new_status == "resolved"
        and previous_status != "resolved"
    ):
        hazard.resolved_at = utcnow()
        hazard.verified_at = None
        hazard.verified_by = None

        _add_history(
            db=db,
            hazard=hazard,
            action="resolved",
            previous_status=previous_status,
            new_status="resolved",
            notes=hazard.resolution_notes,
            performed_by=hazard.resolved_by,
        )

    # Record verification.
    elif (
        new_status == "verified"
        and previous_status != "verified"
    ):
        if hazard.resolved_at is None:
            hazard.resolved_at = utcnow()

        hazard.verified_at = utcnow()

        _add_history(
            db=db,
            hazard=hazard,
            action="verified",
            previous_status=previous_status,
            new_status="verified",
            notes=hazard.resolution_notes,
            performed_by=hazard.verified_by,
        )

    # Record reopening before clearing resolution details.
    elif (
        new_status not in ("resolved", "verified")
        and previous_status in ("resolved", "verified")
    ):
        _add_history(
            db=db,
            hazard=hazard,
            action="reopened",
            previous_status=previous_status,
            new_status=new_status,
            notes=(
                f"Previous resolution: "
                f"{previous_resolution_notes or 'No notes recorded'}. "
                f"Previously resolved by: "
                f"{hazard.resolved_by or 'Unknown'}. "
                f"Previously verified by: "
                f"{hazard.verified_by or 'Not verified'}."
            ),
            performed_by=None,
        )

        hazard.resolved_at = None
        hazard.resolved_by = None
        hazard.verified_at = None
        hazard.verified_by = None

    # Record other status changes.
    elif new_status != previous_status:
        _add_history(
            db=db,
            hazard=hazard,
            action="status_changed",
            previous_status=previous_status,
            new_status=new_status,
        )

    # Record severity changes.
    if new_severity != previous_severity:
        _add_history(
            db=db,
            hazard=hazard,
            action="severity_changed",
            previous_severity=previous_severity,
            new_severity=new_severity,
        )

    # Record authority assignment changes.
    if new_authority != previous_authority:
        _add_history(
            db=db,
            hazard=hazard,
            action="authority_assigned",
            assigned_authority=new_authority,
            notes=(
                f"Previous authority: "
                f"{previous_authority or 'Unassigned'}"
            ),
        )

    # Record resolution-note edits on an already resolved hazard.
    if (
        "resolution_notes" in update_data
        and previous_resolution_notes != hazard.resolution_notes
        and previous_status in ("resolved", "verified")
        and new_status in ("resolved", "verified")
    ):
        _add_history(
            db=db,
            hazard=hazard,
            action="resolution_updated",
            previous_status=previous_status,
            new_status=new_status,
            notes=hazard.resolution_notes,
            performed_by=hazard.resolved_by,
        )

    # Recalculate and attach risk information.
    hazard.priority_score = _priority(hazard)
    _attach_risk_details(hazard)

    db.commit()
    db.refresh(hazard)

    # Reattach after refreshing the database object.
    _attach_risk_details(hazard)

    return hazard
