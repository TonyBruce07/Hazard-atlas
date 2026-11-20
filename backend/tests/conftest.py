"""Test configuration: point the app at a throwaway database and upload folder BEFORE it is imported."""
import os
import shutil
import tempfile
from pathlib import Path

import pytest

_TMP = Path(tempfile.mkdtemp(prefix="hazardatlas-tests-"))
UPLOAD_DIR = _TMP / "uploads"

os.environ["DATABASE_URL"] = f"sqlite:///{(_TMP / 'test.db').as_posix()}"
os.environ["UPLOAD_DIR"] = str(UPLOAD_DIR)
os.environ["MAX_UPLOAD_MB"] = "5"
os.environ["CORS_ORIGINS"] = "http://localhost:5173"


@pytest.fixture(scope="session")
def client():
    from fastapi.testclient import TestClient

    from app.main import app

    with TestClient(app) as test_client:  # the context manager runs startup (creates tables)
        yield test_client
    shutil.rmtree(_TMP, ignore_errors=True)
