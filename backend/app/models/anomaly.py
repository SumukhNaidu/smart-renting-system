from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class Anomaly(Base):
    __tablename__ = "anomalies"

    anomaly_id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    equipment_id = Column(String(50), ForeignKey("equipment.equipment_id", ondelete="CASCADE"), nullable=False, index=True)
    telemetry_id = Column(Integer, nullable=True)
    
    # Anomaly Types: HYBRID_ISOLATION_FOREST, EXCESSIVE_IDLE, UNASSIGNED, LOW_UTILIZATION, STALE_TELEMETRY
    anomaly_type = Column(String(50), nullable=False)
    anomaly_score = Column(Float, nullable=False, default=0.0) # Lower/Negative score = higher anomaly in Isolation Forest
    description = Column(String(500), nullable=False)
    recommendation = Column(String(500), nullable=True)
    
    detected_at = Column(DateTime, default=datetime.utcnow, index=True)
    acknowledged = Column(Boolean, default=False)
    resolved = Column(Boolean, default=False)

    # Relationships
    equipment = relationship("Equipment", back_populates="anomalies")
