import React from 'react';
import { BarChart2, PieChart, TrendingUp, Grid } from 'lucide-react';

export default function AnalyticsChartsGrid({ chartData }) {
  const { utilizationPerEquipment, usagePerSite, idleTrend, typeDistribution } = chartData;

  const maxEngine = Math.max(...utilizationPerEquipment.map(d => (d.engine_hours + d.idle_hours) || 1), 60);
  const maxSiteHours = Math.max(...usagePerSite.map(s => s.engine_hours || 1), 80);
  const maxTrend = Math.max(...idleTrend.map(t => t.idle_hours || 1), 80);
  const maxTypeCount = Math.max(...typeDistribution.map(t => t.rented_count || 1), 6);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))', gap: 24, marginBottom: 28 }}>
      
      {/* 1. Bar Chart: Utilization % per Equipment (Engine vs Idle Hours) */}
      <div className="detail-card">
        <div className="detail-card-title">
          <BarChart2 size={18} color="var(--cat-yellow)" />
          <h3>Equipment Hours: Engine Active vs. Idle Hours</h3>
        </div>
        <div style={{ display: 'flex', gap: 14, fontSize: 12, marginBottom: 16 }}>
          <span style={{ color: '#FFCD00', fontWeight: 600 }}>■ Engine Active Hours</span>
          <span style={{ color: '#ef4444', fontWeight: 600 }}>■ Non-Productive Idle Hours</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {utilizationPerEquipment.map(item => {
            const enginePct = Math.round((item.engine_hours / maxEngine) * 100);
            const idlePct = Math.round((item.idle_hours / maxEngine) * 100);

            return (
              <div key={item.name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--cat-yellow)' }}>{item.name}</span>
                  <span style={{ color: 'var(--text-muted)' }}>{item.engine_hours}h Eng / {item.idle_hours}h Idle</span>
                </div>
                <div style={{ display: 'flex', height: 12, background: 'var(--bg-input)', borderRadius: 6, overflow: 'hidden' }}>
                  <div style={{ width: `${enginePct}%`, background: 'var(--cat-yellow)' }} title={`Engine: ${item.engine_hours}h`}></div>
                  <div style={{ width: `${idlePct}%`, background: '#ef4444' }} title={`Idle: ${item.idle_hours}h`}></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Usage per Site (Total Engine Hours by Site) */}
      <div className="detail-card">
        <div className="detail-card-title">
          <PieChart size={18} color="var(--cat-yellow)" />
          <h3>Equipment Usage by Construction Site (Engine Hrs)</h3>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 12 }}>
          {usagePerSite.map((site, idx) => {
            const widthPct = Math.round((site.engine_hours / maxSiteHours) * 100);
            const colors = ['#FFCD00', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];
            const barColor = colors[idx % colors.length];

            return (
              <div key={site.site_name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                  <span style={{ fontWeight: 600 }}>{site.site_name}</span>
                  <span style={{ color: barColor, fontWeight: 700 }}>{site.engine_hours} hrs</span>
                </div>
                <div className="idle-bar-track">
                  <div className="idle-bar-fill" style={{ width: `${widthPct}%`, background: barColor }}></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Line Chart: Downtime / Idle Trend Over Time */}
      <div className="detail-card">
        <div className="detail-card-title">
          <TrendingUp size={18} color="var(--cat-yellow)" />
          <h3>Downtime & Idle Hours Trend Timeline</h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, alignItems: 'flex-end', height: 160, marginTop: 20, paddingBottom: 10, borderBottom: '1px solid var(--border-color)' }}>
          {idleTrend.map((t, idx) => {
            const hPct = Math.round((t.idle_hours / maxTrend) * 100);
            return (
              <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                <span style={{ fontSize: 11, color: '#f87171', fontWeight: 700, marginBottom: 4 }}>{t.idle_hours}h</span>
                <div 
                  style={{ 
                    width: '70%', 
                    height: `${Math.max(hPct, 12)}%`, 
                    background: 'linear-gradient(180deg, #ef4444, rgba(239, 68, 68, 0.3))', 
                    borderRadius: '4px 4px 0 0' 
                  }}
                ></div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>{t.period}</span>
              </div>
            );
          })}
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 12 }}>⚠️ Downtime peak observed in Week 5 due to unassigned site delays.</p>
      </div>

      {/* 4. Bar Chart: Equipment Type Distribution (Currently Rented Count) */}
      <div className="detail-card">
        <div className="detail-card-title">
          <Grid size={18} color="var(--cat-yellow)" />
          <h3>Currently Rented Equipment Type Distribution</h3>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 12 }}>
          {typeDistribution.map(t => {
            const widthPct = Math.round((t.rented_count / maxTypeCount) * 100);
            return (
              <div key={t.type}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                  <span style={{ fontWeight: 600 }}>{t.type}</span>
                  <span style={{ color: 'var(--cat-yellow)', fontWeight: 700 }}>{t.rented_count} Units Active</span>
                </div>
                <div className="idle-bar-track">
                  <div className="idle-bar-fill" style={{ width: `${widthPct}%`, background: 'var(--cat-yellow)' }}></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
