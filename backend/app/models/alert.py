from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class Alert(Base):
    __tablename__ = "alerts"

    alert_id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    equipment_id = Column(String(50), ForeignKey("equipment.equipment_id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Types: OVERDUE, RETURN_DUE_SOON, EXCESSIVE_IDLE, LOW_UTILIZATION, UNASSIGNED_EQUIPMENT, ANOMALY, STALE_TELEMETRY
    alert_type = Column(String(50), nullable=False, index=True)
    
    # Severity: LOW, MEDIUM, HIGH, CRITICAL
    severity = Column(String(20), nullable=False, default="MEDIUM")
    
    message = Column(String(500), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    acknowledged = Column(Boolean, default=False)
    resolved = Column(Boolean, default=False)
    resolved_at = Column(DateTime, nullable=True)

    # Relationships
    equipment = relationship("Equipment", back_populates="alerts")
