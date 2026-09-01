import React from 'react';
import { Truck, Activity, Clock, Award } from 'lucide-react';

export default function AnalyticsSummaryCards({ metrics }) {
  return (
    <div className="dash-metrics-grid" style={{ marginBottom: 24 }}>
      {/* 1. Total Equipment Rented */}
      <div className="dash-metric-card">
        <div className="metric-icon" style={{ background: 'rgba(255, 205, 0, 0.15)', color: 'var(--cat-yellow)' }}>
          <Truck size={24} />
        </div>
        <div className="metric-body">
          <span className="metric-label">Total Equipment Rented</span>
          <h2 className="metric-val" style={{ color: 'var(--cat-yellow)' }}>{metrics.totalRented}</h2>
          <span className="metric-sub">Active & Historical Rentals</span>
        </div>
      </div>

      {/* 2. Average Utilization % */}
      <div className="dash-metric-card">
        <div className="metric-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
          <Activity size={24} />
        </div>
        <div className="metric-body">
          <span className="metric-label">Average Utilization %</span>
          <h2 className="metric-val" style={{ color: '#10b981' }}>{metrics.avgUtilizationPct}%</h2>
          <span className="metric-sub">Engine Hrs / Total Available Hrs</span>
        </div>
      </div>

      {/* 3. Total Idle Hours */}
      <div className="dash-metric-card">
        <div className="metric-icon" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
          <Clock size={24} />
        </div>
        <div className="metric-body">
          <span className="metric-label">Total Idle Hours</span>
          <h2 className="metric-val" style={{ color: '#ef4444' }}>{metrics.totalIdleHours} <small style={{ fontSize: 13 }}>hrs</small></h2>
          <span className="metric-sub" style={{ color: '#fca5a5' }}>Non-Productive Running Time</span>
        </div>
      </div>

      {/* 4. Most-Used Equipment Type */}
      <div className="dash-metric-card">
        <div className="metric-icon" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
          <Award size={24} />
        </div>
        <div className="metric-body">
          <span className="metric-label">Most-Used Equipment Type</span>
          <h2 className="metric-val" style={{ color: '#3b82f6', fontSize: 22 }}>{metrics.mostUsedType}</h2>
          <span className="metric-sub">Highest Engine Operating Hours</span>
        </div>
      </div>
    </div>
  );
}
