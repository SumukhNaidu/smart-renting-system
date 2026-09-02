from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class AnomalyResponse(BaseModel):
    anomaly_id: int
    equipment_id: str
    telemetry_id: Optional[int] = None
    anomaly_type: str
    anomaly_score: float
    description: str
    recommendation: Optional[str] = None
    detected_at: datetime
    acknowledged: bool
    resolved: bool

    class Config:
        from_attributes = True

class ModelTrainResponse(BaseModel):
    status: str
    samples_trained: int
    anomalies_detected: int
    message: str
