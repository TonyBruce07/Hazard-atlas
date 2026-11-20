
"""Explainable MVP hazard-priority scoring."""

from datetime import datetime, timezone
from math import floor

SEVERITY_POINTS = {
    "low": 10,
    "medium": 20,
    "high": 30,
    "critical": 40,
}

TYPE_URGENCY = {
    "unsafe_crossing": 20,
    "uncovered_manhole": 18,
    "road_obstruction": 16,
    "pothole": 12,
    "damaged_surface": 10,
    "other": 8,
}

OVERDUE_AFTER_DAYS = 7


def _age_days(created_at: datetime) -> float:
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)

    return max(
        (datetime.now(timezone.utc) - created_at).total_seconds() / 86400,
        0,
    )


def calculate_priority_breakdown(
    severity: str,
    hazard_type: str,
    report_count: int,
    created_at: datetime,
) -> dict:
    """Return the score and an explanation of each scoring component."""

    severity_key = (severity or "medium").lower()
    type_key = (hazard_type or "other").lower()
    report_count = max(report_count, 1)

    severity_score = SEVERITY_POINTS.get(severity_key, 20)
    concentration_score = min(report_count * 6, 30)
    urgency_score = TYPE_URGENCY.get(type_key, 8)

    age_days = _age_days(created_at)
    recency_score = max(0, round(10 - min(age_days, 10)))

    total = min(
        100,
        severity_score
        + concentration_score
        + urgency_score
        + recency_score,
    )

    return {
        "score": total,
        "label": priority_label(total),
        "severity_points": severity_score,
        "report_points": concentration_score,
        "urgency_points": urgency_score,
        "recency_points": recency_score,
        "report_count": report_count,
        "age_days": round(age_days, 1),
    }


def calculate_priority(
    severity: str,
    hazard_type: str,
    report_count: int,
    created_at: datetime,
) -> int:
    """Keep the existing integer-score interface."""

    return calculate_priority_breakdown(
        severity=severity,
        hazard_type=hazard_type,
        report_count=report_count,
        created_at=created_at,
    )["score"]


def is_hazard_overdue(
    status: str,
    created_at: datetime,
) -> tuple[bool, int]:
    """Flag unresolved hazards that have been open for at least 7 days."""

    if (status or "").lower() in ("resolved", "verified"):
        return False, 0

    age_days = _age_days(created_at)

    if age_days < OVERDUE_AFTER_DAYS:
        return False, 0

    return True, floor(age_days - OVERDUE_AFTER_DAYS)


def priority_label(score: int) -> str:
    if score >= 80:
        return "Critical"
    if score >= 60:
        return "High"
    if score >= 40:
        return "Medium"
    return "Low"
