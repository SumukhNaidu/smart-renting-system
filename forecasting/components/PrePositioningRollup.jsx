import React from 'react';
import { Truck, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function PrePositioningRollup({ rollup }) {
  if (!rollup) return null;

  return (
    <div className="kiosk-panel" style={{ background: 'linear-gradient(135deg, rgba(255, 205, 0, 0.12), rgba(24, 27, 34, 0.95))', borderColor: 'var(--cat-yellow)', marginBottom: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <div style={{ background: 'var(--cat-yellow)', color: '#000', padding: 6, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Truck size={20} />
            </div>
            <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: '1px', color: 'var(--cat-yellow)', textTransform: 'uppercase' }}>
              Recommended Pre-Positioning Action Rollup
            </span>
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 800, marginTop: 4 }}>{rollup.headline}</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            💡 <strong>Action Recommendation:</strong> {rollup.recommended_action}
          </p>
        </div>

        <div style={{ background: 'rgba(255, 205, 0, 0.15)', border: '1px solid var(--cat-yellow)', padding: '12px 20px', borderRadius: 'var(--radius-md)', textAlign: 'right' }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Target Sites</span>
          <h4 style={{ color: 'var(--cat-yellow)', fontSize: 14, fontWeight: 700, marginTop: 2 }}>{rollup.target_sites}</h4>
        </div>
      </div>
    </div>
  );
}
