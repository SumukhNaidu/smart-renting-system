from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class AlertBase(BaseModel):
    equipment_id: str
    alert_type: str
    severity: str
    message: str

class AlertCreate(AlertBase):
    pass

class AlertResponse(AlertBase):
    alert_id: int
    created_at: datetime
    acknowledged: bool
    resolved: bool
    resolved_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class AlertAcknowledgeRequest(BaseModel):
    acknowledged: bool = True

class AlertResolveRequest(BaseModel):
    resolved: bool = True
