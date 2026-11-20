import logging
from app.schemas.report import ReportTrackingRead
from typing import Annotated, List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from pydantic import ValidationError
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import ReportCreate, ReportRead
from app.services import report_service
from app.services.upload_service import delete_upload, save_upload

logger = logging.getLogger("hazardatlas")

router = APIRouter(prefix="/reports", tags=["Citizen reports"])


def _validation_detail(error: ValidationError) -> list:
    """Shape Pydantic errors like FastAPI's own 422 responses: [{loc, msg, type}, ...]."""
    return [
        {"loc": ["body", *[str(part) for part in item["loc"]]], "msg": item["msg"], "type": item["type"]}
        for item in error.errors(include_url=False, include_context=False, include_input=False)
    ]


@router.post(
    "",
    response_model=ReportRead,
    status_code=status.HTTP_201_CREATED,
    summary="Submit a citizen hazard report",
    description=(
        "Accepts `multipart/form-data`. `photo` is optional (JPG, JPEG, PNG or WEBP, max 5 MB). "
        "`latitude` and `longitude` are optional but must be sent together."
    ),
    responses={
        413: {"description": "Photo is larger than the size limit."},
        415: {"description": "Photo is not a valid JPG, JPEG, PNG or WEBP image."},
        422: {"description": "Invalid or missing form fields, or an empty photo."},
        500: {"description": "The report could not be saved."},
    },
)
def create_report(
    db: Annotated[Session, Depends(get_db)],
    hazard_type: Annotated[str, Form(description="pothole, damaged_surface, uncovered_manhole, road_obstruction, unsafe_crossing or other")],
    description: Annotated[str, Form(description="10 to 500 characters")],
    street: Annotated[str, Form(description="Street or area name")],
    city: Annotated[str, Form()],
    reported_severity: Annotated[
    str,
    Form(description="Citizen-assessed severity: low, medium, high or critical"),
] = "medium",
    latitude: Annotated[Optional[str], Form(description="Optional, -90 to 90")] = None,
    longitude: Annotated[Optional[str], Form(description="Optional, -180 to 180")] = None,
    photo: Annotated[Optional[UploadFile], File(description="Optional JPG, JPEG, PNG or WEBP, max 5 MB")] = None,
):
    # 1. Validate the text fields first, so nothing is written to disk for a bad request
    try:
        data = ReportCreate.model_validate(
            {
                "hazard_type": hazard_type,
                "description": description,
                "street": street,
                "city": city,
                "latitude": latitude,
                "longitude": longitude,
                "reported_severity": reported_severity,
            }
        )
    except ValidationError as error:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=_validation_detail(error))

    # 2. Validate + store the optional photo (raises UploadValidationError, handled in main.py)
    stored_name: Optional[str] = None
    if photo is not None and photo.filename:
        stored_name = save_upload(photo)

    # 3. Save to the database; remove the file again if that fails
    try:
        return report_service.create_report(db, data, stored_name)
    except SQLAlchemyError:
        db.rollback()
        if stored_name:
            delete_upload(stored_name)
        logger.exception("Failed to save citizen report")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not save the report. Please try again.",
        )
    except Exception:
        if stored_name:
            delete_upload(stored_name)
        raise


@router.get("", response_model=List[ReportRead], summary="List citizen reports (newest first)")
def list_reports(
    db: Annotated[Session, Depends(get_db)],
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
):
    return report_service.list_reports(db, limit=limit, offset=offset)

@router.get(
    "/track/{tracking_code}",
    response_model=ReportTrackingRead,
    summary="Track a citizen report",
    responses={404: {"description": "Invalid tracking code."}},
)
def track_report(
    tracking_code: str,
    db: Annotated[Session, Depends(get_db)],
):
    code = tracking_code.strip().upper()

    if not code or len(code) > 32:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found. Please check your tracking code.",
        )

    report = report_service.get_report_by_tracking_code(db, code)

    if report is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found. Please check your tracking code.",
        )

    return report

@router.get(
    "/{report_id}",
    response_model=ReportRead,
    summary="Get one citizen report",
    responses={404: {"description": "Report not found."}},
)
def get_report(report_id: int, db: Annotated[Session, Depends(get_db)]):
    report = report_service.get_report(db, report_id)
    if report is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found.")
    return report
