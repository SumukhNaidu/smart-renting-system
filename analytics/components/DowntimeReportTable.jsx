import React from 'react';
import { AlertTriangle, CheckCircle, Clock } from 'lucide-react';

export default function DowntimeReportTable({ downtimeData }) {
  return (
    <div className="asset-table-panel">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <Clock size={22} color="var(--cat-yellow)" />
        <h3 className="section-title-yellow">Downtime & Idle Hours Analysis Report</h3>
      </div>

      <div className="table-responsive">
        <table className="dash-asset-table">
          <thead>
            <tr>
              <th>Equipment ID</th>
              <th>Type & Model</th>
              <th>Job Site</th>
              <th>Engine Hrs</th>
              <th>Total Idle Hours</th>
              <th>Idle % of Total Time</th>
              <th>Status Alert</th>
            </tr>
          </thead>
          <tbody>
            {downtimeData.map(item => (
              <tr 
                key={item.equipment_id}
                style={{ background: item.is_flagged ? 'rgba(239, 68, 68, 0.05)' : 'transparent' }}
              >
                <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--cat-yellow)' }}>
                  {item.equipment_id}
                </td>
                <td>
                  <strong>{item.model}</strong>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{item.type}</div>
                </td>
                <td>{item.site_name}</td>
                <td style={{ fontFamily: 'var(--font-mono)' }}>{item.engine_hours} hrs</td>
                <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: item.is_flagged ? '#f87171' : 'inherit' }}>
                  {item.idle_hours} hrs
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 700, color: item.is_flagged ? '#ef4444' : 'var(--cat-yellow)' }}>
                      {item.idle_pct}%
                    </span>
                    <div style={{ flex: 1, height: 6, background: 'var(--bg-input)', borderRadius: 3, overflow: 'hidden' }}>
                      <div 
                        style={{ 
                          width: `${Math.min(item.idle_pct, 100)}%`, 
                          height: '100%', 
                          background: item.is_flagged ? '#ef4444' : 'var(--cat-yellow)' 
                        }}
                      ></div>
                    </div>
                  </div>
                </td>
                <td>
                  {item.is_flagged ? (
                    <span className="badge badge-overdue">
                      <AlertTriangle size={12} /> Flagged: High Idle ({item.idle_pct}%)
                    </span>
                  ) : (
                    <span className="badge badge-available">
                      <CheckCircle size={12} /> Normal
                    </span>
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
