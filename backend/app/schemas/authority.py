
from typing import Optional

from pydantic import BaseModel, Field

from app.schemas.hazard import HazardStatus, Severity


class AuthorityHazardUpdate(BaseModel):
    status: Optional[HazardStatus] = None
    severity: Optional[Severity] = None

    assigned_authority: Optional[str] = Field(
        default=None,
        max_length=100
    )

    # Resolution details
    resolution_notes: Optional[str] = Field(
        default=None,
        max_length=5000
    )

    resolved_by: Optional[str] = Field(
        default=None,
        max_length=100
    )

    # Verification details
    verified_by: Optional[str] = Field(
        default=None,
        max_length=100
    )


class AuthorityDashboardStats(BaseModel):
    total_hazards: int
    open_hazards: int
    in_progress_hazards: int
    resolved_hazards: int
    critical_hazards: int
    high_priority_hazards: int
    average_priority: float
