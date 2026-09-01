import React from 'react';
import { TrendingUp, Award, MapPin, Zap } from 'lucide-react';

export default function ForecastSummaryCards({ predictions }) {
  const highestSite = predictions.length > 0 
    ? predictions.reduce((prev, curr) => (curr.predicted_90day_days > prev.predicted_90day_days) ? curr : prev, predictions[0])
    : { site_name: 'Riverfront Hub', primaryType: 'Excavator', predicted_90day_days: 145 };

  const totalForecastDays = predictions.reduce((acc, curr) => acc + curr.predicted_90day_days, 0);

  return (
    <div className="dash-metrics-grid">
      <div className="dash-metric-card">
        <div className="metric-icon" style={{ background: 'rgba(255, 205, 0, 0.15)', color: 'var(--cat-yellow)' }}>
          <TrendingUp size={24} />
        </div>
        <div className="metric-body">
          <span className="metric-label">90-Day Forecasted Demand</span>
          <h2 className="metric-val" style={{ color: 'var(--cat-yellow)' }}>{totalForecastDays} <small style={{ fontSize: 14 }}>Days</small></h2>
          <span className="metric-sub">+24.5% Project Surge Expected</span>
        </div>
      </div>

      <div className="dash-metric-card">
        <div className="metric-icon" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
          <Award size={24} />
        </div>
        <div className="metric-body">
          <span className="metric-label">Peak Machine Category</span>
          <h2 className="metric-val" style={{ color: '#3b82f6' }}>Excavator</h2>
          <span className="metric-sub">42% Total Fleet Allocation</span>
        </div>
      </div>

      <div className="dash-metric-card">
        <div className="metric-icon" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
          <MapPin size={24} />
        </div>
        <div className="metric-body">
          <span className="metric-label">Highest Demand Site</span>
          <h2 className="metric-val" style={{ fontSize: 20, color: '#fca5a5' }}>{highestSite.site_name}</h2>
          <span className="metric-sub">{highestSite.predicted_90day_days} Days Required • High Surge</span>
        </div>
      </div>

      <div className="dash-metric-card">
        <div className="metric-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
          <Zap size={24} />
        </div>
        <div className="metric-body">
          <span className="metric-label">Reallocation Index</span>
          <h2 className="metric-val" style={{ color: '#10b981' }}>94.2%</h2>
          <span className="metric-sub">Optimal Inventory Balance</span>
        </div>
      </div>
    </div>
  );
}
