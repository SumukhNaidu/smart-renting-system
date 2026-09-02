from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class TelemetryCreate(BaseModel):
    equipment_id: str
    timestamp: Optional[datetime] = None
    latitude: float
    longitude: float
    engine_hours: float = Field(..., ge=0, description="Cumulative engine runtime hours")
    idle_hours: float = Field(..., ge=0, description="Cumulative idle hours")
    fuel_level: float = Field(..., ge=0, le=100, description="Fuel level percentage (0-100)")
    operating_status: str = Field(..., description="ACTIVE, IDLE, or AVAILABLE")
    fuel_consumption: Optional[float] = 0.0
    speed: Optional[float] = 0.0
    engine_temperature: Optional[float] = 85.0
    site_id: Optional[str] = None
    operator_id: Optional[str] = None

class TelemetryResponse(TelemetryCreate):
    telemetry_id: int
    timestamp: datetime
    utilization_percentage: float = 0.0

    class Config:
        from_attributes = True
