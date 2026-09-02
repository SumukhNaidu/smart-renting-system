from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class EquipmentBase(BaseModel):
    equipment_id: str
    equipment_type: str
    site_id: Optional[str] = None
    operator_id: Optional[str] = None
    status: str = "AVAILABLE"
    checkout_date: Optional[datetime] = None
    expected_checkin_date: Optional[datetime] = None
    actual_checkin_date: Optional[datetime] = None
    engine_hours_per_day: float = 0.0
    idle_hours_per_day: float = 0.0
    total_engine_hours: float = 0.0
    total_idle_hours: float = 0.0
    operating_days: int = 0
    fuel_level: float = 100.0
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class EquipmentCreate(EquipmentBase):
    pass

class EquipmentUpdate(BaseModel):
    equipment_type: Optional[str] = None
    site_id: Optional[str] = None
    operator_id: Optional[str] = None
    status: Optional[str] = None
    checkout_date: Optional[datetime] = None
    expected_checkin_date: Optional[datetime] = None
    actual_checkin_date: Optional[datetime] = None

class EquipmentActionRequest(BaseModel):
    equipment_id: Optional[str] = None
    qr_code: Optional[str] = None
    site_id: Optional[str] = None
    operator_id: Optional[str] = None
    action: str = "checkout"
    expected_checkin_date: Optional[datetime] = None

    @property
    def normalized_equipment_id(self) -> Optional[str]:
        if self.equipment_id:
            return self.equipment_id.strip().upper()
        if not self.qr_code:
            return None
        raw = self.qr_code.strip().upper()
        prefixes = ["CAT-", "QR-", "CATERPILLAR-"]
        for prefix in prefixes:
            if raw.startswith(prefix):
                raw = raw[len(prefix):]
        return raw


class EquipmentResponse(EquipmentBase):
    qr_code: Optional[str] = None
    utilization_percentage: float = 0.0
    utilization_category: str = "NORMAL" # HIGH, NORMAL, LOW
    is_overdue: bool = False
    days_overdue: Optional[int] = None
    active_alert_count: int = 0
    has_anomaly: bool = False
    last_telemetry_updated: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class DashboardSummaryResponse(BaseModel):
    total_equipment: int
    active_equipment: int
    idle_equipment: int
    available_equipment: int
    overdue_equipment: int
    unassigned_equipment: int
    anomaly_equipment: int
    average_utilization: float

class EquipmentUtilizationDistribution(BaseModel):
    high_utilization_count: int
    normal_utilization_count: int
    low_utilization_count: int
