from typing import List, Dict, Any

import numpy as np
from sklearn.linear_model import LinearRegression
from sqlalchemy.orm import Session

from app.models.equipment import Equipment
from app.schemas.forecast import DemandForecastResponse, SiteDemandForecast
from app.services.equipment_service import calculate_utilization


class DemandForecastService:
    @staticmethod
    def _site_feature_vector(site_items: List[Equipment]) -> List[float]:
        current_demand = sum(1 for item in site_items if item.status in {"ACTIVE", "IDLE", "UNASSIGNED"})
        utilization_values = [
            calculate_utilization(item.total_engine_hours, item.total_idle_hours)
            if (item.total_engine_hours + item.total_idle_hours) > 0
            else calculate_utilization(item.engine_hours_per_day, item.idle_hours_per_day)
            for item in site_items
        ]
        avg_utilization = float(np.mean(utilization_values)) if utilization_values else 0.0
        avg_engine_hours = float(np.mean([item.engine_hours_per_day for item in site_items])) if site_items else 0.0
        avg_idle_hours = float(np.mean([item.idle_hours_per_day for item in site_items])) if site_items else 0.0
        avg_fuel = float(np.mean([item.fuel_level for item in site_items])) if site_items else 0.0
        overdue_count = sum(
            1
            for item in site_items
            if item.expected_checkin_date and item.actual_checkin_date is None and item.expected_checkin_date < __import__('datetime').datetime.utcnow()
        )

        return [
            avg_utilization,
            avg_engine_hours,
            avg_idle_hours,
            avg_fuel,
            overdue_count,
            float(len(site_items)),
            float(current_demand),
        ]

    @classmethod
    def build_forecast(cls, db: Session, forecast_days: int = 7) -> DemandForecastResponse:
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
        training_X = []
        training_y = []

        for site_id, items in sorted(by_site.items()):
            current_demand = sum(1 for item in items if item.status in {"ACTIVE", "IDLE", "UNASSIGNED"})
            utilization_values = [
                calculate_utilization(item.total_engine_hours, item.total_idle_hours)
                if (item.total_engine_hours + item.total_idle_hours) > 0
                else calculate_utilization(item.engine_hours_per_day, item.idle_hours_per_day)
                for item in items
            ]
            avg_utilization = float(np.mean(utilization_values)) if utilization_values else 0.0
            avg_engine = float(np.mean([item.engine_hours_per_day for item in items])) if items else 0.0
            avg_idle = float(np.mean([item.idle_hours_per_day for item in items])) if items else 0.0
            avg_fuel = float(np.mean([item.fuel_level for item in items])) if items else 0.0
            overdue_count = sum(
                1
                for item in items
                if item.expected_checkin_date and item.actual_checkin_date is None and item.expected_checkin_date < __import__('datetime').datetime.utcnow()
            )

            training_X.append([avg_utilization, avg_engine, avg_idle, avg_fuel, overdue_count, len(items), current_demand])
            target = max(1.0, float(current_demand + (avg_utilization / 20.0) + overdue_count * 0.8 + (forecast_days / 7.0)))
            training_y.append(target)

            site_forecast.append({
                "site_id": site_id,
                "current_demand": current_demand,
                "utilization": avg_utilization,
                "overdue_count": overdue_count,
            })

        model = LinearRegression()
        if len(training_X) >= 2:
            model.fit(np.array(training_X, dtype=float), np.array(training_y, dtype=float))
        else:
            model = None

        total_current = 0
        total_expected = 0
        utilization_total = 0.0
        final_site_forecast: List[SiteDemandForecast] = []

        for site_info in site_forecast:
            site_id = site_info["site_id"]
            current_demand = site_info["current_demand"]
            avg_utilization = site_info["utilization"]
            overdue_count = site_info["overdue_count"]

            if model is not None:
                feature_row = np.array([
                    avg_utilization,
                    float(np.mean([item.engine_hours_per_day for item in by_site[site_id]])) if by_site[site_id] else 0.0,
                    float(np.mean([item.idle_hours_per_day for item in by_site[site_id]])) if by_site[site_id] else 0.0,
                    float(np.mean([item.fuel_level for item in by_site[site_id]])) if by_site[site_id] else 0.0,
                    overdue_count,
                    float(len(by_site[site_id])),
                    float(current_demand),
                ], dtype=float)
                projected = float(model.predict(feature_row.reshape(1, -1))[0])
            else:
                projected = float(current_demand)

            projected = max(0, round(projected))
            utilization_total += avg_utilization
            total_current += current_demand
            total_expected += projected

            risk_level = "HIGH" if projected > current_demand * 1.15 else "MEDIUM" if projected > current_demand else "LOW"
            final_site_forecast.append(
                SiteDemandForecast(
                    site_id=site_id,
                    current_demand=current_demand,
                    projected_demand=projected,
                    utilization=round(avg_utilization, 2),
                    risk_level=risk_level,
                )
            )

        average_utilization = round(utilization_total / len(final_site_forecast), 2) if final_site_forecast else 0.0
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
            site_forecast=final_site_forecast,
            insight=insight,
        )
