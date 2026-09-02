from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.equipment import Equipment
from app.schemas.billing import EquipmentBillingResponse, FleetBillingSummaryResponse
from app.services.billing_service import calculate_equipment_billing, get_fleet_billing_summary

router = APIRouter(tags=["Financial & Rental Billing"])

@router.get("/billing/summary", response_model=FleetBillingSummaryResponse)
def get_billing_summary(db: Session = Depends(get_db)):
    """Retrieve financial billing summary across all rented Caterpillar equipment assets."""
    return get_fleet_billing_summary(db)

@router.get("/billing/{equipment_id}", response_model=EquipmentBillingResponse)
def get_equipment_billing(equipment_id: str, db: Session = Depends(get_db)):
    """Retrieve itemized billing breakdown for specific equipment."""
    eq = db.query(Equipment).filter(Equipment.equipment_id == equipment_id).first()
    if not eq:
        raise HTTPException(status_code=404, detail=f"Equipment {equipment_id} not found")
    return calculate_equipment_billing(eq)
