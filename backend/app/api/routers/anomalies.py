from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime
from app.database import get_db
from app.models.anomaly import Anomaly
from app.models.equipment import Equipment
from app.models.alert import Alert
from app.schemas.anomaly import AnomalyResponse, ModelTrainResponse
from app.services.anomaly_service import AnomalyService

router = APIRouter(tags=["Anomaly Detection"])

@router.get("/anomalies", response_model=List[AnomalyResponse])
def get_anomalies(
    equipment_id: Optional[str] = Query(None),
    anomaly_type: Optional[str] = Query(None),
    resolved: Optional[bool] = Query(None),
    db: Session = Depends(get_db)
):
    """Retrieve detected anomalies from Isolation Forest ML and rule engines."""
    query = db.query(Anomaly)
    if equipment_id:
        query = query.filter(Anomaly.equipment_id == equipment_id)
    if anomaly_type:
        query = query.filter(Anomaly.anomaly_type == anomaly_type)
    if resolved is not None:
        query = query.filter(Anomaly.resolved == resolved)

    return query.order_by(Anomaly.detected_at.desc()).all()

@router.get("/anomalies/summary")
def get_anomaly_summary(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Retrieve aggregate anomaly detection metrics for dashboard overview."""
    all_anomalies = db.query(Anomaly).all()
    unresolved = [a for a in all_anomalies if not a.resolved]
    
    types_count: Dict[str, int] = {}
    for a in unresolved:
        types_count[a.anomaly_type] = types_count.get(a.anomaly_type, 0) + 1

    excessive_idle = sum(1 for a in unresolved if a.anomaly_type == "EXCESSIVE_IDLE")
    unassigned = sum(1 for a in unresolved if a.anomaly_type == "UNASSIGNED")
    overdue = sum(1 for a in unresolved if a.anomaly_type == "OVERDUE_RETURN")

    return {
        "total_anomalies": len(all_anomalies),
        "unresolved_count": len(unresolved),
        "excessive_idle_count": excessive_idle,
        "unassigned_count": unassigned,
        "overdue_count": overdue,
        "anomalies_by_type": types_count
    }

@router.post("/anomalies/detect", response_model=List[AnomalyResponse])
def trigger_fleet_anomaly_scan(db: Session = Depends(get_db)):
    """Trigger real-time fleet anomaly scan using Isolation Forest ML and rule engines."""
    new_anomalies = AnomalyService.run_fleet_anomaly_detection(db)
    return new_anomalies

@router.post("/anomalies/train", response_model=ModelTrainResponse)
def train_isolation_forest_model(db: Session = Depends(get_db)):
    """Train or retrain Isolation Forest ML model on historical fleet telemetry."""
    res = AnomalyService.train_isolation_forest(db)
    return ModelTrainResponse(**res)

@router.get("/anomalies/{equipment_id}", response_model=List[AnomalyResponse])
def get_equipment_anomalies(equipment_id: str, db: Session = Depends(get_db)):
    """Retrieve anomaly logs for specific equipment item."""
    return db.query(Anomaly).filter(
        Anomaly.equipment_id == equipment_id
    ).order_by(Anomaly.detected_at.desc()).all()

@router.patch("/anomalies/{anomaly_id}/resolve", response_model=AnomalyResponse)
async def resolve_anomaly(anomaly_id: int, db: Session = Depends(get_db)):
    """Mark all operational anomalies for target asset as resolved and restore normal asset status."""
    anomaly = db.query(Anomaly).filter(Anomaly.anomaly_id == anomaly_id).first()
    if not anomaly:
        raise HTTPException(status_code=404, detail=f"Anomaly ID {anomaly_id} not found")

    target_eq_id = anomaly.equipment_id

    # Resolve all active anomalies for this equipment asset
    db.query(Anomaly).filter(
        Anomaly.equipment_id == target_eq_id,
        Anomaly.resolved == False
    ).update({"resolved": True})

    # Resolve matching active alerts for this equipment asset
    db.query(Alert).filter(
        Alert.equipment_id == target_eq_id,
        Alert.resolved == False
    ).update({"resolved": True})

    db.commit()

    # Restore equipment operational status based on runtime & checkout state
    eq = db.query(Equipment).filter(Equipment.equipment_id == target_eq_id).first()
    if eq:
        now = datetime.utcnow()
        is_overdue = bool(eq.expected_checkin_date and eq.actual_checkin_date is None and now > eq.expected_checkin_date)
        is_unassigned = bool((eq.checkout_date is not None and eq.actual_checkin_date is None) and (eq.site_id is None or eq.operator_id is None))

        if is_overdue:
            eq.status = "OVERDUE"
        elif is_unassigned:
            eq.status = "UNASSIGNED"
        elif eq.engine_hours_per_day > 0:
            eq.status = "ACTIVE"
        elif eq.idle_hours_per_day > 0:
            eq.status = "IDLE"
        else:
            eq.status = "AVAILABLE"

        db.commit()
        db.refresh(eq)

    db.refresh(anomaly)

    # Broadcast WebSocket update so frontend instantly updates tables and cards across all tabs
    from app.websocket_manager import ws_manager
    ws_payload = {
        "event": "ANOMALY_RESOLVED",
        "data": {
            "anomaly_id": anomaly_id,
            "equipment_id": target_eq_id,
            "new_status": eq.status if eq else "UNKNOWN"
        }
    }
    await ws_manager.broadcast(ws_payload)

    return anomaly



