from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from app.database import get_db
from app.models.telemetry import Telemetry
from app.models.equipment import Equipment
from app.schemas.telemetry import TelemetryCreate, TelemetryResponse
from app.services.equipment_service import calculate_utilization
from app.websocket_manager import ws_manager
from app.telemetry_simulator import telemetry_simulator

router = APIRouter(tags=["Telemetry & Logging"])

@router.post("/telemetry", response_model=TelemetryResponse, status_code=201)
async def ingest_telemetry(data: TelemetryCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """
    POST /api/telemetry: Validate telemetry with Pydantic model and store in PostgreSQL/Database.
    Recalculates dynamic metrics and broadcasts update via WebSocket stream.
    """
    eq = db.query(Equipment).filter(Equipment.equipment_id == data.equipment_id).first()
    if not eq:
        raise HTTPException(status_code=404, detail=f"Equipment with ID {data.equipment_id} not found")

    timestamp = data.timestamp or datetime.now()

    telemetry = Telemetry(
        equipment_id=data.equipment_id,
        timestamp=timestamp,
        latitude=data.latitude,
        longitude=data.longitude,
        engine_hours=data.engine_hours,
        idle_hours=data.idle_hours,
        fuel_level=data.fuel_level,
        operating_status=data.operating_status,
        fuel_consumption=data.fuel_consumption or 0.0,
        speed=data.speed or 0.0,
        engine_temperature=data.engine_temperature or 85.0,
        site_id=data.site_id or eq.site_id,
        operator_id=data.operator_id or eq.operator_id
    )
    db.add(telemetry)

    # Update Equipment record cumulative numbers and location
    eq.latitude = data.latitude
    eq.longitude = data.longitude
    eq.fuel_level = data.fuel_level
    eq.total_engine_hours = data.engine_hours
    eq.total_idle_hours = data.idle_hours
    eq.status = data.operating_status
    eq.last_telemetry_updated = timestamp

    db.commit()
    db.refresh(telemetry)

    util_pct = calculate_utilization(data.engine_hours, data.idle_hours)

    ws_payload = {
        "event": "TELEMETRY_INGESTED",
        "data": {
            "equipment_id": eq.equipment_id,
            "status": eq.status,
            "latitude": eq.latitude,
            "longitude": eq.longitude,
            "fuel_level": eq.fuel_level,
            "engine_hours": data.engine_hours,
            "idle_hours": data.idle_hours,
            "utilization_percentage": util_pct,
            "timestamp": timestamp.isoformat()
        }
    }
    background_tasks.add_task(ws_manager.broadcast, ws_payload)
    from app.services.anomaly_service import AnomalyService
    background_tasks.add_task(AnomalyService.run_fleet_anomaly_detection, db)

    response = TelemetryResponse.model_validate(telemetry)
    response.utilization_percentage = util_pct
    return response

@router.get("/telemetry/{equipment_id}", response_model=List[TelemetryResponse])
def get_telemetry_history(
    equipment_id: str,
    start_date: Optional[datetime] = Query(None, description="Filter telemetry from start timestamp"),
    end_date: Optional[datetime] = Query(None, description="Filter telemetry to end timestamp"),
    limit: int = Query(50, ge=1, le=500),
    db: Session = Depends(get_db)
):
    """
    GET /api/telemetry/{equipment_id}: Return historical telemetry for selected equipment.
    Supports date/time filtering.
    """
    query = db.query(Telemetry).filter(Telemetry.equipment_id == equipment_id)

    if start_date:
        query = query.filter(Telemetry.timestamp >= start_date)
    if end_date:
        query = query.filter(Telemetry.timestamp <= end_date)

    records = query.order_by(Telemetry.timestamp.desc()).limit(limit).all()
    records.reverse()  # Chronological order for Recharts timeline

    result = []
    for r in records:
        util = calculate_utilization(r.engine_hours, r.idle_hours)
        item = TelemetryResponse.model_validate(r)
        item.utilization_percentage = util
        result.append(item)

    return result

# Simulator Control Endpoints

@router.get("/telemetry/simulator/status")
def get_simulator_status():
    """Check whether the background telemetry simulator is running."""
    return {"is_running": telemetry_simulator.is_running}

@router.post("/telemetry/simulator/start")
def start_simulator():
    """Start periodic automatic telemetry simulator loop."""
    telemetry_simulator.start()
    return {"status": "started", "is_running": True}

@router.post("/telemetry/simulator/stop")
def stop_simulator():
    """Stop automatic telemetry simulator loop."""
    telemetry_simulator.stop()
    return {"status": "stopped", "is_running": False}

@router.post("/telemetry/simulator/step")
def trigger_simulator_step():
    """Execute a single telemetry simulation step cycle immediately."""
    result = telemetry_simulator.step_simulation()
    return result

@router.post("/telemetry/simulator/trigger-idle")
def trigger_excessive_idle_demo(equipment_id: str = Query("EQX1001")):
    """Demo Trigger: Simulate equipment becoming highly idle (surges idle hours)."""
    return telemetry_simulator.trigger_excessive_idle_scenario(equipment_id)

@router.post("/telemetry/simulator/trigger-overdue")
def trigger_overdue_demo(equipment_id: str = Query("EQX1001")):
    """Demo Trigger: Simulate equipment passing its return date (marked OVERDUE)."""
    return telemetry_simulator.trigger_overdue_scenario(equipment_id)
