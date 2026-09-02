# Smart Rental Tracking System

A full-stack fleet management and rental tracking application for Caterpillar-style heavy equipment operations. The system combines a FastAPI backend, SQLite persistence, and a React + TypeScript dashboard for equipment monitoring, anomalies, billing impact, demand forecasting, and dealer-side operations.

## Overview

This project is designed to simulate a rental and fleet operations workflow where dealers and operators can:

- log in using an operator ID or QR login token
- view all equipment and rental status
- check equipment in and out
- track utilization, idle time, and overdue assets
- view anomaly alerts and operational warnings
- review cost impact and billing summaries
- access a dealer-facing AI assistant
- monitor live notifications and fleet events

## Tech Stack

- Backend: Python, FastAPI, SQLAlchemy, SQLite
- Frontend: React, TypeScript, Vite
- Visualization: Recharts, Leaflet, Lucide icons
- Data layer: local SQLite database seeded with demo fleet data

## Features

### Equipment tracking
- fleet overview with equipment list, status, utilization, and site assignment
- per-equipment detail cards for active and historical operation status
- check-in/check-out workflows by ID or QR code

### Operator and QR workflow
- operator login screen
- QR generation for login token access
- ID or QR validation for operator authentication

### Monitoring and anomaly detection
- real-time alert generation for overdue and idle equipment
- anomaly detection based on utilization, idle hours, and status anomalies
- anomaly dashboard with equipment-specific issue tracking

### Dealer operations
- dealer-side notification panel
- live notifications for overdue equipment, idle machines, and anomalies
- cost impact and billing dashboard panel

### Forecasting and analytics
- demand forecasting summaries
- utilization distributions and KPI cards
- operational dashboard views for asset performance and utilization trends

## Project Structure

```text
smart-renting-system/
├── README.md
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── routers/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/
│   │   ├── __init__.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── main.py
│   │   ├── telemetry_simulator.py
│   │   └── websocket_manager.py
│   ├── tests/
│   ├── requirements.txt
│   ├── seed_data.py
│   └── smart_rental.db
└── frontend/
    ├── src/
    ├── public/
    ├── package.json
    ├── vite.config.ts
    └── index.html
```

## Database

The application uses a local SQLite database stored at:

- [smart-renting-system/backend/smart_rental.db](smart-renting-system/backend/smart_rental.db)

The database is seeded automatically from the backend when the app starts. This keeps the system self-contained and easy to run locally without a separate database server.

## Running the Project

### 1. Backend

From the project root:

```bash
cd smart-renting-system/backend
python -m venv .venv
source .venv/bin/activate   # Linux/macOS
# or .venv\Scripts\activate   # Windows PowerShell
pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Then open:

- http://localhost:8000
- API docs: http://localhost:8000/api/docs

### 2. Frontend

From a separate terminal:

```bash
cd smart-renting-system/frontend
npm install
npm run dev -- --host 0.0.0.0 --port 4173
```

Then open:

- http://localhost:4173

## Default Demo Data

The project ships with seeded equipment records and telemetry data for demonstration purposes. This includes:

- machine IDs and types
- site assignment data
- operator IDs
- utilization values
- anomaly and overdue scenarios
- billing and demand forecast inputs

## Notes

- This is a local demo application intended for fleet simulation and dealer workflow evaluation.
- The app is built for showcase and operational dashboard prototypes rather than a live enterprise deployment.
- The SQLite database is the primary persistence layer in the current setup.

## License

This project is for demonstration and internal prototype use.
