from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.models.equipment import Equipment
from app.schemas.forecast import DemandForecastResponse, SiteDemandForecast


class DemandForecastService:
    @staticmethod
    def build_forecast(db: Session, forecast_days: int = 7) -> DemandForecastResponse:
        equipment = db.query(Equipment).all()
        if not equipment:
            return DemandForecastResponse(
                total_current_demand=0,
                total_expected_demand=0,
                average_utilization=0.0,
                site_forecast=[],
                insight="No fleet data available for demand forecasting."
            )

        by_site: Dict[str, List[Equipment]] = {}
        for item in equipment:
            by_site.setdefault(item.site_id or "UNASSIGNED", []).append(item)

        site_forecast: List[SiteDemandForecast] = []
        total_current = 0
        total_expected = 0
        utilization_total = 0.0

        for site_id, items in sorted(by_site.items()):
            current_demand = sum(1 for item in items if item.status in {"ACTIVE", "IDLE", "UNASSIGNED"})
            utilization = round(sum((item.total_engine_hours + item.total_idle_hours) for item in items) / max(1, len(items)), 2)
            utilization_total += utilization
            risk_multiplier = 1.15 if site_id == "UNASSIGNED" else 1.0
            projected = max(0, round(current_demand * risk_multiplier + (forecast_days / 7) * 1.2))

            total_current += current_demand
            total_expected += projected

            risk_level = "HIGH" if projected > current_demand * 1.15 else "MEDIUM" if projected > current_demand else "LOW"
            site_forecast.append(
                SiteDemandForecast(
                    site_id=site_id,
                    current_demand=current_demand,
                    projected_demand=projected,
                    utilization=utilization,
                    risk_level=risk_level,
                )
            )

        average_utilization = round(utilization_total / len(site_forecast), 2) if site_forecast else 0.0
        insight = (
            "Demand is steady across active sites. Priority should remain on high-utilization locations "
            "with elevated overdue or idle risk."
            if total_expected >= total_current
            else "Fleet demand is softening; redeploy equipment to underutilized sites before renewal."
        )

        return DemandForecastResponse(
            forecast_days=forecast_days,
            total_current_demand=total_current,
            total_expected_demand=total_expected,
            average_utilization=average_utilization,
            site_forecast=site_forecast,
            insight=insight,
        )
