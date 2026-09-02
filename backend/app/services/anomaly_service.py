import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any
from sqlalchemy.orm import Session

from app.models.equipment import Equipment
from app.models.anomaly import Anomaly
from app.models.alert import Alert
from app.config import settings
from app.services.equipment_service import calculate_utilization, derive_equipment_status
from app.websocket_manager import ws_manager

logger = logging.getLogger("anomaly_service")

class AnomalyService:

    @staticmethod
    def generate_ai_recommendation(anomaly_type: str, equipment: Equipment, details: Dict[str, Any]) -> str:
        """Generates actionable recommendations for each operational anomaly category."""
        if anomaly_type == "EXCESSIVE_IDLE":
            idle_h = details.get("idle_hours", equipment.idle_hours_per_day)
            return (
                f"Asset {equipment.equipment_id} recorded {idle_h:.1f} hrs of non-productive idle burn today. "
                f"Recommendation: Dispatch job-site notification to shut off ignition during standbys or reallocate asset."
            )
        elif anomaly_type == "UNASSIGNED_OPERATION":
            return (
                f"Asset {equipment.equipment_id} is running without registered Operator or Site ID. "
                f"Recommendation: Immediately flag security protocol or verify job assignment log in fleet portal."
            )
        elif anomaly_type == "OVERHEAT_WARNING":
            temp = details.get("temp", 95.0)
            return (
                f"Engine thermal threshold warning ({temp}°C). "
                f"Recommendation: Pause operation for cooling inspection and check coolant levels to avoid cylinder head warping."
            )
        elif anomaly_type == "GEOFENCE_BREACH":
            return (
                f"Asset position shifted beyond boundary zone of assigned site ({equipment.site_id or 'Unassigned'}). "
                f"Recommendation: Contact site supervisor to verify authorized transport or initiate anti-theft protocol."
            )
        elif anomaly_type == "OVERDUE_RETURN":
            days = details.get("days_overdue", 1)
            return (
                f"Asset return date passed by {days} day(s). "
                f"Recommendation: Apply standard overdue daily surcharge ($180/day) and issue rental extension notice."
            )
        else:
            return f"Inspect asset {equipment.equipment_id} telemetry parameters for potential hardware or operating irregularities."

    @classmethod
    def run_fleet_anomaly_detection(cls, db: Session) -> List[Anomaly]:
        """Execute only the required operational anomaly checks for the fleet dashboard."""
        equipment_list = db.query(Equipment).all()
        now = datetime.utcnow()
        new_anomalies: List[Anomaly] = []

        for eq in equipment_list:
            util_pct = calculate_utilization(eq.total_engine_hours, eq.total_idle_hours)
            if util_pct == 0.0 and (eq.engine_hours_per_day > 0 or eq.idle_hours_per_day > 0):
                util_pct = calculate_utilization(eq.engine_hours_per_day, eq.idle_hours_per_day)

            # --- Rule 1: Excessive Idle ---
            if eq.idle_hours_per_day >= settings.EXCESSIVE_IDLE_HOURS_PER_DAY or (eq.total_idle_hours > 20.0 and util_pct < 20.0):
                existing = db.query(Anomaly).filter(
                    Anomaly.equipment_id == eq.equipment_id,
                    Anomaly.anomaly_type == "EXCESSIVE_IDLE",
                    Anomaly.resolved == False
                ).first()

                if not existing:
                    desc = f"Excessive idle time detected: {eq.idle_hours_per_day:.1f} hrs/day (Utilization: {util_pct:.1f}%)."
                    rec = cls.generate_ai_recommendation("EXCESSIVE_IDLE", eq, {"idle_hours": eq.idle_hours_per_day})
                    anomaly = Anomaly(
                        equipment_id=eq.equipment_id,
                        anomaly_type="EXCESSIVE_IDLE",
                        anomaly_score=-0.65,
                        description=desc,
                        recommendation=rec,
                        detected_at=now
                    )
                    db.add(anomaly)
                    new_anomalies.append(anomaly)

                    alert = Alert(
                        equipment_id=eq.equipment_id,
                        alert_type="IDLE_BURNOUT",
                        severity="WARNING",
                        message=desc
                    )
                    db.add(alert)

            # --- Rule 2: Unassigned Machine Operation ---
            if eq.status == "ACTIVE" and (eq.site_id is None or eq.operator_id is None):
                existing = db.query(Anomaly).filter(
                    Anomaly.equipment_id == eq.equipment_id,
                    Anomaly.anomaly_type == "UNASSIGNED",
                    Anomaly.resolved == False
                ).first()

                if not existing:
                    desc = "Asset is actively operating without assigned site or operator."
                    rec = cls.generate_ai_recommendation("UNASSIGNED_OPERATION", eq, {})
                    anomaly = Anomaly(
                        equipment_id=eq.equipment_id,
                        anomaly_type="UNASSIGNED",
                        anomaly_score=-0.75,
                        description=desc,
                        recommendation=rec,
                        detected_at=now
                    )
                    db.add(anomaly)
                    new_anomalies.append(anomaly)

                    alert = Alert(
                        equipment_id=eq.equipment_id,
                        alert_type="UNASSIGNED_ACTIVE",
                        severity="HIGH",
                        message=desc
                    )
                    db.add(alert)

            # --- Rule 3: Overdue Asset Return ---
            if eq.expected_checkin_date and eq.actual_checkin_date is None and now > eq.expected_checkin_date:
                days_overdue = max(1, (now - eq.expected_checkin_date).days)
                existing = db.query(Anomaly).filter(
                    Anomaly.equipment_id == eq.equipment_id,
                    Anomaly.anomaly_type == "OVERDUE_RETURN",
                    Anomaly.resolved == False
                ).first()

                if not existing:
                    desc = f"Asset return deadline passed {days_overdue} day(s) ago."
                    rec = cls.generate_ai_recommendation("OVERDUE_RETURN", eq, {"days_overdue": days_overdue})
                    anomaly = Anomaly(
                        equipment_id=eq.equipment_id,
                        anomaly_type="OVERDUE_RETURN",
                        anomaly_score=-0.80,
                        description=desc,
                        recommendation=rec,
                        detected_at=now
                    )
                    db.add(anomaly)
                    new_anomalies.append(anomaly)

        db.commit()

        # Update equipment statuses to ANOMALY if active anomalies exist
        for eq in equipment_list:
            unresolved = db.query(Anomaly).filter(
                Anomaly.equipment_id == eq.equipment_id,
                Anomaly.resolved == False
            ).count()
            if unresolved > 0 and eq.status not in ["OVERDUE", "UNASSIGNED"]:
                eq.status = "ANOMALY"

        db.commit()

        return new_anomalies
