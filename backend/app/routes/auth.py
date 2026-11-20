
"""Authority login endpoint."""
import os

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.auth import create_access_token, verify_password

router = APIRouter(prefix="/auth", tags=["Authentication"])


class LoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=100)
    password: str = Field(min_length=1, max_length=200)


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int = 28800


@router.post("/login", response_model=LoginResponse)
def authority_login(credentials: LoginRequest):
    accounts = [
        (
            os.getenv("AUTHORITY_USERNAME", ""),
            os.getenv("AUTHORITY_PASSWORD_HASH", ""),
        ),
        (
            os.getenv("JUDGE_AUTHORITY_USERNAME", ""),
            os.getenv("JUDGE_AUTHORITY_PASSWORD_HASH", ""),
        ),
    ]

    configured_accounts = [
        (username, password_hash)
        for username, password_hash in accounts
        if username and password_hash
    ]

    if not configured_accounts:
        raise HTTPException(
            status_code=503,
            detail="Authority login has not been configured.",
        )

    for username, password_hash in configured_accounts:
        if (
            credentials.username == username
            and verify_password(credentials.password, password_hash)
        ):
            return LoginResponse(
                access_token=create_access_token(username)
            )

    raise HTTPException(
        status_code=401,
        detail="Incorrect username or password.",
    )