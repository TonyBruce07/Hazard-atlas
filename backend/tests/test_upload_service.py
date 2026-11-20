"""Unit tests for photo validation/storage. Plain unittest: no FastAPI or database needed.

Run:  python -m unittest tests.test_upload_service -v
"""
import io
import tempfile
import unittest
from pathlib import Path

from app.services import upload_service
from app.services.upload_service import UploadValidationError, delete_upload, save_upload
from tests.helpers import make_jpeg, make_png, make_webp

MAX = 5 * 1024 * 1024


class FakeUpload:
    """Stands in for Starlette's UploadFile."""

    def __init__(self, data: bytes, filename: str, content_type: str, size=None):
        self.file = io.BytesIO(data)
        self.filename = filename
        self.content_type = content_type
        self.size = len(data) if size is None else size


class UploadServiceTests(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.dir = Path(self._tmp.name)

    def tearDown(self):
        self._tmp.cleanup()

    def save(self, data, filename, content_type, **kw):
        return save_upload(FakeUpload(data, filename, content_type, **kw), upload_dir=self.dir, max_bytes=MAX)

    def assertRejected(self, status, data, filename, content_type, **kw):
        with self.assertRaises(UploadValidationError) as ctx:
            self.save(data, filename, content_type, **kw)
        self.assertEqual(ctx.exception.status_code, status, ctx.exception.message)
        self.assertEqual(list(self.dir.iterdir()), [], "nothing may be written for a rejected upload")

    # ---- accepted ----
    def test_accepts_png_jpg_jpeg_webp(self):
        cases = [
            (make_png(), "a.png", "image/png", ".png"),
            (make_jpeg(), "a.jpg", "image/jpeg", ".jpg"),
            (make_jpeg(), "a.JPEG", "image/jpeg", ".jpg"),
            (make_webp(), "a.webp", "image/webp", ".webp"),
        ]
        for data, name, mime, expected_ext in cases:
            with self.subTest(name=name):
                stored = self.save(data, name, mime)
                self.assertTrue(stored.endswith(expected_ext))
                self.assertEqual((self.dir / stored).read_bytes(), data)

    def test_missing_content_type_is_allowed_when_signature_and_extension_agree(self):
        self.assertTrue(self.save(make_png(), "x.png", None).endswith(".png"))

    def test_exactly_at_the_size_limit_is_accepted(self):
        data = make_png() + b"0" * (MAX - len(make_png()))
        self.assertEqual(len(data), MAX)
        self.save(data, "big.png", "image/png")

    # ---- filename safety ----
    def test_original_filename_is_never_used(self):
        for hostile in ["../../evil.png", "..\\..\\evil.png", "/etc/passwd.png", "C:\\x\\y.png", "a b;rm -rf.png", "тест.png"]:
            with self.subTest(filename=hostile):
                stored = self.save(make_png(), hostile, "image/png")
                self.assertRegex(stored, r"^[0-9a-f]{32}\.png$")
                self.assertEqual((self.dir / stored).parent, self.dir)

    def test_stored_names_are_unique(self):
        names = {self.save(make_png(), "same.png", "image/png") for _ in range(25)}
        self.assertEqual(len(names), 25)

    # ---- rejected ----
    def test_rejects_wrong_extensions(self):
        for name, mime in [("doc.pdf", "application/pdf"), ("anim.gif", "image/gif"), ("pic.bmp", "image/bmp"), ("noext", "image/png"), ("a.png.exe", "image/png")]:
            with self.subTest(name=name):
                self.assertRejected(415, make_png(), name, mime)

    def test_rejects_non_image_content_with_image_name(self):
        self.assertRejected(415, b"<?php echo 1; ?>", "shell.png", "image/png")
        self.assertRejected(415, b"%PDF-1.4 hello", "doc.jpg", "image/jpeg")
        self.assertRejected(415, b"GIF89a....", "x.png", "image/png")

    def test_rejects_content_that_contradicts_extension_or_mime(self):
        self.assertRejected(415, make_png(), "photo.jpg", "image/jpeg")   # PNG bytes named .jpg
        self.assertRejected(415, make_jpeg(), "photo.png", "image/png")   # JPEG bytes named .png
        self.assertRejected(415, make_png(), "photo.png", "image/jpeg")   # right extension, wrong declared type
        self.assertRejected(415, make_png(), "photo.png", "text/html")

    def test_rejects_oversized_file(self):
        data = make_png() + b"0" * MAX
        self.assertRejected(413, data, "big.png", "image/png")

    def test_rejects_when_declared_size_is_already_too_big(self):
        self.assertRejected(413, make_png(), "big.png", "image/png", size=MAX + 1)

    def test_rejects_empty_file(self):
        self.assertRejected(422, b"", "empty.png", "image/png")

    # ---- cleanup ----
    def test_delete_upload_removes_file_and_ignores_path_tricks(self):
        stored = self.save(make_png(), "a.png", "image/png")
        outside = self.dir.parent / "outside.txt"
        outside.write_text("keep me")
        try:
            delete_upload("../outside.txt", upload_dir=self.dir)  # only the base name is honoured
            self.assertTrue(outside.exists())
            delete_upload(stored, upload_dir=self.dir)
            self.assertFalse((self.dir / stored).exists())
            delete_upload(stored, upload_dir=self.dir)  # already gone: no error
        finally:
            outside.unlink(missing_ok=True)

    def test_detect_image_type(self):
        self.assertEqual(upload_service.detect_image_type(make_png()), "png")
        self.assertEqual(upload_service.detect_image_type(make_jpeg()), "jpeg")
        self.assertEqual(upload_service.detect_image_type(make_webp()), "webp")
        self.assertIsNone(upload_service.detect_image_type(b"RIFF\x00\x00\x00\x00WAVE"))
        self.assertIsNone(upload_service.detect_image_type(b""))


if __name__ == "__main__":
    unittest.main()
