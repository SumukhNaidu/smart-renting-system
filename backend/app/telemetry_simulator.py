import asyncio
import random
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.equipment import Equipment
from app.models.telemetry import Telemetry
from app.websocket_manager import ws_manager

logger = logging.getLogger("telemetry_simulator")

class TelemetrySimulator:
    def __init__(self):
        self.is_running = False
        self._task: Optional[asyncio.Task] = None
        self.interval_seconds = 3.0

    def start(self):
        if not self.is_running:
            self.is_running = True
            try:
                loop = asyncio.get_running_loop()
                self._task = loop.create_task(self._simulation_loop())
            except RuntimeError:
                pass
            logger.info("Telemetry Simulator started.")

    def stop(self):
        if self.is_running:
            self.is_running = False
            if self._task:
                self._task.cancel()
                self._task = None
            logger.info("Telemetry Simulator stopped.")

    async def _simulation_loop(self):
        while self.is_running:
            try:
                await asyncio.sleep(self.interval_seconds)
                self.step_simulation()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in telemetry simulation step: {e}")

    def step_simulation(self) -> Dict[str, Any]:
        """
        Executes a single realistic simulation step for all active/idle fleet.
        Applies realistic correlated physical behaviors.
        """
        db: Session = SessionLocal()
        updated_records = []
        try:
            equipment_list = db.query(Equipment).all()
            now = datetime.now()

            for eq in equipment_list:
                if eq.status in ["ACTIVE", "IDLE", "ANOMALY", "OVERDUE", "UNASSIGNED"]:
                    if eq.status == "ACTIVE":
                        engine_inc = random.uniform(0.2, 0.5)
                        idle_inc = random.uniform(0.01, 0.05)
                        fuel_dec = random.uniform(0.5, 1.2)
                        lat_move = random.uniform(-0.001, 0.001)
                        lon_move = random.uniform(-0.001, 0.001)
                        speed = round(random.uniform(12.0, 32.0), 1)
                        engine_temp = round(random.uniform(86.0, 95.0), 1)
                        fuel_consumption = round(random.uniform(12.0, 20.0), 1)

                    elif eq.status in ["IDLE", "ANOMALY", "UNASSIGNED"]:
                        engine_inc = 0.0
                        idle_inc = random.uniform(0.3, 0.8) # Idle hours accumulate
                        fuel_dec = random.uniform(0.1, 0.2)
                        lat_move = 0.0
                        lon_move = 0.0
                        speed = 0.0
                        engine_temp = round(random.uniform(55.0, 65.0), 1)
                        fuel_consumption = round(random.uniform(2.0, 4.0), 1)

                    else:
                        engine_inc = random.uniform(0.1, 0.2)
                        idle_inc = random.uniform(0.1, 0.2)
                        fuel_dec = 0.2
                        lat_move = 0.0
                        lon_move = 0.0
                        speed = 0.0
                        engine_temp = 50.0
                        fuel_consumption = 2.0

                    eq.total_engine_hours = round(eq.total_engine_hours + engine_inc, 1)
                    eq.total_idle_hours = round(eq.total_idle_hours + idle_inc, 1)
                    eq.engine_hours_per_day = round(eq.total_engine_hours / max(1, eq.operating_days), 1)
                    eq.idle_hours_per_day = round(eq.total_idle_hours / max(1, eq.operating_days), 1)
                    eq.fuel_level = max(5.0, round(eq.fuel_level - fuel_dec, 1))

                    if eq.latitude is not None and eq.longitude is not None:
                        eq.latitude = round(eq.latitude + lat_move, 6)
                        eq.longitude = round(eq.longitude + lon_move, 6)

                    eq.last_telemetry_updated = now

                    telemetry = Telemetry(
                        equipment_id=eq.equipment_id,
                        timestamp=now,
                        latitude=eq.latitude or 40.6936,
                        longitude=eq.longitude or -89.5890,
                        engine_hours=eq.total_engine_hours,
                        idle_hours=eq.total_idle_hours,
                        fuel_level=eq.fuel_level,
                        fuel_consumption=fuel_consumption,
                        operating_status=eq.status,
                        speed=speed,
                        engine_temperature=engine_temp,
                        site_id=eq.site_id,
                        operator_id=eq.operator_id
                    )
                    db.add(telemetry)
                    updated_records.append({
                        "equipment_id": eq.equipment_id,
                        "status": eq.status,
                        "engine_hours": eq.total_engine_hours,
                        "idle_hours": eq.total_idle_hours,
                        "fuel_level": eq.fuel_level
                    })

            db.commit()

            return {
                "status": "success",
                "timestamp": now.isoformat(),
                "updated_count": len(updated_records),
                "equipment_updates": updated_records
            }

        except Exception as e:
            db.rollback()
            logger.error(f"Failed simulation step: {e}")
            return {"status": "error", "message": str(e)}
        finally:
            db.close()

    def trigger_excessive_idle_scenario(self, equipment_id: str = "EQX1001") -> Dict[str, Any]:
        """
        Demo Scenario: Simulates equipment becoming highly idle.
        Surges idle hours relative to engine hours.
        """
        db: Session = SessionLocal()
        try:
            eq = db.query(Equipment).filter(Equipment.equipment_id == equipment_id).first()
            if not eq:
                return {"status": "error", "message": f"Equipment {equipment_id} not found"}

            now = datetime.now()
            # Surge idle hours by +12.0 hours
            eq.total_idle_hours = round(eq.total_idle_hours + 12.0, 1)
            eq.idle_hours_per_day = 12.0
            eq.engine_hours_per_day = round(eq.total_engine_hours / max(1, eq.operating_days), 1)
            eq.status = "IDLE"
            eq.last_telemetry_updated = now

            telemetry = Telemetry(
                equipment_id=eq.equipment_id,
                timestamp=now,
                latitude=eq.latitude or 40.6936,
                longitude=eq.longitude or -89.5890,
                engine_hours=eq.total_engine_hours,
                idle_hours=eq.total_idle_hours,
                fuel_level=eq.fuel_level,
                fuel_consumption=1.5,
                operating_status="IDLE",
                speed=0.0,
                engine_temperature=52.0,
                site_id=eq.site_id,
                operator_id=eq.operator_id
            )
            db.add(telemetry)
            db.commit()

            return {
                "status": "success",
                "equipment_id": equipment_id,
                "message": f"Excessive idle surge (+12h idle) applied to {equipment_id}",
                "engine_hours": eq.total_engine_hours,
                "idle_hours": eq.total_idle_hours
            }
        except Exception as e:
            db.rollback()
            return {"status": "error", "message": str(e)}
        finally:
            db.close()

    def trigger_overdue_scenario(self, equipment_id: str = "EQX1001") -> Dict[str, Any]:
        """
        Demo Scenario: Simulates equipment passing its return date.
        """
        db: Session = SessionLocal()
        try:
            eq = db.query(Equipment).filter(Equipment.equipment_id == equipment_id).first()
            if not eq:
                return {"status": "error", "message": f"Equipment {equipment_id} not found"}

            now = datetime.now()
            eq.checkout_date = now - timedelta(days=10)
            eq.expected_checkin_date = now - timedelta(days=3)
            eq.status = "OVERDUE"

            db.commit()

            return {
                "status": "success",
                "equipment_id": equipment_id,
                "message": f"Return date lapsed. {equipment_id} marked OVERDUE by 3 days.",
                "expected_checkin_date": eq.expected_checkin_date.isoformat()
            }
        except Exception as e:
            db.rollback()
            return {"status": "error", "message": str(e)}
        finally:
            db.close()

telemetry_simulator = TelemetrySimulator()
