"""Safe handling of uploaded photos.

Rules:
  * Only JPG/JPEG, PNG and WEBP, up to the configured size limit.
  * The client's filename is never used to build a path; only its extension is *checked*.
  * The file's real type is detected from its leading bytes ("magic numbers") and must agree
    with the extension and the declared Content-Type.
  * Files are saved under a random UUID name. Image bytes never go into the database.
"""
import uuid
from pathlib import Path
from typing import Optional

from app.config import settings

# detected type -> (extension we store, extensions a client may use, MIME types a client may declare)
ALLOWED_IMAGES = {
    "jpeg": (".jpg", {".jpg", ".jpeg"}, {"image/jpeg"}),
    "png": (".png", {".png"}, {"image/png"}),
    "webp": (".webp", {".webp"}, {"image/webp"}),
}
ALLOWED_EXTENSIONS = {ext for _, exts, _ in ALLOWED_IMAGES.values() for ext in exts}
UNSUPPORTED_MESSAGE = "Unsupported file type. Please upload a JPG, JPEG, PNG or WEBP image."


class UploadValidationError(Exception):
    """A client-side problem with an uploaded file. Carries the HTTP status to respond with."""

    def __init__(self, status_code: int, message: str):
        super().__init__(message)
        self.status_code = status_code
        self.message = message


def detect_image_type(data: bytes) -> Optional[str]:
    """Identify JPEG / PNG / WEBP from the first bytes. Returns None for anything else."""
    if data.startswith(b"\xff\xd8\xff"):
        return "jpeg"
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png"
    if len(data) >= 12 and data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "webp"
    return None


def _format_limit(max_bytes: int) -> str:
    return f"{max_bytes / (1024 * 1024):g} MB"


def validate_image(data: bytes, filename: Optional[str], content_type: Optional[str], max_bytes: int) -> str:
    """Validate an uploaded image. Returns the detected type ('jpeg' | 'png' | 'webp') or raises."""
    if len(data) == 0:
        raise UploadValidationError(422, "The uploaded photo is empty.")
    if len(data) > max_bytes:
        raise UploadValidationError(413, f"Photo is too large. The maximum size is {_format_limit(max_bytes)}.")

    extension = Path(filename or "").suffix.lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise UploadValidationError(415, UNSUPPORTED_MESSAGE)

    declared = (content_type or "").split(";")[0].strip().lower()
    all_mime_types = {mime for _, _, mimes in ALLOWED_IMAGES.values() for mime in mimes}
    if declared and declared not in all_mime_types:
        raise UploadValidationError(415, UNSUPPORTED_MESSAGE)

    detected = detect_image_type(data)
    if detected is None:
        raise UploadValidationError(415, "The file content is not a valid JPG, PNG or WEBP image.")

    _, allowed_extensions, allowed_mimes = ALLOWED_IMAGES[detected]
    if extension not in allowed_extensions or (declared and declared not in allowed_mimes):
        raise UploadValidationError(415, "The file content does not match its extension or declared type.")

    return detected


def save_upload(upload, upload_dir: Optional[Path] = None, max_bytes: Optional[int] = None) -> str:
    """Validate and store a FastAPI/Starlette UploadFile. Returns the stored file name.

    `upload` needs `.file`, `.filename`, `.content_type` and (optionally) `.size`.
    """
    upload_dir = Path(upload_dir) if upload_dir is not None else settings.upload_dir
    max_bytes = max_bytes if max_bytes is not None else settings.max_upload_bytes

    # Cheap early rejection when the size is already known
    declared_size = getattr(upload, "size", None)
    if declared_size is not None and declared_size > max_bytes:
        raise UploadValidationError(413, f"Photo is too large. The maximum size is {_format_limit(max_bytes)}.")

    # Read at most one byte past the limit so an oversized file is detected without loading all of it
    data = upload.file.read(max_bytes + 1)
    detected = validate_image(data, upload.filename, upload.content_type, max_bytes)

    stored_name = f"{uuid.uuid4().hex}{ALLOWED_IMAGES[detected][0]}"
    upload_dir.mkdir(parents=True, exist_ok=True)
    with open(upload_dir / stored_name, "xb") as handle:  # "x": never overwrite an existing file
        handle.write(data)
    return stored_name


def delete_upload(stored_name: str, upload_dir: Optional[Path] = None) -> None:
    """Remove a previously stored file (used to clean up if the database write fails)."""
    directory = Path(upload_dir) if upload_dir is not None else settings.upload_dir
    (directory / Path(stored_name).name).unlink(missing_ok=True)
