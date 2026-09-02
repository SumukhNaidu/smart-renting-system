import logging
import os
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import engine, Base
from app.api.routers import equipment, telemetry, alerts, anomalies, billing, forecast
from app.websocket_manager import ws_manager
from seed_data import seed_database, import_synthetic_csv_dataset

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("smart_rental_backend")

# Create tables and seed only if database is empty; avoid wiping live demo data on restart.
Base.metadata.create_all(bind=engine)
try:
    force_reset = str(__import__('os').getenv("FORCE_RESEED", "false")).lower() == "true"
    seed_database(force_reset=force_reset)

    candidate_paths = [
        os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "synthetic_rental_data_1000.csv"),
        os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "Downloads", "synthetic_rental_data_1000.csv"),
        os.path.join(os.path.expanduser("~"), "Downloads", "synthetic_rental_data_1000.csv"),
    ]

    csv_path = next((path for path in candidate_paths if os.path.exists(path)), None)
    if csv_path:
        from app.database import SessionLocal
        from app.models.equipment import Equipment
        with SessionLocal() as session:
            equipment_count = session.query(Equipment).count()
        if equipment_count < 80:
            imported = import_synthetic_csv_dataset(csv_path)
            logger.info(f"Imported synthetic CSV rows into SQLite: {imported}")

except Exception as e:
    logger.warning(f"Seed database execution notice: {e}")

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins for local hackathon demo development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(equipment.router, prefix=settings.API_V1_STR)
app.include_router(telemetry.router, prefix=settings.API_V1_STR)
app.include_router(alerts.router, prefix=settings.API_V1_STR)
app.include_router(anomalies.router, prefix=settings.API_V1_STR)
app.include_router(billing.router, prefix=settings.API_V1_STR)
app.include_router(forecast.router, prefix=settings.API_V1_STR)

@app.get("/")
def root_check():
    return {
        "status": "online",
        "system": settings.PROJECT_NAME,
        "docs": f"{settings.API_V1_STR}/docs",
        "version": "1.0.0"
    }

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            # Keep socket alive and receive heartbeat pings
            data = await websocket.receive_text()
            logger.debug(f"Received WS ping: {data}")
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        ws_manager.disconnect(websocket)
