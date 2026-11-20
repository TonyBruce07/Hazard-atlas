# HazardAtlas backend

FastAPI + SQLAlchemy + SQLite. Foundation only: citizen reports with optional photo upload.
No AI, risk scoring, duplicate detection or authentication yet.

## Run it (Windows PowerShell)

```powershell
cd D:\Hazard\backend

# 1. Activate your EXISTING virtual environment (use whichever matches your setup):
.\venv\Scripts\Activate.ps1        # venv inside backend\
..\venv\Scripts\Activate.ps1       # venv at D:\Hazard\venv
#   (use .venv instead of venv if that is your folder name)
#   If PowerShell blocks scripts:  Set-ExecutionPolicy -Scope Process Bypass

# 2. Install dependencies into it
python -m pip install -r requirements.txt

# 3. Optional: local settings (defaults already work)
copy .env.example .env

# 4. Start the server (run from the backend folder)
python -m uvicorn app.main:app --reload --port 8000
```

No activation? Call the venv's Python directly:
`.\venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000`

Swagger UI: http://127.0.0.1:8000/docs  ·  ReDoc: http://127.0.0.1:8000/redoc

Tables are created automatically on startup (`hazardatlas.db` appears in `backend/`).
Photos are saved in `backend/uploads/`.

## Endpoints

| Method | Path | Notes |
|---|---|---|
| GET | `/api/health` | `200`, or `503` if the database is unreachable |
| POST | `/api/reports` | `multipart/form-data` → `201` with the created report |
| GET | `/api/reports?limit=50&offset=0` | newest first, `limit` 1–100 |
| GET | `/api/reports/{id}` | `404` if it doesn't exist |

**POST /api/reports fields:** `hazard_type` (pothole · damaged_surface · uncovered_manhole · road_obstruction · unsafe_crossing · other),
`description` (10–500 chars), `street`, `city`, optional `latitude` + `longitude` (together), optional `photo` (JPG/JPEG/PNG/WEBP, ≤ 5 MB).

**Errors:** `422` bad/missing fields or empty photo · `413` photo too large · `415` unsupported or fake image · `500` could not save.

## Try it in Swagger

1. Open `/docs` → **GET /api/health** → *Try it out* → *Execute* → expect `200` `{"status":"ok",...}`.
2. **POST /api/reports** → *Try it out*. Fill `hazard_type`, `description`, `street`, `city`; leave the rest blank → *Execute* → expect `201`.
3. Repeat with a real `.jpg`/`.png` in **photo** → `photo_path` is a random name such as `3f9a…c1.png`; the file is in `backend/uploads/`.
4. Try failures: a `.pdf` or `.gif` as photo (`415`), an image over 5 MB (`413`), `hazard_type=volcano` or a 3-character description (`422`), only `latitude` without `longitude` (`422`).
5. **GET /api/reports** and **GET /api/reports/{report_id}** to read back what you created.

Command-line equivalent (use `curl.exe`, since plain `curl` is a PowerShell alias):

```powershell
curl.exe http://127.0.0.1:8000/api/health
curl.exe -X POST http://127.0.0.1:8000/api/reports `
  -F "hazard_type=pothole" -F "description=Deep pothole in the left lane near the junction." `
  -F "street=Station Road" -F "city=Testville" -F "photo=@C:\path\to\photo.jpg;type=image/jpeg"
curl.exe http://127.0.0.1:8000/api/reports
```

## Automated tests

```powershell
python -m pip install -r requirements-dev.txt
python -m pytest -v                                # everything (API + upload tests)
python -m unittest tests.test_upload_service -v    # upload tests only; needs no extra packages
```
Tests use a temporary database and upload folder; they never touch `hazardatlas.db` or `uploads/`.

## Design notes

- **`Hazard` vs `CitizenReport`:** a report is one citizen's original submission; a hazard is the real-world problem. Today each report creates its own hazard (so the type/location the form collects is stored). Later duplicate detection can point many reports at one hazard by updating `hazard_id`, without altering any submission. `hazard_id` is nullable for that purpose.
- **Photos:** validated by size, extension, declared Content-Type and file signature (all must agree), then saved under a random UUID name. The client's filename is never used. Only the file name is stored in SQLite (`photo_path`), never the bytes.
- **Config:** environment variables / `backend/.env` (see `.env.example`). Relative paths resolve against `backend/`.

## Known limitations (MVP)

- Tables are created with `create_all`; there are no migrations, so changing a model later needs a migration tool (Alembic) or a fresh `.db` file.
- Starlette reads the whole multipart body before the route runs, so the 5 MB limit is enforced after upload. Put a body-size limit on your reverse proxy before deploying.
- Photos are validated by signature, not fully decoded; add Pillow later if you want deep image verification.
- Uploaded photos are stored but not yet served over HTTP.
- No authentication or rate limiting.
