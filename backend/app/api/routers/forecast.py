from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.forecast_service import DemandForecastService

router = APIRouter(tags=["Demand Forecasting"])


@router.get("/forecast/demand")
def get_demand_forecast(
    forecast_days: int = Query(7, ge=1, le=30),
    db: Session = Depends(get_db),
):
    return DemandForecastService.build_forecast(db, forecast_days=forecast_days).model_dump()
