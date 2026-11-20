
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
    username = os.getenv("AUTHORITY_USERNAME", "")
    password_hash = os.getenv("AUTHORITY_PASSWORD_HASH", "")

    if not username or not password_hash:
        raise HTTPException(
            status_code=503,
            detail="Authority login has not been configured.",
        )

    valid_username = credentials.username == username
    valid_password = verify_password(
        credentials.password, password_hash
    )

    if not (valid_username and valid_password):
        raise HTTPException(
            status_code=401,
            detail="Incorrect username or password.",
        )

    return LoginResponse(
        access_token=create_access_token(username)
    )
