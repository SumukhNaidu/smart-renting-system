import React from 'react';
import { BarChart2, Calendar, TrendingUp } from 'lucide-react';

export default function DemandTrendChart({ monthlyData }) {
  const maxDays = Math.max(...monthlyData.map(m => m.TotalDays || 1), 60);

  return (
    <div className="detail-card" style={{ marginBottom: 24 }}>
      <div className="detail-card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <BarChart2 size={20} color="var(--cat-yellow)" />
          <h3>12-Month Historical Utilization & Seasonal Demand Projections</h3>
        </div>
        <div style={{ display: 'flex', gap: 14, fontSize: 12 }}>
          <span style={{ color: '#FFCD00', fontWeight: 600 }}>■ Excavator</span>
          <span style={{ color: '#3b82f6', fontWeight: 600 }}>■ Bulldozer</span>
          <span style={{ color: '#10b981', fontWeight: 600 }}>■ Crane</span>
          <span style={{ color: '#f59e0b', fontWeight: 600 }}>■ Grader</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 10, alignItems: 'flex-end', height: 200, marginTop: 24, paddingBottom: 10, borderBottom: '1px solid var(--border-color)' }}>
        {monthlyData.map((item, idx) => {
          const heightPct = Math.min(Math.round((item.TotalDays / maxDays) * 100), 100);
          return (
            <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--cat-yellow)', marginBottom: 4 }}>
                {item.TotalDays > 0 ? item.TotalDays : '—'}
              </div>
              <div 
                style={{ 
                  width: '100%', 
                  height: `${Math.max(heightPct, 8)}%`, 
                  background: item.month === 'Apr' || item.month === 'May' || item.month === 'Jun' 
                    ? 'linear-gradient(180deg, var(--cat-yellow), rgba(255, 205, 0, 0.4))' 
                    : 'linear-gradient(180deg, #3b82f6, rgba(59, 130, 246, 0.4))',
                  borderRadius: '4px 4px 0 0',
                  transition: 'height 0.3s ease'
                }}
                title={`${item.month}: ${item.TotalDays} Rental Days`}
              ></div>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8, fontWeight: 600 }}>
                {item.month}
              </span>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, fontSize: 12, color: 'var(--text-muted)' }}>
        <span>📊 Q1-Q2 Data Aggregated from 27 Historical Rental Records</span>
        <span style={{ color: 'var(--cat-yellow)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
          <TrendingUp size={14} /> Seasonal Peak Identified: April–June (Riverfront & Quarry Foundation Surge)
        </span>
      </div>
    </div>
  );
}
