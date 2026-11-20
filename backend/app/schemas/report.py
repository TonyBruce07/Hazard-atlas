from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.schemas.common import ORMModel, UTCDatetime
from app.schemas.hazard import HazardRead, HazardType, Severity

DESCRIPTION_MIN = 10
DESCRIPTION_MAX = 500


class ReportCreate(BaseModel):
    """Validated form fields for a new citizen report."""

    model_config = ConfigDict(str_strip_whitespace=True)

    hazard_type: HazardType
    reported_severity: Severity = Severity.MEDIUM
    description: str = Field(
        min_length=DESCRIPTION_MIN,
        max_length=DESCRIPTION_MAX,
    )
    street: str = Field(min_length=1, max_length=200)
    city: str = Field(min_length=1, max_length=100)
    latitude: Optional[float] = Field(
        default=None, ge=-90, le=90, allow_inf_nan=False
    )
    longitude: Optional[float] = Field(
        default=None, ge=-180, le=180, allow_inf_nan=False
    )

    @field_validator("latitude", "longitude", mode="before")
    @classmethod
    def blank_means_missing(cls, value):
        if isinstance(value, str) and not value.strip():
            return None
        return value

    @model_validator(mode="after")
    def coordinates_come_as_a_pair(self):
        if (self.latitude is None) != (self.longitude is None):
            raise ValueError(
                "latitude and longitude must be provided together"
            )
        return self


class ReportRead(ORMModel):
    id: int
    tracking_code: str
    hazard_id: Optional[int] = None
    reported_severity: Severity
    description: str
    photo_path: Optional[str] = Field(
    default=None,
    description="Cloudinary secure URL for the uploaded photo.",
)
    created_at: UTCDatetime
    hazard: Optional[HazardRead] = None


class TrackedHazardRead(BaseModel):
    """Only public hazard information needed for citizen tracking."""

    model_config = ConfigDict(from_attributes=True)

    hazard_type: str
    address: str
    city: str
    status: str
    created_at: UTCDatetime
    resolved_at: Optional[UTCDatetime] = None
    verified_at: Optional[UTCDatetime] = None


class ReportTrackingRead(BaseModel):
    """Privacy-limited public report tracking response."""

    model_config = ConfigDict(from_attributes=True)

    tracking_code: str
    description: str
    created_at: UTCDatetime
    hazard: Optional[TrackedHazardRead] = None