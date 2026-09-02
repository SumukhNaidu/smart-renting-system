import os
try:
    from pydantic_settings import BaseSettings
except ImportError:
    from pydantic import BaseSettings  # fallback for older pydantic

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_DATABASE_PATH = os.path.join(BACKEND_DIR, "smart_rental.db")

class Settings(BaseSettings):
    PROJECT_NAME: str = "Caterpillar Smart Rental Tracking System"
    API_V1_STR: str = "/api"
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{DEFAULT_DATABASE_PATH}")
    
    # Operational Thresholds
    UTILIZATION_HIGH_THRESHOLD: float = 70.0
    UTILIZATION_NORMAL_THRESHOLD: float = 40.0
    EXCESSIVE_IDLE_HOURS_PER_DAY: float = 8.0
    UPCOMING_RETURN_HIGH_WARNING_HOURS: int = 24
    UPCOMING_RETURN_WARNING_HOURS: int = 48
    STALE_TELEMETRY_MINUTES: int = 60
    
    # Anomaly Detection Settings
    ISOLATION_FOREST_CONTAMINATION: float = 0.1

settings = Settings()
