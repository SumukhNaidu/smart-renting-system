import React from 'react';
import { MapPin, ShieldCheck, AlertCircle, HelpCircle, CheckCircle } from 'lucide-react';

export default function PatternForecastTable({ predictions }) {
  const renderConfidenceBadge = (p) => {
    switch (p.confidence_level) {
      case 'High':
        return (
          <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.4)' }}>
            <CheckCircle size={12} /> High Confidence (3+ Matches)
          </span>
        );
      case 'Medium':
        return (
          <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.4)' }}>
            <AlertCircle size={12} /> Medium Confidence (1-2 Matches)
          </span>
        );
      case 'Low':
      default:
        return (
          <span className="badge" style={{ background: 'rgba(148, 163, 184, 0.15)', color: '#94a3b8', border: '1px solid rgba(148, 163, 184, 0.4)' }}>
            <HelpCircle size={12} /> Low Confidence (No Strong Pattern)
          </span>
        );
    }
  };

  return (
    <div className="asset-table-panel" style={{ marginTop: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <MapPin size={22} color="var(--cat-yellow)" />
          <h3 className="section-title-yellow">Predicted Demand for Next 30 Days (Site-by-Site)</h3>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          💡 Pattern-based historical frequency analysis (Explainable Insights)
        </div>
      </div>

      <div className="table-responsive">
        <table className="dash-asset-table">
          <thead>
            <tr>
              <th>Job Site Name</th>
              <th>Predicted Equipment Need</th>
              <th>Units Needed</th>
              <th>Confidence Level</th>
              <th>Explainable Pattern & Rationale</th>
            </tr>
          </thead>
          <tbody>
            {predictions.map((p, idx) => (
              <tr key={idx}>
                <td>
                  <strong>{p.site_name}</strong>
                  {p.site_id && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Site ID: {p.site_id}</div>}
                </td>
                <td style={{ color: 'var(--cat-yellow)', fontWeight: 700, fontSize: 14 }}>
                  {p.equipment_type}
                </td>
                <td>
                  <span style={{ background: 'rgba(255, 205, 0, 0.15)', color: 'var(--cat-yellow)', padding: '4px 12px', borderRadius: 4, fontWeight: 800 }}>
                    {p.predicted_units} {p.predicted_units === 1 ? 'Unit' : 'Units'}
                  </span>
                </td>
                <td>{renderConfidenceBadge(p)}</td>
                <td>
                  <div style={{ fontSize: 13, color: 'var(--text-main)' }}>
                    {p.explanation}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>
                    Historical occurrences in logs: <strong>{p.historical_count} rentals</strong>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
