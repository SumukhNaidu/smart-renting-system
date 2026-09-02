from datetime import datetime
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.equipment import Equipment
from app.schemas.billing import EquipmentBillingResponse, FleetBillingSummaryResponse

# Equipment daily rental rates in USD based on Caterpillar equipment type
DAILY_RATES: Dict[str, float] = {
    "Excavator": 450.0,
    "Dozer": 520.0,
    "Wheel Loader": 380.0,
    "Motor Grader": 410.0,
    "Backhoe Loader": 320.0,
    "Skid Steer": 250.0,
    "Compactor": 280.0,
    "Articulated Truck": 600.0,
}
DEFAULT_DAILY_RATE = 350.0
OVERDUE_PENALTY_PER_DAY = 180.0 # $180/day penalty for overdue returns
EXCESSIVE_IDLE_THRESHOLD_HOURS = 20.0 # Idle hours threshold before surcharge kicks in
IDLE_PENALTY_PER_HOUR = 35.0 # $35/hr penalty for excessive idle burn

def calculate_equipment_billing(eq: Equipment) -> EquipmentBillingResponse:
    now = datetime.now()
    
    daily_rate = DAILY_RATES.get(eq.equipment_type, DEFAULT_DAILY_RATE)
    
    # Calculate rental duration (days)
    if eq.checkout_date:
        end_date = eq.actual_checkin_date or now
        delta = end_date - eq.checkout_date
        days_rented = max(1, delta.days)
    else:
        days_rented = 0

    base_rent_cost = round(days_rented * daily_rate, 2)

    # Calculate overdue status and penalties
    is_overdue = False
    days_overdue = 0
    overdue_penalty_cost = 0.0
    if eq.expected_checkin_date and eq.actual_checkin_date is None and now > eq.expected_checkin_date:
        is_overdue = True
        days_overdue = max(1, (now - eq.expected_checkin_date).days)
        overdue_penalty_cost = round(days_overdue * OVERDUE_PENALTY_PER_DAY, 2)

    # Calculate excessive idle penalties
    total_idle = eq.total_idle_hours or 0.0
    excessive_idle_hours = max(0.0, total_idle - EXCESSIVE_IDLE_THRESHOLD_HOURS)
    idle_penalty_cost = round(excessive_idle_hours * IDLE_PENALTY_PER_HOUR, 2)

    # Calculate fuel refill surcharge if returned below 25%
    fuel_surcharge = 0.0
    if eq.fuel_level and eq.fuel_level < 25.0:
        fuel_surcharge = round((25.0 - eq.fuel_level) * 4.5, 2)

    total_invoice = round(base_rent_cost + overdue_penalty_cost + idle_penalty_cost + fuel_surcharge, 2)

    return EquipmentBillingResponse(
        equipment_id=eq.equipment_id,
        equipment_type=eq.equipment_type,
        status=eq.status,
        checkout_date=eq.checkout_date,
        expected_checkin_date=eq.expected_checkin_date,
        days_rented=days_rented,
        daily_rate=daily_rate,
        base_rent_cost=base_rent_cost,
        is_overdue=is_overdue,
        days_overdue=days_overdue,
        overdue_penalty_rate=OVERDUE_PENALTY_PER_DAY,
        overdue_penalty_cost=overdue_penalty_cost,
        total_idle_hours=total_idle,
        excessive_idle_hours=excessive_idle_hours,
        idle_penalty_rate=IDLE_PENALTY_PER_HOUR,
        idle_penalty_cost=idle_penalty_cost,
        fuel_surcharge=fuel_surcharge,
        total_invoice_amount=total_invoice,
        currency="USD"
    )

def get_fleet_billing_summary(db: Session) -> FleetBillingSummaryResponse:
    all_eq = db.query(Equipment).all()
    items = [calculate_equipment_billing(eq) for eq in all_eq]
    
    total_rented = sum(1 for item in items if item.days_rented > 0)
    overdue_count = sum(1 for item in items if item.is_overdue)
    total_base = round(sum(item.base_rent_cost for item in items), 2)
    total_overdue = round(sum(item.overdue_penalty_cost for item in items), 2)
    total_idle = round(sum(item.idle_penalty_cost for item in items), 2)
    total_fleet_rev = round(sum(item.total_invoice_amount for item in items), 2)

    return FleetBillingSummaryResponse(
        total_rented_assets=total_rented,
        overdue_asset_count=overdue_count,
        total_base_revenue=total_base,
        total_overdue_penalties=total_overdue,
        total_idle_penalties=total_idle,
        total_fleet_revenue=total_fleet_rev,
        currency="USD",
        items=items
    )
