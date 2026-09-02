import csv
import os
import random
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.database import engine, Base, SessionLocal
from app.models.equipment import Equipment
from app.models.telemetry import Telemetry
from app.models.alert import Alert
from app.models.anomaly import Anomaly


def import_synthetic_csv_dataset(csv_path: str, limit: int | None = None) -> int:
    """Import the synthetic equipment dataset into the local SQLite tables.

    This keeps the project working with the provided CSV while preserving unique equipment IDs
    and updating existing records instead of dropping legitimate data.
    """
    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"CSV dataset not found: {csv_path}")

    imported_count = 0
    seen_ids = set()
    with open(csv_path, newline="", encoding="utf-8") as csv_file:
        reader = csv.DictReader(csv_file)
        for idx, row in enumerate(reader):
            equipment_id = str(row.get("Equipment ID", "")).strip()
            if not equipment_id:
                continue
            if equipment_id in seen_ids:
                continue
            seen_ids.add(equipment_id)
            if limit is not None and imported_count >= limit:
                break

            equipment_type = str(row.get("Type", "Excavator")).strip() or "Excavator"
            site_id = str(row.get("Site ID", "")).strip() or None
            operator_id = str(row.get("Last Operator ID", "")).strip() or None
            status = "ACTIVE"

            try:
                checkout_date = datetime.strptime(row.get("Check-Out Date", ""), "%Y-%m-%d")
                expected_checkin_date = datetime.strptime(row.get("Check-In Date", ""), "%Y-%m-%d")
            except ValueError:
                checkout_date = datetime.utcnow()
                expected_checkin_date = datetime.utcnow() + timedelta(days=7)

            try:
                engine_hours_per_day = float(row.get("Engine Hours/Day", "0") or 0)
                idle_hours_per_day = float(row.get("Idle Hours/Day", "0") or 0)
                operating_days = int(row.get("Operating Days", "0") or 0)
            except (TypeError, ValueError):
                engine_hours_per_day = 0.0
                idle_hours_per_day = 0.0
                operating_days = 0

            total_engine_hours = max(0.0, round(engine_hours_per_day * max(1, operating_days), 2))
            total_idle_hours = max(0.0, round(idle_hours_per_day * max(1, operating_days), 2))
            fuel_level = 80.0
            lat = 40.6936 + (idx % 8) * 0.08
            lon = -89.5890 + (idx % 6) * 0.09

            db = SessionLocal()
            try:
                existing = db.query(Equipment).filter(Equipment.equipment_id == equipment_id).first()
                if existing:
                    existing.equipment_type = equipment_type
                    existing.site_id = site_id
                    existing.operator_id = operator_id
                    existing.status = status
                    existing.checkout_date = checkout_date
                    existing.expected_checkin_date = expected_checkin_date
                    existing.actual_checkin_date = None
                    existing.engine_hours_per_day = engine_hours_per_day
                    existing.idle_hours_per_day = idle_hours_per_day
                    existing.total_engine_hours = total_engine_hours
                    existing.total_idle_hours = total_idle_hours
                    existing.operating_days = operating_days
                    existing.fuel_level = fuel_level
                    existing.latitude = lat
                    existing.longitude = lon
                    existing.updated_at = datetime.utcnow()
                    db.commit()
                    imported_count += 1
                    continue

                equipment = Equipment(
                    equipment_id=equipment_id,
                    qr_code=f"CAT-{equipment_id}",
                    equipment_type=equipment_type,
                    site_id=site_id,
                    operator_id=operator_id,
                    status=status,
                    checkout_date=checkout_date,
                    expected_checkin_date=expected_checkin_date,
                    actual_checkin_date=None,
                    engine_hours_per_day=engine_hours_per_day,
                    idle_hours_per_day=idle_hours_per_day,
                    total_engine_hours=total_engine_hours,
                    total_idle_hours=total_idle_hours,
                    operating_days=operating_days,
                    fuel_level=fuel_level,
                    latitude=lat,
                    longitude=lon,
                    last_telemetry_updated=datetime.utcnow(),
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow(),
                )
                db.add(equipment)
                db.commit()
                imported_count += 1
            finally:
                db.close()

    return imported_count


def seed_database(force_reset: bool = False):
    """Seed demo data only when the database is empty unless force_reset is requested."""
    db: Session = SessionLocal()
    now = datetime.now()

    try:
        existing_equipment = db.query(Equipment).first()
        if existing_equipment and not force_reset:
            print("Database already contains equipment data. Skipping reseed to preserve existing dataset.")
            return

        if force_reset:
            print("Force reseed requested. Dropping and recreating database tables...")
            Base.metadata.drop_all(bind=engine)
        else:
            print("No equipment data found. Creating tables and seeding demo fleet data...")

        Base.metadata.create_all(bind=engine)
        if force_reset:
            db = SessionLocal()


        # Base locations around mining & construction sites (e.g. Peoria / Midwest US / Texas sites)
        sites_coords = {
            "S001": (40.6936, -89.5890), # Peoria HQ Site
            "S002": (32.7767, -96.7970), # Dallas Construction Hub
            "S003": (39.7392, -104.9903),# Denver Quarry Site
            "S004": (33.4484, -112.0740),# Phoenix Mining Site
            "S006": (29.7604, -95.3698), # Houston Infrastructure Site
            "DEFAULT": (40.6936, -89.5890)
        }

        seed_equipment = [
            {
                "equipment_id": "EQX1001",
                "qr_code": "CAT-EQX1001",
                "equipment_type": "Excavator",
                "site_id": "S003",
                "operator_id": "OP101",
                "status": "ACTIVE",
                "checkout_date": now - timedelta(days=15),
                "expected_checkin_date": now + timedelta(days=10), # Future return -> Active
                "engine_hours_per_day": 1.5,
                "idle_hours_per_day": 10.0,
                "operating_days": 15,
                "total_engine_hours": 22.5,
                "total_idle_hours": 150.0,
                "fuel_level": 68.0,
                "latitude": sites_coords["S003"][0],
                "longitude": sites_coords["S003"][1],
            },
            {
                "equipment_id": "EQX1002",
                "qr_code": "CAT-EQX1002",
                "equipment_type": "Crane",
                "site_id": None,
                "operator_id": None,
                "status": "UNASSIGNED",
                "checkout_date": now - timedelta(days=20),
                "expected_checkin_date": now + timedelta(days=5),
                "engine_hours_per_day": 0.0,
                "idle_hours_per_day": 11.0,
                "operating_days": 20,
                "total_engine_hours": 0.0,
                "total_idle_hours": 220.0,
                "fuel_level": 82.0,
                "latitude": sites_coords["DEFAULT"][0] + 0.05,
                "longitude": sites_coords["DEFAULT"][1] + 0.05,
            },
            {
                "equipment_id": "EQX1003",
                "qr_code": "CAT-EQX1003",
                "equipment_type": "Bulldozer",
                "site_id": "S002",
                "operator_id": "OP203",
                "status": "ACTIVE",
                "checkout_date": now - timedelta(days=25),
                "expected_checkin_date": now + timedelta(days=12),
                "engine_hours_per_day": 7.5,
                "idle_hours_per_day": 0.5,
                "operating_days": 25,
                "total_engine_hours": 187.5,
                "total_idle_hours": 12.5,
                "fuel_level": 45.0,
                "latitude": sites_coords["S002"][0],
                "longitude": sites_coords["S002"][1],
            },
            {
                "equipment_id": "EQX1004",
                "qr_code": "CAT-EQX1004",
                "equipment_type": "Excavator",
                "site_id": "S004",
                "operator_id": "OP106",
                "status": "OVERDUE",
                "checkout_date": now - timedelta(days=12),
                "expected_checkin_date": now - timedelta(days=2), # 2 days overdue!
                "engine_hours_per_day": 2.0,
                "idle_hours_per_day": 9.0,
                "operating_days": 10,
                "total_engine_hours": 20.0,
                "total_idle_hours": 90.0,
                "fuel_level": 30.0,
                "latitude": sites_coords["S004"][0],
                "longitude": sites_coords["S004"][1],
            },
            {
                "equipment_id": "EQX1005",
                "qr_code": "CAT-EQX1005",
                "equipment_type": "Bulldozer",
                "site_id": "S006",
                "operator_id": "OP301",
                "status": "ACTIVE",
                "checkout_date": now - timedelta(days=30),
                "expected_checkin_date": now + timedelta(days=14),
                "engine_hours_per_day": 8.0,
                "idle_hours_per_day": 0.0,
                "operating_days": 30,
                "total_engine_hours": 240.0,
                "total_idle_hours": 0.0,
                "fuel_level": 90.0,
                "latitude": sites_coords["S006"][0],
                "longitude": sites_coords["S006"][1],
            },
            {
                "equipment_id": "EQX1006",
                "qr_code": "CAT-EQX1006",
                "equipment_type": "Grader",
                "site_id": "S001",
                "operator_id": "OP114",
                "status": "IDLE",
                "checkout_date": now - timedelta(days=18),
                "expected_checkin_date": now + timedelta(days=1), # Due within 24h!
                "engine_hours_per_day": 3.0,
                "idle_hours_per_day": 6.0,
                "operating_days": 18,
                "total_engine_hours": 54.0,
                "total_idle_hours": 108.0,
                "fuel_level": 55.0,
                "latitude": sites_coords["S001"][0],
                "longitude": sites_coords["S001"][1],
            },
            {
                "equipment_id": "EQX1007",
                "qr_code": "CAT-EQX1007",
                "equipment_type": "Excavator",
                "site_id": None,
                "operator_id": None,
                "status": "ANOMALY",
                "checkout_date": now - timedelta(days=12),
                "expected_checkin_date": now - timedelta(days=1), # Overdue + Unassigned + Excessive Idle
                "engine_hours_per_day": 0.0,
                "idle_hours_per_day": 12.0,
                "operating_days": 12,
                "total_engine_hours": 0.0,
                "total_idle_hours": 144.0,
                "fuel_level": 15.0,
                "latitude": sites_coords["DEFAULT"][0] - 0.04,
                "longitude": sites_coords["DEFAULT"][1] - 0.04,
            }
        ]

        for item in seed_equipment:
            equipment_payload = dict(item)
            equipment_payload.pop("qr_code", None)
            equipment = Equipment(**equipment_payload)
            equipment.qr_code = item.get("qr_code")
            db.add(equipment)
        db.commit()

        # Generate 30 days of synthetic telemetry per equipment item
        telemetry_records = []
        for item in seed_equipment:
            eq_id = item["equipment_id"]
            base_lat = item["latitude"]
            base_lon = item["longitude"]
            
            cum_engine = 0.0
            cum_idle = 0.0
            curr_fuel = 100.0

            for day_offset in range(30, 0, -1):
                timestamp = now - timedelta(days=day_offset)
                
                if eq_id in ["EQX1003", "EQX1005"]:
                    daily_eng = random.uniform(6.5, 8.5)
                    daily_idle = random.uniform(0.2, 1.2)
                    fuel_used = (daily_eng * 12.0) + (daily_idle * 2.5)
                    op_status = "ACTIVE"
                elif eq_id in ["EQX1001", "EQX1004", "EQX1006"]:
                    daily_eng = random.uniform(1.5, 3.5)
                    daily_idle = random.uniform(6.0, 10.0)
                    fuel_used = (daily_eng * 10.0) + (daily_idle * 3.0)
                    op_status = "ACTIVE" if daily_eng > daily_idle else "IDLE"
                else:
                    if eq_id == "EQX1007" and day_offset < 5:
                        daily_eng = 0.5
                        daily_idle = 13.5
                    else:
                        daily_eng = 0.0
                        daily_idle = random.uniform(8.0, 12.0)
                    fuel_used = (daily_eng * 8.0) + (daily_idle * 2.0)
                    op_status = "IDLE"

                cum_engine += daily_eng
                cum_idle += daily_idle
                curr_fuel = max(10.0, curr_fuel - (fuel_used * 0.15))
                if curr_fuel < 20:
                    curr_fuel = random.uniform(85.0, 98.0)

                lat_jitter = random.uniform(-0.002, 0.002) if op_status == "ACTIVE" else 0.0
                lon_jitter = random.uniform(-0.002, 0.002) if op_status == "ACTIVE" else 0.0

                telemetry_records.append(Telemetry(
                    equipment_id=eq_id,
                    timestamp=timestamp,
                    latitude=base_lat + lat_jitter,
                    longitude=base_lon + lon_jitter,
                    engine_hours=round(cum_engine, 1),
                    idle_hours=round(cum_idle, 1),
                    fuel_level=round(curr_fuel, 1),
                    fuel_consumption=round(fuel_used / max(1, daily_eng + daily_idle), 1),
                    operating_status=op_status,
                    speed=random.uniform(5.0, 25.0) if op_status == "ACTIVE" else 0.0,
                    engine_temperature=random.uniform(82.0, 94.0) if op_status == "ACTIVE" else 45.0,
                    site_id=item["site_id"],
                    operator_id=item["operator_id"]
                ))

        db.bulk_save_objects(telemetry_records)
        db.commit()

        # Seed initial sample alerts
        initial_alerts = [
            Alert(
                equipment_id="EQX1004",
                alert_type="OVERDUE",
                severity="CRITICAL",
                message="Rental overdue by 2 days. Expected return was 2 days ago.",
                created_at=now - timedelta(days=2)
            ),
            Alert(
                equipment_id="EQX1006",
                alert_type="RETURN_DUE_SOON",
                severity="HIGH",
                message="Return due within 24 hours (Expected return tomorrow).",
                created_at=now - timedelta(hours=3)
            ),
            Alert(
                equipment_id="EQX1007",
                alert_type="EXCESSIVE_IDLE",
                severity="HIGH",
                message="Abnormally high idle-time pattern detected (12.0 hrs idle vs 0 engine hrs).",
                created_at=now - timedelta(hours=5)
            ),
            Alert(
                equipment_id="EQX1002",
                alert_type="UNASSIGNED_EQUIPMENT",
                severity="MEDIUM",
                message="Rented equipment EQX1002 is unassigned (Missing site_id & operator_id).",
                created_at=now - timedelta(hours=12)
            )
        ]
        db.add_all(initial_alerts)
        db.commit()

        # Seed initial sample anomaly
        initial_anomaly = Anomaly(
            equipment_id="EQX1007",
            telemetry_id=1,
            anomaly_type="EXCESSIVE_IDLE",
            anomaly_score=-0.42,
            description="Abnormally high idle ratio (12.0 hrs idle / 0 engine hrs). Utilization: 0.0%",
            recommendation="Review equipment allocation or investigate possible machine idling at site.",
            detected_at=now - timedelta(hours=5)
        )
        db.add(initial_anomaly)
        db.commit()
        print("Caterpillar fleet re-seeded with current relative dates successfully.")

    except Exception as e:
        db.rollback()
        print(f"Error re-seeding database: {e}")
        raise e
    finally:
        db.close()


LEGACY_TRAINING_IDS = [
    "EQX1039", "EQX1049", "EQX1055", "EQX1061", "EQX1068",
    "EQX1074", "EQX1081", "EQX1087", "EQX1094", "EQX1101",
    "EQX1109", "EQX1116", "EQX1123", "EQX1130", "EQX1137",
    "EQX1144"
]

ADDITIONAL_TRAINING_DATA = [
    {
        "equipment_id": "EQX1008",
        "equipment_type": "Excavator",
        "site_id": "S003",
        "operator_id": "OP111",
        "status": "ACTIVE",
        "checkout_date": datetime.utcnow() - timedelta(days=10),
        "expected_checkin_date": datetime.utcnow() + timedelta(days=6),
        "engine_hours_per_day": 6.8,
        "idle_hours_per_day": 0.9,
        "total_engine_hours": 68.0,
        "total_idle_hours": 9.0,
        "operating_days": 10,
        "fuel_level": 62.0,
        "latitude": 39.7392,
        "longitude": -104.9903,
    },
    {
        "equipment_id": "EQX1009",
        "equipment_type": "Excavator",
        "site_id": "S003",
        "operator_id": "OP201",
        "status": "ACTIVE",
        "checkout_date": datetime.utcnow() - timedelta(days=11),
        "expected_checkin_date": datetime.utcnow() + timedelta(days=8),
        "engine_hours_per_day": 7.2,
        "idle_hours_per_day": 1.1,
        "total_engine_hours": 79.2,
        "total_idle_hours": 12.1,
        "operating_days": 11,
        "fuel_level": 58.0,
        "latitude": 39.7387,
        "longitude": -104.9898,
    },
    {
        "equipment_id": "EQX1010",
        "equipment_type": "Grader",
        "site_id": "S005",
        "operator_id": "OP305",
        "status": "ACTIVE",
        "checkout_date": datetime.utcnow() - timedelta(days=9),
        "expected_checkin_date": datetime.utcnow() + timedelta(days=5),
        "engine_hours_per_day": 3.4,
        "idle_hours_per_day": 2.1,
        "total_engine_hours": 30.6,
        "total_idle_hours": 18.9,
        "operating_days": 9,
        "fuel_level": 72.0,
        "latitude": 33.4484,
        "longitude": -112.0740,
    },
    {
        "equipment_id": "EQX1011",
        "equipment_type": "Bulldozer",
        "site_id": "S006",
        "operator_id": "OP118",
        "status": "ACTIVE",
        "checkout_date": datetime.utcnow() - timedelta(days=13),
        "expected_checkin_date": datetime.utcnow() + timedelta(days=4),
        "engine_hours_per_day": 6.3,
        "idle_hours_per_day": 0.8,
        "total_engine_hours": 81.9,
        "total_idle_hours": 10.4,
        "operating_days": 13,
        "fuel_level": 66.0,
        "latitude": 29.7604,
        "longitude": -95.3698,
    },
    {
        "equipment_id": "EQX1012",
        "equipment_type": "Excavator",
        "site_id": "S001",
        "operator_id": "OP207",
        "status": "IDLE",
        "checkout_date": datetime.utcnow() - timedelta(days=15),
        "expected_checkin_date": datetime.utcnow() + timedelta(days=2),
        "engine_hours_per_day": 1.8,
        "idle_hours_per_day": 7.6,
        "total_engine_hours": 27.0,
        "total_idle_hours": 114.0,
        "operating_days": 15,
        "fuel_level": 49.0,
        "latitude": 40.6936,
        "longitude": -89.5890,
    },
    {
        "equipment_id": "EQX1013",
        "equipment_type": "Harvester",
        "site_id": "S002",
        "operator_id": "OP221",
        "status": "ACTIVE",
        "checkout_date": datetime.utcnow() - timedelta(days=8),
        "expected_checkin_date": datetime.utcnow() + timedelta(days=7),
        "engine_hours_per_day": 4.5,
        "idle_hours_per_day": 1.9,
        "total_engine_hours": 36.0,
        "total_idle_hours": 15.2,
        "operating_days": 8,
        "fuel_level": 81.0,
        "latitude": 32.7767,
        "longitude": -96.7970,
    },
    {
        "equipment_id": "EQX1014",
        "equipment_type": "Bulldozer",
        "site_id": "S004",
        "operator_id": "OP312",
        "status": "ACTIVE",
        "checkout_date": datetime.utcnow() - timedelta(days=18),
        "expected_checkin_date": datetime.utcnow() + timedelta(days=9),
        "engine_hours_per_day": 5.9,
        "idle_hours_per_day": 0.7,
        "total_engine_hours": 106.2,
        "total_idle_hours": 12.6,
        "operating_days": 18,
        "fuel_level": 76.0,
        "latitude": 33.4484,
        "longitude": -112.0740,
    },
    {
        "equipment_id": "EQX1015",
        "equipment_type": "Crane",
        "site_id": "S006",
        "operator_id": "OP405",
        "status": "ACTIVE",
        "checkout_date": datetime.utcnow() - timedelta(days=12),
        "expected_checkin_date": datetime.utcnow() + timedelta(days=5),
        "engine_hours_per_day": 2.7,
        "idle_hours_per_day": 3.4,
        "total_engine_hours": 32.4,
        "total_idle_hours": 40.8,
        "operating_days": 12,
        "fuel_level": 68.0,
        "latitude": 29.7604,
        "longitude": -95.3698,
    },
    {
        "equipment_id": "EQX1016",
        "equipment_type": "Excavator",
        "site_id": "S003",
        "operator_id": "OP119",
        "status": "OVERDUE",
        "checkout_date": datetime.utcnow() - timedelta(days=24),
        "expected_checkin_date": datetime.utcnow() - timedelta(days=3),
        "engine_hours_per_day": 2.6,
        "idle_hours_per_day": 9.2,
        "total_engine_hours": 62.4,
        "total_idle_hours": 220.8,
        "operating_days": 24,
        "fuel_level": 37.0,
        "latitude": 39.7392,
        "longitude": -104.9903,
    },
    {
        "equipment_id": "EQX1017",
        "equipment_type": "Bulldozer",
        "site_id": None,
        "operator_id": None,
        "status": "UNASSIGNED",
        "checkout_date": datetime.utcnow() - timedelta(days=16),
        "expected_checkin_date": datetime.utcnow() + timedelta(days=10),
        "engine_hours_per_day": 0.0,
        "idle_hours_per_day": 10.5,
        "total_engine_hours": 0.0,
        "total_idle_hours": 168.0,
        "operating_days": 16,
        "fuel_level": 59.0,
        "latitude": 40.6936,
        "longitude": -89.5890,
    },
    {
        "equipment_id": "EQX1018",
        "equipment_type": "Grader",
        "site_id": "S001",
        "operator_id": "OP502",
        "status": "ACTIVE",
        "checkout_date": datetime.utcnow() - timedelta(days=21),
        "expected_checkin_date": datetime.utcnow() + timedelta(days=12),
        "engine_hours_per_day": 4.1,
        "idle_hours_per_day": 1.3,
        "total_engine_hours": 86.1,
        "total_idle_hours": 27.3,
        "operating_days": 21,
        "fuel_level": 84.0,
        "latitude": 40.6936,
        "longitude": -89.5890,
    },
    {
        "equipment_id": "EQX1019",
        "equipment_type": "Excavator",
        "site_id": "S005",
        "operator_id": "OP214",
        "status": "ACTIVE",
        "checkout_date": datetime.utcnow() - timedelta(days=7),
        "expected_checkin_date": datetime.utcnow() + timedelta(days=11),
        "engine_hours_per_day": 5.8,
        "idle_hours_per_day": 1.7,
        "total_engine_hours": 40.6,
        "total_idle_hours": 11.9,
        "operating_days": 7,
        "fuel_level": 71.0,
        "latitude": 33.4484,
        "longitude": -112.0740,
    },
    {
        "equipment_id": "EQX1020",
        "equipment_type": "Bulldozer",
        "site_id": "S002",
        "operator_id": "OP228",
        "status": "ACTIVE",
        "checkout_date": datetime.utcnow() - timedelta(days=11),
        "expected_checkin_date": datetime.utcnow() + timedelta(days=6),
        "engine_hours_per_day": 6.1,
        "idle_hours_per_day": 0.9,
        "total_engine_hours": 67.1,
        "total_idle_hours": 9.9,
        "operating_days": 11,
        "fuel_level": 63.0,
        "latitude": 32.7767,
        "longitude": -96.7970,
    },
    {
        "equipment_id": "EQX1021",
        "equipment_type": "Crane",
        "site_id": "S004",
        "operator_id": "OP317",
        "status": "IDLE",
        "checkout_date": datetime.utcnow() - timedelta(days=19),
        "expected_checkin_date": datetime.utcnow() + timedelta(days=2),
        "engine_hours_per_day": 1.5,
        "idle_hours_per_day": 8.7,
        "total_engine_hours": 28.5,
        "total_idle_hours": 165.3,
        "operating_days": 19,
        "fuel_level": 51.0,
        "latitude": 33.4484,
        "longitude": -112.0740,
    },
    {
        "equipment_id": "EQX1022",
        "equipment_type": "Excavator",
        "site_id": "S003",
        "operator_id": "OP138",
        "status": "ACTIVE",
        "checkout_date": datetime.utcnow() - timedelta(days=14),
        "expected_checkin_date": datetime.utcnow() + timedelta(days=7),
        "engine_hours_per_day": 7.1,
        "idle_hours_per_day": 0.6,
        "total_engine_hours": 99.4,
        "total_idle_hours": 8.4,
        "operating_days": 14,
        "fuel_level": 77.0,
        "latitude": 39.7392,
        "longitude": -104.9903,
    },
    {
        "equipment_id": "EQX1023",
        "equipment_type": "Bulldozer",
        "site_id": "S006",
        "operator_id": "OP221",
        "status": "ACTIVE",
        "checkout_date": datetime.utcnow() - timedelta(days=10),
        "expected_checkin_date": datetime.utcnow() + timedelta(days=5),
        "engine_hours_per_day": 5.6,
        "idle_hours_per_day": 1.0,
        "total_engine_hours": 56.0,
        "total_idle_hours": 10.0,
        "operating_days": 10,
        "fuel_level": 80.0,
        "latitude": 29.7604,
        "longitude": -95.3698,
    },
]


def normalize_training_row(item):
    row = dict(item)
    row["equipment_id"] = str(row["equipment_id"]).strip()
    return row


def clean_stale_training_records(db):
    stale_ids = LEGACY_TRAINING_IDS + [item["equipment_id"] for item in ADDITIONAL_TRAINING_DATA if item["equipment_id"] not in {"EQX1008", "EQX1009", "EQX1010", "EQX1011", "EQX1012", "EQX1013", "EQX1014", "EQX1015", "EQX1016", "EQX1017", "EQX1018", "EQX1019", "EQX1020", "EQX1021", "EQX1022", "EQX1023"}]
    unique_stale_ids = sorted(set(stale_ids))
    if not unique_stale_ids:
        return
    db.query(Equipment).filter(Equipment.equipment_id.in_(unique_stale_ids)).delete(synchronize_session=False)


def seed_training_dataset(force_reset: bool = False):
    """Persist the additional training/evaluation fleet dataset into the existing SQLite schema."""
    db = SessionLocal()
    try:
        clean_stale_training_records(db)

        for item in ADDITIONAL_TRAINING_DATA:
            normalized = normalize_training_row(item)
            existing = db.query(Equipment).filter(Equipment.equipment_id == normalized["equipment_id"]).first()
            if existing and not force_reset:
                continue

            if force_reset and existing:
                for key, value in normalized.items():
                    if key == "equipment_id":
                        continue
                    setattr(existing, key, value)
                existing.qr_code = f"CAT-{normalized['equipment_id']}"
                continue

            equipment = Equipment(
                equipment_id=normalized["equipment_id"],
                qr_code=f"CAT-{normalized['equipment_id']}",
                equipment_type=normalized["equipment_type"],
                site_id=normalized["site_id"],
                operator_id=normalized["operator_id"],
                status=normalized["status"],
                checkout_date=normalized["checkout_date"],
                expected_checkin_date=normalized["expected_checkin_date"],
                actual_checkin_date=None,
                engine_hours_per_day=normalized["engine_hours_per_day"],
                idle_hours_per_day=normalized["idle_hours_per_day"],
                total_engine_hours=normalized["total_engine_hours"],
                total_idle_hours=normalized["total_idle_hours"],
                operating_days=normalized["operating_days"],
                fuel_level=normalized["fuel_level"],
                latitude=normalized["latitude"],
                longitude=normalized["longitude"],
                last_telemetry_updated=datetime.utcnow(),
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            db.add(equipment)

        db.commit()

        for item in ADDITIONAL_TRAINING_DATA:
            normalized = normalize_training_row(item)
            equipment = db.query(Equipment).filter(Equipment.equipment_id == normalized["equipment_id"]).first()
            if equipment is None:
                continue

            has_recent_telemetry = db.query(Telemetry).filter(Telemetry.equipment_id == equipment.equipment_id).first()
            if has_recent_telemetry and not force_reset:
                continue

            base_lat = normalized["latitude"]
            base_lon = normalized["longitude"]
            db.query(Telemetry).filter(Telemetry.equipment_id == equipment.equipment_id).delete(synchronize_session=False)
            for day_offset in range(7, 0, -1):
                timestamp = datetime.utcnow() - timedelta(days=day_offset)
                engine_value = normalized["engine_hours_per_day"] * (day_offset / 2)
                idle_value = normalized["idle_hours_per_day"] * (day_offset / 2)
                fuel_value = max(10.0, normalized["fuel_level"] - (day_offset * 2.5))
                telemetry = Telemetry(
                    equipment_id=equipment.equipment_id,
                    timestamp=timestamp,
                    latitude=base_lat + random.uniform(-0.002, 0.002),
                    longitude=base_lon + random.uniform(-0.002, 0.002),
                    engine_hours=round(float(engine_value), 2),
                    idle_hours=round(float(idle_value), 2),
                    fuel_level=round(float(fuel_value), 2),
                    fuel_consumption=round(max(0.5, normalized["engine_hours_per_day"] * 0.8), 2),
                    operating_status=normalized["status"],
                    speed=random.uniform(4.0, 18.0) if normalized["status"] == "ACTIVE" else 0.0,
                    engine_temperature=random.uniform(82.0, 96.0) if normalized["status"] == "ACTIVE" else 45.0,
                    site_id=normalized["site_id"],
                    operator_id=normalized["operator_id"],
                )
                db.add(telemetry)

        db.commit()
        print(f"Training dataset seeded: {len(ADDITIONAL_TRAINING_DATA)} equipment records stored in {engine.url}")
        return len(ADDITIONAL_TRAINING_DATA)
    finally:
        db.close()


if __name__ == "__main__":
    seed_database(force_reset=False)
    seed_training_dataset(force_reset=False)
