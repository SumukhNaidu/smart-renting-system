from sqlalchemy import Column, String, Float, Integer, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class Equipment(Base):
    __tablename__ = "equipment"

    equipment_id = Column(String(50), primary_key=True, index=True)
    qr_code = Column(String(100), nullable=True, index=True, unique=True)
    equipment_type = Column(String(50), nullable=False, index=True)  # Excavator, Crane, Bulldozer, Grader
    site_id = Column(String(50), nullable=True, index=True)          # e.g., S003 or NULL
    operator_id = Column(String(50), nullable=True, index=True)      # e.g., OP101 or NULL
    status = Column(String(30), nullable=False, default="AVAILABLE", index=True)
    # Statuses: AVAILABLE, ACTIVE, IDLE, OVERDUE, UNASSIGNED, ANOMALY

    checkout_date = Column(DateTime, nullable=True)
    expected_checkin_date = Column(DateTime, nullable=True)
    actual_checkin_date = Column(DateTime, nullable=True)

    engine_hours_per_day = Column(Float, default=0.0)
    idle_hours_per_day = Column(Float, default=0.0)
    total_engine_hours = Column(Float, default=0.0)
    total_idle_hours = Column(Float, default=0.0)
    operating_days = Column(Integer, default=0)
    fuel_level = Column(Float, default=100.0)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)

    last_telemetry_updated = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    telemetry_records = relationship("Telemetry", back_populates="equipment", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="equipment", cascade="all, delete-orphan")
    anomalies = relationship("Anomaly", back_populates="equipment", cascade="all, delete-orphan")
