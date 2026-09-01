import React from 'react';
import { Truck, ArrowRight, Zap, CheckCircle2 } from 'lucide-react';

export default function ReallocationRecommendations({ recommendations }) {
  return (
    <div className="detail-card">
      <div className="detail-card-title">
        <Zap size={20} color="var(--cat-yellow)" />
        <h3>Predictive Fleet Reallocation Recommendations</h3>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 16 }}>
        {recommendations.map(rec => (
          <div key={rec.id} className="deploy-box" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Truck size={16} color="var(--cat-yellow)" />
                <h4 style={{ fontSize: 15, fontWeight: 700 }}>{rec.action}</h4>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Target: <strong>{rec.target_site}</strong> • Machine: <span style={{ color: 'var(--cat-yellow)' }}>{rec.machine_type}</span></p>
              <p style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>💡 {rec.reason}</p>
            </div>

            <div>
              {rec.urgency === 'HIGH' ? (
                <span className="badge badge-overdue">Priority Action</span>
              ) : rec.urgency === 'MEDIUM' ? (
                <span className="badge badge-idle">Recommended</span>
              ) : (
                <span className="badge badge-available">Optimal State</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
