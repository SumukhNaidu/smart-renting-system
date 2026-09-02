from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class Telemetry(Base):
    __tablename__ = "telemetry"

    telemetry_id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    equipment_id = Column(String(50), ForeignKey("equipment.equipment_id", ondelete="CASCADE"), nullable=False, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    engine_hours = Column(Float, nullable=False)
    idle_hours = Column(Float, nullable=False)
    fuel_level = Column(Float, nullable=False)  # Percentage 0-100
    fuel_consumption = Column(Float, default=0.0) # L/hr
    operating_status = Column(String(30), nullable=False) # ACTIVE, IDLE, AVAILABLE

    # Optional metadata fields
    speed = Column(Float, default=0.0)
    engine_temperature = Column(Float, default=85.0)
    site_id = Column(String(50), nullable=True)
    operator_id = Column(String(50), nullable=True)

    # Relationships
    equipment = relationship("Equipment", back_populates="telemetry_records")
