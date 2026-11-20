
from enum import Enum
from typing import Optional

from app.schemas.common import ORMModel, UTCDatetime


class HazardType(str, Enum):
    POTHOLE = "pothole"
    DAMAGED_SURFACE = "damaged_surface"
    UNCOVERED_MANHOLE = "uncovered_manhole"
    ROAD_OBSTRUCTION = "road_obstruction"
    UNSAFE_CROSSING = "unsafe_crossing"
    OTHER = "other"


class HazardStatus(str, Enum):
    OPEN = "open"
    REPORTED = "reported"
    UNDER_REVIEW = "under_review"
    ACKNOWLEDGED = "acknowledged"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    VERIFIED = "verified"


class Severity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class PriorityBreakdown(ORMModel):
    score: int
    label: str
    severity_points: int
    report_points: int
    urgency_points: int
    recency_points: int
    report_count: int
    age_days: float


class HazardRead(ORMModel):
    id: int
    hazard_type: HazardType

    latitude: Optional[float] = None
    longitude: Optional[float] = None

    address: str
    city: str
    photo_path: Optional[str] = None

    status: HazardStatus
    severity: Severity = Severity.MEDIUM
    priority_score: int = 0

    # Authority assignment
    assigned_authority: Optional[str] = None

    # Explainable risk intelligence
    priority_breakdown: Optional[PriorityBreakdown] = None
    is_overdue: bool = False
    overdue_days: int = 0

    # Resolution tracking
    resolution_notes: Optional[str] = None
    resolved_at: Optional[UTCDatetime] = None
    resolved_by: Optional[str] = None

    # Verification tracking
    verified_at: Optional[UTCDatetime] = None
    verified_by: Optional[str] = None

    # Timestamps
    created_at: UTCDatetime
    updated_at: Optional[UTCDatetime] = None
