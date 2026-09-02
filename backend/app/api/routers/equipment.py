from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.schemas.equipment import (
    EquipmentActionRequest,
    EquipmentResponse,
    DashboardSummaryResponse,
    EquipmentUtilizationDistribution,
)
from app.services.equipment_service import (
    get_all_equipment, get_equipment_by_id, get_dashboard_summary, get_utilization_distribution
)
from app.models.equipment import Equipment
from datetime import datetime, timedelta

router = APIRouter(tags=["Equipment & Dashboard"])

@router.get("/dashboard/summary", response_model=DashboardSummaryResponse)
def read_dashboard_summary(db: Session = Depends(get_db)):
    """Fetch high-level operational summary KPIs for Caterpillar equipment dashboard."""
    return get_dashboard_summary(db)

@router.get("/dashboard/utilization", response_model=EquipmentUtilizationDistribution)
def read_utilization_distribution(db: Session = Depends(get_db)):
    """Fetch equipment utilization category breakdown (HIGH, NORMAL, LOW)."""
    return get_utilization_distribution(db)

@router.get("/equipment", response_model=List[EquipmentResponse])
def read_equipment_list(
    status: Optional[str] = Query(None, description="Filter by derived status: AVAILABLE, ACTIVE, IDLE, OVERDUE, UNASSIGNED, ANOMALY"),
    equipment_type: Optional[str] = Query(None, description="Filter by type: Excavator, Crane, Bulldozer, Grader"),
    site_id: Optional[str] = Query(None, description="Filter by site ID"),
    db: Session = Depends(get_db)
):
    """Retrieve full searchable and filterable list of equipment with enriched metrics."""
    return get_all_equipment(db, status=status, equipment_type=equipment_type, site_id=site_id)

@router.get("/equipment/{equipment_id}", response_model=EquipmentResponse)
def read_equipment_by_id(equipment_id: str, db: Session = Depends(get_db)):
    """Retrieve detailed operational record for a specific equipment item."""
    eq = get_equipment_by_id(db, equipment_id)
    if not eq:
        raise HTTPException(status_code=404, detail=f"Equipment with ID {equipment_id} not found")
    return eq


@router.post("/equipment/checkout", response_model=EquipmentResponse)
def update_equipment_checkout_state(payload: EquipmentActionRequest, db: Session = Depends(get_db)):
    """Check out or check in equipment using equipment ID or QR code."""
    equipment_id = payload.normalized_equipment_id
    if not equipment_id:
        raise HTTPException(status_code=400, detail="Equipment ID or QR code is required")

    eq = db.query(Equipment).filter(Equipment.equipment_id == equipment_id).first()
    if not eq:
        qr_equivalent = db.query(Equipment).filter(Equipment.qr_code == payload.qr_code.strip().upper() if payload.qr_code else None).first()
        if not qr_equivalent:
            raise HTTPException(status_code=404, detail=f"Equipment with ID or QR {equipment_id} not found")
        eq = qr_equivalent

    normalized_action = (payload.action or "checkout").lower().strip()
    now = datetime.utcnow()

    if normalized_action == "checkout":
        eq.checkout_date = eq.checkout_date or now
        eq.expected_checkin_date = payload.expected_checkin_date or (now + timedelta(days=7))
        eq.actual_checkin_date = None
        eq.site_id = payload.site_id or eq.site_id
        eq.operator_id = payload.operator_id or eq.operator_id
        eq.status = "ACTIVE" if (eq.site_id and eq.operator_id) else "UNASSIGNED"
    elif normalized_action == "checkin":
        eq.actual_checkin_date = now
        eq.expected_checkin_date = eq.expected_checkin_date or now
        eq.site_id = payload.site_id or eq.site_id
        eq.operator_id = payload.operator_id or eq.operator_id
        eq.status = "AVAILABLE"
    else:
        raise HTTPException(status_code=400, detail="Action must be either 'checkout' or 'checkin'")

    db.commit()
    db.refresh(eq)
    return get_equipment_by_id(db, eq.equipment_id)
