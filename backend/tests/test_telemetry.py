import pytest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_telemetry_ingestion_valid():
    payload = {
        "equipment_id": "EQX1001",
        "latitude": 39.7392,
        "longitude": -104.9903,
        "engine_hours": 25.5,
        "idle_hours": 152.0,
        "fuel_level": 65.0,
        "operating_status": "ACTIVE",
        "fuel_consumption": 14.5,
        "speed": 18.0,
        "engine_temperature": 88.5
    }
    response = client.post("/api/telemetry", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["equipment_id"] == "EQX1001"
    assert data["engine_hours"] == 25.5
    assert data["idle_hours"] == 152.0
    assert data["utilization_percentage"] > 0

def test_telemetry_ingestion_invalid_equipment():
    payload = {
        "equipment_id": "NON_EXISTENT_EQ",
        "latitude": 40.0,
        "longitude": -90.0,
        "engine_hours": 10.0,
        "idle_hours": 5.0,
        "fuel_level": 80.0,
        "operating_status": "ACTIVE"
    }
    response = client.post("/api/telemetry", json=payload)
    assert response.status_code == 404

def test_telemetry_ingestion_validation_error():
    payload = {
        "equipment_id": "EQX1001",
        "latitude": 39.7392,
        "longitude": -104.9903,
        "engine_hours": -5.0, # Negative engine hours should fail validation
        "idle_hours": 10.0,
        "fuel_level": 150.0, # Fuel level > 100 should fail validation
        "operating_status": "ACTIVE"
    }
    response = client.post("/api/telemetry", json=payload)
    assert response.status_code == 422 # Unprocessable Entity

def test_get_telemetry_history():
    response = client.get("/api/telemetry/EQX1001")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0
    assert data[0]["equipment_id"] == "EQX1001"

def test_get_telemetry_history_date_filter():
    start = (datetime.utcnow() - timedelta(days=5)).isoformat()
    response = client.get(f"/api/telemetry/EQX1001?start_date={start}")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)

def test_simulator_status():
    response = client.get("/api/telemetry/simulator/status")
    assert response.status_code == 200
    assert "is_running" in response.json()

def test_simulator_step():
    response = client.post("/api/telemetry/simulator/step")
    assert response.status_code == 200
    assert response.json()["status"] == "success"

def test_simulator_trigger_idle():
    response = client.post("/api/telemetry/simulator/trigger-idle?equipment_id=EQX1001")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["equipment_id"] == "EQX1001"

def test_simulator_trigger_overdue():
    response = client.post("/api/telemetry/simulator/trigger-overdue?equipment_id=EQX1001")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["equipment_id"] == "EQX1001"
