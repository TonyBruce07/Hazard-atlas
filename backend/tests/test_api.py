"""End-to-end API tests (FastAPI TestClient + a temporary SQLite database).

Run:  python -m pytest -v        (needs: pip install -r requirements-dev.txt)
"""
import pytest

from app.config import settings  # conftest.py has already pointed this at a temp folder
from tests.helpers import make_jpeg, make_png, make_webp

UPLOAD_DIR = settings.upload_dir

VALID_FORM = {
    "hazard_type": "pothole",
    "description": "Deep pothole in the left lane near the junction.",
    "street": "Station Road",
    "city": "Testville",
}


@pytest.fixture(autouse=True)
def clean_state(client):
    from app.database import Base, engine

    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    for item in UPLOAD_DIR.glob("*"):
        item.unlink()
    yield


def stored_files():
    return list(UPLOAD_DIR.glob("*"))


def report_count(client):
    return len(client.get("/api/reports").json())


# ---------------- health ----------------
def test_health(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok" and body["database"] == "ok"


# ---------------- create + retrieve ----------------
def test_create_report_without_photo(client):
    response = client.post("/api/reports", data=VALID_FORM)
    assert response.status_code == 201
    body = response.json()
    assert body["description"] == VALID_FORM["description"]
    assert body["photo_path"] is None
    assert body["hazard_id"] is not None
    assert body["hazard"]["hazard_type"] == "pothole"
    assert body["hazard"]["address"] == "Station Road"
    assert body["hazard"]["city"] == "Testville"
    assert body["hazard"]["status"] == "open"
    assert body["hazard"]["latitude"] is None
    assert body["created_at"].endswith("Z") or "+00:00" in body["created_at"]


def test_create_report_with_coordinates_and_photo(client):
    response = client.post(
        "/api/reports",
        data={**VALID_FORM, "latitude": "12.971599", "longitude": "77.594566"},
        files={"photo": ("my holiday.PNG", make_png(), "image/png")},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["hazard"]["latitude"] == pytest.approx(12.971599)
    assert body["hazard"]["longitude"] == pytest.approx(77.594566)
    assert body["photo_path"].startswith("https://res.cloudinary.com/")
    assert "holiday" not in body["photo_path"]
    assert stored_files() == []



@pytest.mark.parametrize(
    "filename,content,mime",
    [
        ("a.jpg", make_jpeg(), "image/jpeg"),
        ("a.jpeg", make_jpeg(), "image/jpeg"),
        ("a.webp", make_webp(), "image/webp"),
    ],
)
def test_other_allowed_image_types(client, filename, content, mime):
    response = client.post(
        "/api/reports",
        data=VALID_FORM,
        files={"photo": (filename, content, mime)},
    )
    assert response.status_code == 201, response.text
    assert response.json()["photo_path"].startswith(
        "https://res.cloudinary.com/"
    )


def test_hostile_filename_cannot_escape_upload_dir(client):
    response = client.post(
        "/api/reports",
        data=VALID_FORM,
        files={"photo": ("../../evil.png", make_png(), "image/png")},
    )
    assert response.status_code == 201, response.text

    photo_url = response.json()["photo_path"]
    assert photo_url.startswith("https://res.cloudinary.com/")
    assert "evil" not in photo_url
    assert stored_files() == []


def test_blank_optional_fields_are_treated_as_missing(client):
    response = client.post("/api/reports", data={**VALID_FORM, "latitude": "", "longitude": ""})
    assert response.status_code == 201
    assert response.json()["hazard"]["latitude"] is None


def test_get_report_by_id(client):
    created = client.post("/api/reports", data=VALID_FORM).json()
    response = client.get(f"/api/reports/{created['id']}")
    assert response.status_code == 200
    assert response.json() == created


def test_get_missing_report_is_404(client):
    assert client.get("/api/reports/9999").status_code == 404


def test_non_integer_report_id_is_422(client):
    assert client.get("/api/reports/abc").status_code == 422


def test_list_is_newest_first_and_paginated(client):
    ids = [client.post("/api/reports", data={**VALID_FORM, "street": f"Street {i}"}).json()["id"] for i in range(3)]
    listed = client.get("/api/reports").json()
    assert [r["id"] for r in listed] == list(reversed(ids))
    assert [r["id"] for r in client.get("/api/reports?limit=1&offset=1").json()] == [ids[1]]
    assert client.get("/api/reports?limit=0").status_code == 422
    assert client.get("/api/reports?limit=101").status_code == 422
    assert client.get("/api/reports?offset=-1").status_code == 422


def test_each_report_gets_its_own_hazard_for_now(client):
    a = client.post("/api/reports", data=VALID_FORM).json()
    b = client.post("/api/reports", data=VALID_FORM).json()
    assert a["hazard_id"] != b["hazard_id"]


# ---------------- field validation ----------------
@pytest.mark.parametrize(
    "overrides",
    [
        {"hazard_type": "volcano"},
        {"hazard_type": ""},
        {"description": "short"},
        {"description": "x" * 501},
        {"description": "         "},
        {"street": "   "},
        {"city": ""},
        {"latitude": "12.9"},                              # longitude missing
        {"longitude": "77.5"},                             # latitude missing
        {"latitude": "95", "longitude": "77.5"},
        {"latitude": "12.9", "longitude": "181"},
        {"latitude": "abc", "longitude": "77.5"},
        {"latitude": "nan", "longitude": "77.5"},
    ],
)
def test_invalid_fields_are_rejected_and_nothing_is_saved(client, overrides):
    response = client.post("/api/reports", data={**VALID_FORM, **overrides})
    assert response.status_code == 422, response.text
    assert report_count(client) == 0


@pytest.mark.parametrize("missing", ["hazard_type", "description", "street", "city"])
def test_missing_required_field_is_422(client, missing):
    data = {k: v for k, v in VALID_FORM.items() if k != missing}
    assert client.post("/api/reports", data=data).status_code == 422


def test_validation_error_names_the_field(client):
    response = client.post("/api/reports", data={**VALID_FORM, "city": ""})
    assert any(err["loc"][-1] == "city" for err in response.json()["detail"])


# ---------------- invalid uploads ----------------
@pytest.mark.parametrize(
    "filename,content,mime,expected",
    [
        ("doc.pdf", b"%PDF-1.4 test", "application/pdf", 415),
        ("anim.gif", b"GIF89a....", "image/gif", 415),
        ("shell.png", b"<?php echo 1; ?>", "image/png", 415),     # fake image
        ("photo.jpg", make_png(), "image/jpeg", 415),             # content/extension mismatch
        ("empty.png", b"", "image/png", 422),
        ("big.png", make_png() + b"0" * (5 * 1024 * 1024), "image/png", 413),
    ],
)
def test_invalid_uploads_are_rejected_and_nothing_is_saved(client, filename, content, mime, expected):
    response = client.post("/api/reports", data=VALID_FORM, files={"photo": (filename, content, mime)})
    assert response.status_code == expected, response.text
    assert "detail" in response.json()
    assert stored_files() == []
    assert report_count(client) == 0


def test_invalid_fields_do_not_leave_an_orphan_photo(client):
    response = client.post("/api/reports", data={**VALID_FORM, "city": ""}, files={"photo": ("a.png", make_png(), "image/png")})
    assert response.status_code == 422
    assert stored_files() == []


# ---------------- CORS ----------------
def test_cors_allows_the_vite_dev_origin(client):
    response = client.options(
        "/api/reports",
        headers={"Origin": "http://localhost:5173", "Access-Control-Request-Method": "POST"},
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"


def test_cors_does_not_allow_other_origins(client):
    response = client.options(
        "/api/reports",
        headers={"Origin": "http://evil.example", "Access-Control-Request-Method": "POST"},
    )
    assert "access-control-allow-origin" not in response.headers
