# Spotter HOS Copilot & FMCSA ELD Log Sheet Generator

A full-stack web application built with **Django REST Framework**, **React (Vite)**, and **Leaflet (OpenStreetMap)**. It calculates compliant commercial motor vehicle (CMV) trip itineraries under strict **FMCSA 49 CFR Part 395 Hours of Service (HOS)** regulations and renders authentic, printable **Driver's Daily Log (RODS)** sheets with dynamic 24-hour stepped graph grids.

---

## Deliverables & Quick Links

- **Live Hosted Application:** Deployed on Vercel ([vercel.json included](vercel.json)).
- **Loom Walkthrough Script:** [LOOM_SCRIPT.md](LOOM_SCRIPT.md) (Complete 3–5 minute presentation script).
- **GitHub Repository Code:** Ready for GitHub push.

---

## 🚀 Quick Start: How to Run This Project

### 1. Run the Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev
```
> Opens locally on **`http://localhost:5173/`**.

### 2. Run the Backend (Django REST Framework)
In a second terminal window:
```bash
cd backend
pip install django djangorestframework django-cors-headers requests pytest
python manage.py migrate
python manage.py runserver
```
> API runs locally on **`http://127.0.0.1:8000/api/`**.

### 3. Run Backend Automated Tests
```bash
cd backend
python manage.py test api
```


---

## Key Features & FMCSA Regulations Implemented

| FMCSA Regulation / Rule | Regulatory Citation | Implementation in Application |
| :--- | :--- | :--- |
| **Property-Carrying 70hr / 8-Day Rule** | 49 CFR § 395.3(b) | Tracks rolling 8-day duty accumulation; prevents driving past 70 on-duty hours; triggers 34-hour restart. |
| **11-Hour Driving Limit** | 49 CFR § 395.3(a)(3) | Limits driving to 11.0 cumulative hours following a 10-hour consecutive rest break. |
| **14-Hour Duty Window** | 49 CFR § 395.3(a)(2) | Caps all driving within a 14.0 consecutive hour window from the start of any on-duty status. |
| **30-Minute Rest Break** | 49 CFR § 395.3(a)(3)(ii) | Enforces a 30-minute consecutive break (off-duty or on-duty) after at most 8 cumulative hours of driving. |
| **10-Hour Consecutive Rest** | 49 CFR § 395.3(a)(1) | Schedules 10 consecutive hours in sleeper berth / off-duty to reset the 11h driving and 14h duty window. |
| **Fueling Stops** | Assessment Assumption | Schedules 30-minute on-duty fueling stops at least once every 1,000 miles (which also resets the 8h driving break). |
| **Pickup & Drop-off Times** | Assessment Assumption | Automatically logs 1.0 hour On-Duty (Not Driving) for loading at pickup and 1.0 hour for unloading at drop-off. |
| **Pre / Post-Trip Inspections** | 49 CFR § 396.11 | Logs 15 minutes On-Duty before starting a driving shift and 15 minutes after concluding a shift. |
| **34-Hour Restart** | 49 CFR § 395.3(c) | Resets accumulated cycle hours back to 0.0 when 34 consecutive hours off-duty/sleeper berth are taken. |
| **Authentic 24-Hour Daily Log (RODS)** | 49 CFR § 395.8 | Dynamically draws the official 4-row graph grid (Off Duty, Sleeper, Driving, On Duty ND) with quarter-hour tick marks, stepped transitions, remarks, and 70-hr recap. Multi-day trips generate separate 24.0-hour sheets per calendar day. |

---

## System Architecture

```
Tsk/
├── backend/                  # Django REST Framework Backend
│   ├── api/
│   │   ├── services/
│   │   │   ├── hos_engine.py       # FMCSA HOS simulation & 24h log generator
│   │   │   └── routing_service.py  # Geocoding (Nominatim) & OSRM routing
│   │   ├── views.py                # REST endpoints (TripPlanView, PresetsView)
│   │   ├── urls.py                 # API URL routes
│   │   └── tests.py                # Backend unit tests suite
│   ├── hos_project/                # Django project settings & URLs
│   └── manage.py
│
├── frontend/                 # React 18 + Vite Frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── EldLogSheet.jsx     # Authentic FMCSA 24h SVG grid & recap
│   │   │   ├── RouteMap.jsx        # Leaflet interactive map with custom pins
│   │   │   ├── TripTimeline.jsx    # Step-by-step route instructions & stops
│   │   │   └── MetricsOverview.jsx # Cockpit KPI metric cards
│   │   ├── services/
│   │   │   ├── api.js              # API client with auto backend/client fallback
│   │   │   └── hosSimulator.js     # Client-side HOS calculation engine
│   │   ├── App.jsx                 # Cockpit layout & interactive state
│   │   └── index.css               # Modern design system & print styles
│   ├── package.json
│   └── vite.config.js
│
├── LOOM_SCRIPT.md            # Video walkthrough presentation script
├── vercel.json               # Vercel deployment configuration
└── README.md
```

---

## Local Setup & Development

### 1. Prerequisites
- Python 3.10+
- Node.js 18+ and npm

### 2. Backend Setup (Django)
```bash
# Navigate to backend
cd backend

# Install dependencies
pip install django djangorestframework django-cors-headers requests pytest

# Run database migrations
python manage.py migrate

# Run backend unit tests
python manage.py test api

# Start Django development server (runs on http://127.0.0.1:8000)
python manage.py runserver
```

### 3. Frontend Setup (React + Vite)
```bash
# Navigate to frontend (in a new terminal)
cd frontend

# Install npm dependencies
npm install

# Start Vite dev server (runs on http://localhost:5173)
npm run dev
```

Visit **`http://localhost:5173/`** in your browser.

---

## API Endpoints Reference

### `POST /api/plan-trip/`
Computes trip routing and generates compliant multi-day ELD log sheets.
- **Request Body:**
  ```json
  {
    "current_location": "Chicago, IL",
    "pickup_location": "Indianapolis, IN",
    "dropoff_location": "Dallas, TX",
    "current_cycle_used": 15.0,
    "avg_speed": 58.0,
    "start_time": "2026-09-04T06:00:00"
  }
  ```
- **Response:**
  - `summary`: Total miles, driving hours, rest hours, cycle used, daily sheet count.
  - `locations`: Geocoded coordinates for origin, pickup, dropoff.
  - `stops`: Sequence of scheduled waypoints (Fuel, 30m break, 10h rest, Pickup, Dropoff).
  - `route_geometry`: Polyline coordinates for map rendering.
  - `daily_logs`: Array of 24.0-hour calendar day log sheets (intervals, totals, remarks, recap).

### `GET /api/presets/`
Returns sample scenario configurations for one-click testing.

### `GET /api/health/`
Returns server operational health status.

---

## Vercel Deployment Guide

This repository is pre-configured for deployment to **[Vercel](https://vercel.com/)**:
1. Push this repository to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: FMCSA ELD Log & Trip Route Planner"
   git remote add origin <your-github-repo-url>
   git push -u origin main
   ```
2. Import the project into Vercel.
3. Set the **Root Directory** to `frontend` (or keep root with included `vercel.json`).
4. Build command: `npm run build` | Output directory: `dist`.
5. Deploy! The frontend includes an integrated client-side calculation mirror so the live demo runs with 100% reliability immediately without needing cold-start backend setups.

---

## License
MIT License. Built for Spotter Full-Stack Developer Assessment.
