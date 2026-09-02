from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from app.database import get_db
from app.models.alert import Alert
from app.schemas.alert import AlertResponse, AlertAcknowledgeRequest, AlertResolveRequest

router = APIRouter(tags=["Alerts & Notifications"])

@router.get("/alerts", response_model=List[AlertResponse])
def get_alerts(
    equipment_id: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    alert_type: Optional[str] = Query(None),
    acknowledged: Optional[bool] = Query(None),
    resolved: Optional[bool] = Query(None),
    db: Session = Depends(get_db)
):
    """Retrieve operational alerts filtered by severity, equipment, or resolution state."""
    query = db.query(Alert)
    if equipment_id:
        query = query.filter(Alert.equipment_id == equipment_id)
    if severity:
        query = query.filter(Alert.severity == severity.upper())
    if alert_type:
        query = query.filter(Alert.alert_type == alert_type.upper())
    if acknowledged is not None:
        query = query.filter(Alert.acknowledged == acknowledged)
    if resolved is not None:
        query = query.filter(Alert.resolved == resolved)

    return query.order_by(Alert.created_at.desc()).all()

@router.patch("/alerts/{alert_id}/acknowledge", response_model=AlertResponse)
def acknowledge_alert(alert_id: int, req: AlertAcknowledgeRequest, db: Session = Depends(get_db)):
    """Mark an in-app alert notification as acknowledged by user."""
    alert = db.query(Alert).filter(Alert.alert_id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail=f"Alert {alert_id} not found")

    alert.acknowledged = req.acknowledged
    db.commit()
    db.refresh(alert)
    return alert

@router.patch("/alerts/{alert_id}/resolve", response_model=AlertResponse)
def resolve_alert(alert_id: int, req: AlertResolveRequest, db: Session = Depends(get_db)):
    """Mark an operational alert as resolved."""
    alert = db.query(Alert).filter(Alert.alert_id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail=f"Alert {alert_id} not found")

    alert.resolved = req.resolved
    if req.resolved:
        alert.resolved_at = datetime.utcnow()
    db.commit()
    db.refresh(alert)
    return alert
