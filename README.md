# 🛣️ HazardAtlas
### Community-Powered Road Safety Intelligence Platform

**Making roads safer through community reporting, geographic intelligence, and transparent hazard management.**

[![Live Demo](https://img.shields.io/badge/Live-Demo-brightgreen)](https://hazard-atlas-woad.vercel.app)
[![Frontend](https://img.shields.io/badge/Frontend-React-blue)](https://react.dev/)
[![Backend](https://img.shields.io/badge/Backend-FastAPI-009688)](https://fastapi.tiangolo.com/)
[![Database](https://img.shields.io/badge/Database-PostgreSQL-4169E1)](https://www.postgresql.org/)

🌐 **Live Application:** https://hazard-atlas-woad.vercel.app

📂 **GitHub Repository:** https://github.com/TonyBruce07/Hazard-atlas

---

## 📌 Overview

Road hazards such as potholes, damaged roads, open manholes, and unsafe road conditions create serious risks for commuters and pedestrians.

However, reporting these hazards can be fragmented, and citizens often lack visibility into whether their complaints have been acknowledged or resolved. Authorities also need a centralized way to monitor reported hazards, identify high-risk locations, prioritize cases, and track corrective action.

**HazardAtlas** addresses this challenge through a community-powered road safety intelligence platform that connects citizens with authorities through a unified reporting, mapping, tracking, and management system.

The platform transforms individual citizen reports into organized, location-based road safety information that can support better decision-making and faster action.

---

## 🎯 Problem Statement

- Citizens often lack a simple and transparent way to report road hazards.
- Hazard information is scattered across different reporting channels.
- Authorities need better visibility into the location and severity of road hazards.
- Identifying geographic concentrations of hazards can be difficult.
- Citizens may not know the progress or resolution status of their submitted reports.

HazardAtlas aims to bridge these gaps with a centralized and accessible reporting and monitoring platform.

---

## ✨ Key Features

### 👥 Citizen Features

- **Report Road Hazards:** Submit reports with descriptions, hazard categories, location details, and photographs.
- **Photo Uploads:** Attach images to provide visual evidence of road conditions.
- **Geolocation Support:** Use location information to help identify where hazards occur.
- **Reported Severity:** Citizens can indicate the perceived severity of a reported hazard.
- **Unique Tracking Codes:** Receive a unique tracking code for every submitted report.
- **Report Tracking:** Check the progress and current status of a submission without requiring an authority account.

### 🗺️ Interactive Hazard Map

- View reported hazards on an interactive map.
- Explore hazard locations geographically.
- Filter hazards by category.
- View hazard information through map markers and popups.
- Identify nearby hazard concentrations through geographic hotspot grouping.
- Explore clustered hazard locations using map interactions.

### 🏢 Authority Dashboard

- Secure authority authentication.
- Centralized overview of reported hazards.
- View and review individual hazard reports.
- Assign official severity levels.
- Update case statuses.
- Verify reported hazards.
- Add resolution notes.
- Record who resolved a case.
- View submitted photographs when available.
- Access report history and case-management information.

### 📊 Analytics and Insights

The authority dashboard provides analytical views of:

- Hazard category distribution.
- Severity distribution.
- Report status distribution.
- Monthly reporting trends.
- Resolution rate.
- Average resolution time.

These insights help authorities understand reporting patterns and monitor operational progress.

### 🔐 Security

- Password hashing using PBKDF2-HMAC-SHA256.
- Signed authority access tokens.
- Token expiration and validation.
- Protected authority API endpoints.
- Separate original authority and judge-demo accounts.
- Public citizen reporting and tracking endpoints.

---

## 🛠️ Technology Stack

| Component | Technology |
|---|---|
| Frontend | React, JavaScript |
| Frontend tooling | Vite |
| Routing | React Router |
| API communication | Axios |
| Mapping | Leaflet, React Leaflet |
| Map data | OpenStreetMap |
| Icons | Lucide React |
| Backend | Python, FastAPI |
| Database | PostgreSQL |
| ORM | SQLAlchemy |
| Authentication | PBKDF2, HMAC-signed tokens |
| Image storage | Cloudinary |
| Backend hosting | Render |
| Frontend hosting | Vercel |
| Database hosting | Neon PostgreSQL |

---

## 🏗️ System Architecture

HazardAtlas follows a client-server architecture.

```text
              CITIZENS
                  |
                  v
        React + Vite Frontend
                  |
                  v
          FastAPI Backend
                  |
       +----------+----------+
       |          |          |
       v          v          v
   PostgreSQL  Cloudinary  Authentication
     (Neon)    (Photos)    (Authority)
       |
       v
   Hazard Reports
   Case Management
   Report History
   Analytics
```

The frontend communicates with the backend through REST APIs. Report information is stored in PostgreSQL, while uploaded photographs are stored using Cloudinary.

---

## 📁 Project Structure

```text
Hazard-atlas/
│
├── backend/
│   ├── app/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── schemas/
│   │   ├── services/
│   │   ├── __init__.py
│   │   ├── auth.py
│   │   ├── config.py
│   │   ├── database.py
│   │   └── main.py
│   │
│   ├── tests/
│   ├── uploads/
│   ├── requirements.txt
│   ├── requirements-dev.txt
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── pages/
│   │   ├── services/
│   │   └── utils/
│   │
│   ├── public/
│   ├── package.json
│   └── vite.config.js
│
├── .gitignore
└── README.md
```

---

## 🚀 Getting Started

Follow these steps to run HazardAtlas locally.

### Prerequisites

- Python 3.10 or newer.
- Node.js and npm.
- Git.

### 1. Clone the Repository

```bash
git clone https://github.com/TonyBruce07/Hazard-atlas.git
cd Hazard-atlas
```

### 2. Backend Setup

Navigate to the backend directory:

```bash
cd backend
```

Create a virtual environment:

```bash
python -m venv .venv
```

Activate it on Windows PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Create a `.env` file using `.env.example` as a reference.

Configure the required environment variables:

```env
DATABASE_URL=your_database_connection_string

AUTHORITY_USERNAME=your_authority_username
AUTHORITY_PASSWORD_HASH=your_password_hash
AUTH_TOKEN_SECRET=your_secret_of_at_least_32_characters

CORS_ORIGINS=http://localhost:5173

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

Do not commit actual credentials or secret values.

Start the backend:

```bash
uvicorn app.main:app --reload
```

Backend URL:

`http://127.0.0.1:8000`

API documentation:

`http://127.0.0.1:8000/docs`

### 3. Frontend Setup

Open another terminal and navigate to the frontend:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Create a `.env` file in the frontend directory:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

Start the frontend:

```bash
npm run dev
```

Frontend URL:

`http://localhost:5173`

The application should now be accessible locally.

---

## 🔌 Main Application Capabilities

| Module | Functionality |
|---|---|
| Citizen Reporting | Submit road hazard reports |
| Report Tracking | Track reports using unique codes |
| Hazard Map | Explore reported hazard locations |
| Hotspot Detection | Group geographically nearby hazards |
| Authority Authentication | Secure authority access |
| Case Management | Review, verify, and update cases |
| Resolution Tracking | Record resolution notes and history |
| Analytics | Monitor hazard and resolution trends |

---

## ☁️ Deployment

HazardAtlas uses the following deployment services:

| Service | Purpose |
|---|---|
| Vercel | React frontend hosting |
| Render | FastAPI backend hosting |
| Neon | PostgreSQL database |
| Cloudinary | Image storage |

### Live Links

- **Application:** https://hazard-atlas-woad.vercel.app
- **GitHub:** https://github.com/TonyBruce07/Hazard-atlas

The backend API documentation is available at the deployed backend's `/docs` endpoint.

---

## 🔮 Future Improvements

Potential future enhancements include:

- AI-assisted hazard classification from uploaded photographs.
- Automated duplicate hazard detection.
- More advanced geographic risk prediction.
- Notifications when report statuses change.
- Authority-specific access roles and permissions.
- Mobile-first application experience.
- Integration with municipal complaint and road maintenance systems.
- Improved map clustering and geographic visualization.

---

## 🌍 Vision

HazardAtlas aims to create a more transparent and collaborative approach to road safety.

By connecting citizen participation with geographic intelligence and authority-led case management, the platform can help communities identify road hazards and support more informed decisions about public road safety.

**Every report matters. Every location tells a story. Safer roads start with awareness.**

---

## 👨‍💻 Project

**HazardAtlas – Community-Powered Road Safety Intelligence Platform**

Developed as a road safety technology solution for the FLARE Hackathon.

**Repository:** https://github.com/TonyBruce07/Hazard-atlas

**Live Demo:** https://hazard-atlas-woad.vercel.app

