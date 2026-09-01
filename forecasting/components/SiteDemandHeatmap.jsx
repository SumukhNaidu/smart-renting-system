import React from 'react';
import { MapPin, AlertTriangle, CheckCircle, ShieldAlert } from 'lucide-react';

export default function SiteDemandHeatmap({ predictions }) {
  return (
    <div className="detail-card">
      <div className="detail-card-title">
        <MapPin size={20} color="var(--cat-yellow)" />
        <h3>Job Site Demand Intensity Heatmap & 90-Day Forecast</h3>
      </div>

      <div className="table-responsive" style={{ marginTop: 16 }}>
        <table className="dash-asset-table">
          <thead>
            <tr>
              <th>Construction Site</th>
              <th>Primary Machine Needed</th>
              <th>Historical Usage</th>
              <th>90-Day Projected Demand</th>
              <th>Required Units</th>
              <th>Surge Risk Level</th>
            </tr>
          </thead>
          <tbody>
            {predictions.map((p, idx) => (
              <tr key={idx}>
                <td>
                  <strong>{p.site_name}</strong>
                  {p.site_id && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Site ID: {p.site_id}</div>}
                </td>
                <td style={{ color: 'var(--cat-yellow)', fontWeight: 600 }}>{p.primaryType}</td>
                <td>{p.historical_days} Days</td>
                <td style={{ fontWeight: 700 }}>{p.predicted_90day_days} Days</td>
                <td>
                  <span style={{ background: 'rgba(255, 205, 0, 0.15)', color: 'var(--cat-yellow)', padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>
                    {p.required_units} Units
                  </span>
                </td>
                <td>
                  {p.surge_risk === 'HIGH SURGE' ? (
                    <span className="badge badge-overdue"><AlertTriangle size={12} /> High Demand Surge</span>
                  ) : p.surge_risk === 'MODERATE' ? (
                    <span className="badge badge-idle"><ShieldAlert size={12} /> Moderate Surge</span>
                  ) : (
                    <span className="badge badge-available"><CheckCircle size={12} /> Stable</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
