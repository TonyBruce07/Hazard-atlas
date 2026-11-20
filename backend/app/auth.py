
"""Password hashing and signed authority access tokens."""
import base64
import hashlib
import hmac
import json
import os
import time

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

PBKDF2_ITERATIONS = 600_000
TOKEN_LIFETIME_SECONDS = 8 * 60 * 60
bearer_scheme = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt, PBKDF2_ITERATIONS
    )
    return f"{salt.hex()}:{digest.hex()}"


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        salt_hex, digest_hex = stored_hash.split(":", 1)
        salt = bytes.fromhex(salt_hex)
        expected = bytes.fromhex(digest_hex)
    except (ValueError, TypeError):
        return False

    actual = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt, PBKDF2_ITERATIONS
    )
    return hmac.compare_digest(actual, expected)


def _encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode().rstrip("=")


def _secret() -> bytes:
    secret = os.getenv("AUTH_TOKEN_SECRET", "")
    if len(secret) < 32:
        raise RuntimeError(
            "AUTH_TOKEN_SECRET must contain at least 32 characters."
        )
    return secret.encode("utf-8")


def create_access_token(username: str) -> str:
    payload = {
        "sub": username,
        "exp": int(time.time()) + TOKEN_LIFETIME_SECONDS,
    }
    encoded = _encode(json.dumps(payload, separators=(",", ":")).encode())
    signature = hmac.new(
        _secret(), encoded.encode(), hashlib.sha256
    ).digest()
    return f"{encoded}.{_encode(signature)}"


def verify_access_token(token: str) -> str | None:
    try:
        encoded, supplied_signature = token.split(".", 1)
        expected_signature = hmac.new(
            _secret(), encoded.encode(), hashlib.sha256
        ).digest()

        supplied = base64.urlsafe_b64decode(
            supplied_signature + "=" * (-len(supplied_signature) % 4)
        )
        if not hmac.compare_digest(expected_signature, supplied):
            return None

        payload_bytes = base64.urlsafe_b64decode(
            encoded + "=" * (-len(encoded) % 4)
        )
        payload = json.loads(payload_bytes)

        if int(payload["exp"]) <= int(time.time()):
            return None

        username = payload.get("sub")
        if not username or username != os.getenv("AUTHORITY_USERNAME"):
            return None

        return username
    except (ValueError, KeyError, TypeError, json.JSONDecodeError):
        return None


def require_authority(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> str:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=401,
            detail="Authority login required.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    username = verify_access_token(credentials.credentials)
    if not username:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired authority session. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return username
