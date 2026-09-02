import React from 'react';
import { TrendingUp, Activity, ShieldAlert } from 'lucide-react';

export interface SiteForecastItem {
  site_id: string;
  current_demand: number;
  projected_demand: number;
  utilization: number;
  risk_level: string;
}

export interface DemandForecastResponse {
  forecast_days: number;
  total_current_demand: number;
  total_expected_demand: number;
  average_utilization: number;
  site_forecast: SiteForecastItem[];
  insight: string;
}

interface DemandForecastPanelProps {
  forecast: DemandForecastResponse | null;
  loading: boolean;
}

export const DemandForecastPanel: React.FC<DemandForecastPanelProps> = ({ forecast, loading }) => {
  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-3 text-gray-700 text-xs font-black uppercase tracking-wide">
          <TrendingUp className="w-5 h-5 text-[#FFCD00]" />
          Demand Forecasting
        </div>
        <div className="mt-4 text-sm text-gray-600">Loading forecast...</div>
      </div>
    );
  }

  if (!forecast) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-[#FFCD00] border border-black p-2">
              <TrendingUp className="w-5 h-5 text-black" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-900">Demand Forecasting</h2>
              <p className="text-sm text-gray-600">Projected rental demand for the next {forecast.forecast_days} days</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-5">
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center justify-between text-xs text-gray-600 font-bold">
              <span>Current Demand</span>
              <Activity className="w-4 h-4 text-blue-600" />
            </div>
            <p className="mt-2 text-3xl font-black text-gray-900">{forecast.total_current_demand}</p>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center justify-between text-xs text-gray-600 font-bold">
              <span>Expected Demand</span>
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="mt-2 text-3xl font-black text-emerald-700">{forecast.total_expected_demand}</p>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center justify-between text-xs text-gray-600 font-bold">
              <span>Avg Utilization</span>
              <ShieldAlert className="w-4 h-4 text-amber-600" />
            </div>
            <p className="mt-2 text-3xl font-black text-amber-700">{forecast.average_utilization}%</p>
          </div>
        </div>

        <div className="px-5 pb-5">
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-800 font-medium">
            {forecast.insight}
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
        <h3 className="text-lg font-black text-gray-900 mb-4">Site-level demand forecast</h3>

        <div className="space-y-3">
          {forecast.site_forecast.map((site) => (
            <div key={site.site_id} className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-wide font-black text-gray-600">Site</p>
                  <h4 className="text-xl font-black text-gray-900">{site.site_id}</h4>
                </div>

                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border ${
                  site.risk_level === 'HIGH' ? 'bg-red-100 text-red-800 border-red-300' :
                  site.risk_level === 'MEDIUM' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                  'bg-emerald-100 text-emerald-800 border-emerald-300'
                }`}>
                  {site.risk_level} RISK
                </span>
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                <div className="bg-white rounded-xl border border-gray-200 p-3">
                  <p className="text-[10px] uppercase tracking-wide font-black text-gray-500">Current Demand</p>
                  <p className="mt-2 text-2xl font-black text-gray-900">{site.current_demand}</p>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-3">
                  <p className="text-[10px] uppercase tracking-wide font-black text-gray-500">Projected Demand</p>
                  <p className="mt-2 text-2xl font-black text-emerald-700">{site.projected_demand}</p>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-3">
                  <p className="text-[10px] uppercase tracking-wide font-black text-gray-500">Utilization</p>
                  <p className="mt-2 text-2xl font-black text-amber-700">{site.utilization}%</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
