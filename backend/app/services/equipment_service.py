from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.equipment import Equipment
from app.models.alert import Alert
from app.models.anomaly import Anomaly
from app.schemas.equipment import EquipmentResponse, DashboardSummaryResponse, EquipmentUtilizationDistribution
from app.config import settings

def calculate_utilization(engine_hours: float, idle_hours: float) -> float:
    """
    Utilization % = Engine Hours / (Engine Hours + Idle Hours) * 100
    Safely handles division by zero.
    """
    total = engine_hours + idle_hours
    if total <= 0:
        return 0.0
    return round((engine_hours / total) * 100.0, 1)

def get_utilization_category(util_pct: float) -> str:
    if util_pct >= settings.UTILIZATION_HIGH_THRESHOLD:
        return "HIGH"
    elif util_pct >= settings.UTILIZATION_NORMAL_THRESHOLD:
        return "NORMAL"
    else:
        return "LOW"

def derive_equipment_status(eq: Equipment, is_overdue: bool, active_anomaly: bool) -> str:
    """
    Derives equipment operational status dynamically based on business rules:
    1. ANOMALY (if active unresolved anomaly detected)
    2. OVERDUE (if return date passed)
    3. UNASSIGNED (if rented/checked out but missing site_id or operator_id)
    4. ACTIVE / IDLE / AVAILABLE based on runtime and database state
    """
    if active_anomaly:
        return "ANOMALY"
    if is_overdue:
        return "OVERDUE"
    if (eq.checkout_date is not None and eq.actual_checkin_date is None) and (eq.site_id is None or eq.operator_id is None):
        return "UNASSIGNED"
    
    # Otherwise check stored status or fallback to ACTIVE/IDLE/AVAILABLE
    if eq.status in ["ACTIVE", "IDLE", "AVAILABLE"]:
        return eq.status
    
    if eq.engine_hours_per_day > 0:
        return "ACTIVE"
    elif eq.idle_hours_per_day > 0:
        return "IDLE"
    else:
        return "AVAILABLE"

def enrich_equipment_response(eq: Equipment, db: Session) -> EquipmentResponse:
    now = datetime.now()
    
    # Calculate overdue status
    is_overdue = False
    days_overdue = None
    if eq.expected_checkin_date and eq.actual_checkin_date is None and now > eq.expected_checkin_date:
        is_overdue = True
        days_overdue = (now - eq.expected_checkin_date).days
        if days_overdue == 0:
            days_overdue = 1  # at least 1 day overdue

    # Check active anomalies
    active_anomaly_count = db.query(Anomaly).filter(
        Anomaly.equipment_id == eq.equipment_id,
        Anomaly.resolved == False
    ).count()
    has_anomaly = active_anomaly_count > 0

    # Calculate active alerts
    active_alert_count = db.query(Alert).filter(
        Alert.equipment_id == eq.equipment_id,
        Alert.resolved == False
    ).count()

    util_pct = calculate_utilization(eq.total_engine_hours, eq.total_idle_hours)
    # If cumulative totals are zero, fallback to daily averages
    if util_pct == 0.0 and (eq.engine_hours_per_day > 0 or eq.idle_hours_per_day > 0):
        util_pct = calculate_utilization(eq.engine_hours_per_day, eq.idle_hours_per_day)

    util_cat = get_utilization_category(util_pct)
    derived_status = derive_equipment_status(eq, is_overdue, has_anomaly)

    return EquipmentResponse(
        equipment_id=eq.equipment_id,
        qr_code=eq.qr_code,
        equipment_type=eq.equipment_type,
        site_id=eq.site_id,
        operator_id=eq.operator_id,
        status=derived_status,
        checkout_date=eq.checkout_date,
        expected_checkin_date=eq.expected_checkin_date,
        actual_checkin_date=eq.actual_checkin_date,
        engine_hours_per_day=eq.engine_hours_per_day,
        idle_hours_per_day=eq.idle_hours_per_day,
        total_engine_hours=eq.total_engine_hours,
        total_idle_hours=eq.total_idle_hours,
        operating_days=eq.operating_days,
        fuel_level=eq.fuel_level,
        latitude=eq.latitude,
        longitude=eq.longitude,
        utilization_percentage=util_pct,
        utilization_category=util_cat,
        is_overdue=is_overdue,
        days_overdue=days_overdue,
        active_alert_count=active_alert_count,
        has_anomaly=has_anomaly,
        last_telemetry_updated=eq.last_telemetry_updated,
        created_at=eq.created_at,
        updated_at=eq.updated_at
    )

def get_all_equipment(db: Session, status: Optional[str] = None, equipment_type: Optional[str] = None, site_id: Optional[str] = None) -> List[EquipmentResponse]:
    query = db.query(Equipment)
    if equipment_type:
        query = query.filter(Equipment.equipment_type == equipment_type)
    if site_id:
        query = query.filter(Equipment.site_id == site_id)
        
    all_eq = query.all()
    enriched = [enrich_equipment_response(eq, db) for eq in all_eq]
    
    if status:
        enriched = [e for e in enriched if e.status.upper() == status.upper()]
        
    return enriched

def get_equipment_by_id(db: Session, equipment_id: str) -> Optional[EquipmentResponse]:
    eq = db.query(Equipment).filter(Equipment.equipment_id == equipment_id).first()
    if not eq:
        return None
    return enrich_equipment_response(eq, db)

def get_dashboard_summary(db: Session) -> DashboardSummaryResponse:
    all_eq = db.query(Equipment).all()
    enriched_list = [enrich_equipment_response(eq, db) for eq in all_eq]
    
    total = len(enriched_list)
    active = sum(1 for e in enriched_list if e.status == "ACTIVE")
    idle = sum(1 for e in enriched_list if e.status == "IDLE")
    available = sum(1 for e in enriched_list if e.status == "AVAILABLE")
    overdue = sum(1 for e in enriched_list if e.is_overdue or e.status == "OVERDUE")
    unassigned = sum(1 for e in enriched_list if e.status == "UNASSIGNED" or (e.checkout_date and not e.site_id))
    anomaly = sum(1 for e in enriched_list if e.has_anomaly or e.status == "ANOMALY")
    
    avg_utilization = round(sum(e.utilization_percentage for e in enriched_list) / total, 1) if total > 0 else 0.0

    return DashboardSummaryResponse(
        total_equipment=total,
        active_equipment=active,
        idle_equipment=idle,
        available_equipment=available,
        overdue_equipment=overdue,
        unassigned_equipment=unassigned,
        anomaly_equipment=anomaly,
        average_utilization=avg_utilization
    )

def get_utilization_distribution(db: Session) -> EquipmentUtilizationDistribution:
    all_eq = db.query(Equipment).all()
    enriched_list = [enrich_equipment_response(eq, db) for eq in all_eq]
    
    high = sum(1 for e in enriched_list if e.utilization_category == "HIGH")
    normal = sum(1 for e in enriched_list if e.utilization_category == "NORMAL")
    low = sum(1 for e in enriched_list if e.utilization_category == "LOW")
    
    return EquipmentUtilizationDistribution(
        high_utilization_count=high,
        normal_utilization_count=normal,
        low_utilization_count=low
    )
