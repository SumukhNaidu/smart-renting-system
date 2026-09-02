from pydantic import BaseModel
from typing import List


class SiteDemandForecast(BaseModel):
    site_id: str
    current_demand: int
    projected_demand: int
    utilization: float
    risk_level: str


class DemandForecastResponse(BaseModel):
    forecast_days: int = 7
    total_current_demand: int
    total_expected_demand: int
    average_utilization: float
    site_forecast: List[SiteDemandForecast]
    insight: str
