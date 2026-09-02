import pytest
from fastapi.testclient import TestClient
from app.main import app
from seed_data import seed_database

client = TestClient(app)

@pytest.fixture(autouse=True)
def reset_db_state():
    seed_database(force_reset=True)
    yield
    seed_database(force_reset=True)

def test_root_check():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "online"


def test_get_demand_forecast():
    response = client.get("/api/forecast/demand")
    assert response.status_code == 200
    data = response.json()
    assert "total_expected_demand" in data
    assert "forecast_days" in data
    assert "site_forecast" in data
    assert isinstance(data["site_forecast"], list)
    assert len(data["site_forecast"]) > 0


def test_get_dashboard_summary():
    response = client.get("/api/dashboard/summary")
    assert response.status_code == 200
    data = response.json()
    assert "total_equipment" in data
    assert "active_equipment" in data
    assert "average_utilization" in data
    assert data["total_equipment"] == 7

def test_get_equipment_list():
    response = client.get("/api/equipment")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 7
    # Verify EQX1001 exists in response
    eq1 = next((item for item in data if item["equipment_id"] == "EQX1001"), None)
    assert eq1 is not None
    assert eq1["equipment_type"] == "Excavator"
    assert eq1["site_id"] == "S003"
    assert eq1["operator_id"] == "OP101"

def test_get_equipment_by_id():
    response = client.get("/api/equipment/EQX1001")
    assert response.status_code == 200
    data = response.json()
    assert data["equipment_id"] == "EQX1001"
    assert data["utilization_percentage"] > 0

def test_get_equipment_by_id_not_found():
    response = client.get("/api/equipment/NON_EXISTENT_ID")
    assert response.status_code == 404


def test_checkin_checkout_via_id_and_qr_code():
    checkout_payload = {
        "equipment_id": "EQX1001",
        "qr_code": "CAT-EQX1001",
        "action": "checkout",
        "site_id": "S001",
        "operator_id": "OP999"
    }
    checkout = client.post("/api/equipment/checkout", json=checkout_payload)
    assert checkout.status_code == 200, checkout.text
    data = checkout.json()
    assert data["equipment_id"] == "EQX1001"
    assert data["status"] == "ACTIVE"
    assert data["checkout_date"] is not None
    assert data["site_id"] == "S001"
    assert data["operator_id"] == "OP999"

    checkin_payload = {
        "equipment_id": "EQX1001",
        "qr_code": "EQX1001",
        "action": "checkin"
    }
    checkin = client.post("/api/equipment/checkout", json=checkin_payload)
    assert checkin.status_code == 200, checkin.text
    body = checkin.json()
    assert body["equipment_id"] == "EQX1001"
    assert body["actual_checkin_date"] is not None
    assert body["status"] in ["AVAILABLE", "IDLE"]
