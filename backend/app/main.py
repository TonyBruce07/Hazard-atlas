
"""HazardAtlas API entry point.

Run from backend/: python -m uvicorn app.main:app --reload
Interactive docs: http://127.0.0.1:8000/docs
"""

import logging
from contextlib import asynccontextmanager
from app.routes.auth import router as auth_router
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.database import init_db
from app.routes import health_router, reports_router
from app.routes.authority import router as authority_router
from app.services.upload_service import UploadValidationError

logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    settings.upload_dir.mkdir(parents=True, exist_ok=True)
    init_db()
    yield


app = FastAPI(
    title=settings.app_name,
    version=settings.version,
    description="Backend for HazardAtlas, a community-powered road safety platform.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["GET", "POST", "PATCH", "OPTIONS"],
    allow_headers=["*"],
)


@app.exception_handler(UploadValidationError)
async def handle_upload_error(_request: Request, error: UploadValidationError) -> JSONResponse:
    return JSONResponse(
        status_code=error.status_code,
        content={"detail": error.message},
    )


app.include_router(health_router, prefix="/api")
app.include_router(reports_router, prefix="/api")
app.include_router(authority_router, prefix="/api")
app.include_router(auth_router, prefix="/api")