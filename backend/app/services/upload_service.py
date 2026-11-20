
"""Safe handling of uploaded photos.

Production uploads are stored on Cloudinary. Passing upload_dir explicitly
keeps local storage available for isolated unit tests.
"""
import logging
import os
import uuid
from pathlib import Path
from typing import Optional
from urllib.parse import unquote, urlparse

import cloudinary
import cloudinary.uploader

from app.config import settings

logger = logging.getLogger("hazardatlas")

ALLOWED_IMAGES = {
    "jpeg": (".jpg", {".jpg", ".jpeg"}, {"image/jpeg"}),
    "png": (".png", {".png"}, {"image/png"}),
    "webp": (".webp", {".webp"}, {"image/webp"}),
}
ALLOWED_EXTENSIONS = {
    ext for _, extensions, _ in ALLOWED_IMAGES.values() for ext in extensions
}
UNSUPPORTED_MESSAGE = (
    "Unsupported file type. Please upload a JPG, JPEG, PNG or WEBP image."
)


class UploadValidationError(Exception):
    """A client-side upload problem with its corresponding HTTP status."""

    def __init__(self, status_code: int, message: str):
        super().__init__(message)
        self.status_code = status_code
        self.message = message


def detect_image_type(data: bytes) -> Optional[str]:
    """Identify JPEG, PNG or WEBP using the file signature."""
    if data.startswith(b"\xff\xd8\xff"):
        return "jpeg"
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png"
    if len(data) >= 12 and data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "webp"
    return None


def _format_limit(max_bytes: int) -> str:
    return f"{max_bytes / (1024 * 1024):g} MB"


def validate_image(
    data: bytes,
    filename: Optional[str],
    content_type: Optional[str],
    max_bytes: int,
) -> str:
    """Validate the bytes, filename extension and declared MIME type."""
    if len(data) == 0:
        raise UploadValidationError(422, "The uploaded photo is empty.")
    if len(data) > max_bytes:
        raise UploadValidationError(
            413,
            f"Photo is too large. The maximum size is {_format_limit(max_bytes)}.",
        )

    extension = Path(filename or "").suffix.lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise UploadValidationError(415, UNSUPPORTED_MESSAGE)

    declared = (content_type or "").split(";")[0].strip().lower()
    all_mime_types = {
        mime for _, _, mimes in ALLOWED_IMAGES.values() for mime in mimes
    }
    if declared and declared not in all_mime_types:
        raise UploadValidationError(415, UNSUPPORTED_MESSAGE)

    detected = detect_image_type(data)
    if detected is None:
        raise UploadValidationError(
            415, "The file content is not a valid JPG, PNG or WEBP image."
        )

    _, allowed_extensions, allowed_mimes = ALLOWED_IMAGES[detected]
    if extension not in allowed_extensions or (
        declared and declared not in allowed_mimes
    ):
        raise UploadValidationError(
            415, "The file content does not match its extension or declared type."
        )

    return detected


def _configure_cloudinary() -> None:
    """Configure Cloudinary from backend environment variables."""
    cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME")
    api_key = os.getenv("CLOUDINARY_API_KEY")
    api_secret = os.getenv("CLOUDINARY_API_SECRET")

    if not all((cloud_name, api_key, api_secret)):
        raise RuntimeError(
            "Cloudinary is not configured. Check CLOUDINARY_CLOUD_NAME, "
            "CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in backend/.env."
        )

    cloudinary.config(
        cloud_name=cloud_name,
        api_key=api_key,
        api_secret=api_secret,
        secure=True,
    )


def _cloudinary_public_id(image_url: str) -> Optional[str]:
    """Extract the public ID from a standard Cloudinary secure URL."""
    try:
        path = unquote(urlparse(image_url).path)
        parts = path.split("/")

        upload_index = parts.index("upload")
        asset_parts = parts[upload_index + 1:]

        # Cloudinary URLs may include a version segment such as v123456.
        if asset_parts and asset_parts[0].startswith("v") and asset_parts[0][1:].isdigit():
            asset_parts = asset_parts[1:]

        if not asset_parts:
            return None

        filename = asset_parts[-1]
        public_name = filename.rsplit(".", 1)[0]
        asset_parts[-1] = public_name

        return "/".join(part for part in asset_parts if part)
    except (ValueError, IndexError):
        return None


def save_upload(
    upload,
    upload_dir: Optional[Path] = None,
    max_bytes: Optional[int] = None,
) -> str:
    """Validate an uploaded image and store it.

    Returns a Cloudinary secure URL in production. When upload_dir is
    explicitly supplied, stores a local file for unit tests.
    """
    max_bytes = max_bytes if max_bytes is not None else settings.max_upload_bytes

    declared_size = getattr(upload, "size", None)
    if declared_size is not None and declared_size > max_bytes:
        raise UploadValidationError(
            413,
            f"Photo is too large. The maximum size is {_format_limit(max_bytes)}.",
        )

    data = upload.file.read(max_bytes + 1)
    detected = validate_image(
        data, upload.filename, upload.content_type, max_bytes
    )
    extension = ALLOWED_IMAGES[detected][0]
    unique_name = uuid.uuid4().hex

    # Explicit local mode is retained for the existing isolated unit tests.
    if upload_dir is not None:
        directory = Path(upload_dir)
        directory.mkdir(parents=True, exist_ok=True)
        stored_name = f"{unique_name}{extension}"
        with open(directory / stored_name, "xb") as handle:
            handle.write(data)
        return stored_name

    _configure_cloudinary()

    try:
        result = cloudinary.uploader.upload(
            data,
            folder="hazardatlas",
            public_id=unique_name,
            resource_type="image",
            overwrite=False,
        )
    except Exception as error:
        logger.exception("Cloudinary image upload failed")
        raise RuntimeError("The photo could not be uploaded. Please try again.") from error

    secure_url = result.get("secure_url")
    if not secure_url:
        # Avoid leaving an uploaded asset behind if Cloudinary returned an
        # unexpected response.
        public_id = result.get("public_id")
        if public_id:
            try:
                cloudinary.uploader.destroy(public_id, resource_type="image")
            except Exception:
                logger.exception("Could not clean up an incomplete Cloudinary upload")
        raise RuntimeError("The photo upload did not return a usable image URL.")

    return secure_url


def delete_upload(
    stored_name: str,
    upload_dir: Optional[Path] = None,
) -> None:
    """Delete a local test file or a previously uploaded Cloudinary image."""
    if not stored_name:
        return

    # Explicit local mode is retained for the existing unit tests.
    if upload_dir is not None:
        directory = Path(upload_dir)
        (directory / Path(stored_name).name).unlink(missing_ok=True)
        return

    public_id = _cloudinary_public_id(stored_name)
    if not public_id:
        logger.warning("Could not determine Cloudinary public ID for cleanup")
        return

    try:
        _configure_cloudinary()
        cloudinary.uploader.destroy(public_id, resource_type="image")
    except Exception:
        # Do not hide the original database error if cleanup itself fails.
        logger.exception("Could not delete Cloudinary image %s", public_id)
