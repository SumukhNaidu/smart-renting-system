from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class EquipmentBillingResponse(BaseModel):
    equipment_id: str
    equipment_type: str
    status: str
    checkout_date: Optional[datetime] = None
    expected_checkin_date: Optional[datetime] = None
    days_rented: int
    daily_rate: float
    base_rent_cost: float
    is_overdue: bool
    days_overdue: int
    overdue_penalty_rate: float
    overdue_penalty_cost: float
    total_idle_hours: float
    excessive_idle_hours: float
    idle_penalty_rate: float
    idle_penalty_cost: float
    fuel_surcharge: float
    total_invoice_amount: float
    currency: str = "USD"

    class Config:
        from_attributes = True

class FleetBillingSummaryResponse(BaseModel):
    total_rented_assets: int
    overdue_asset_count: int
    total_base_revenue: float
    total_overdue_penalties: float
    total_idle_penalties: float
    total_fleet_revenue: float
    currency: str = "USD"
    items: List[EquipmentBillingResponse]
