import React from 'react';
import { Calendar } from 'lucide-react';

export default function DateRangeSelector({ selectedRange, onChangeRange }) {
  const options = [
    { label: 'Last 7 Days', value: '7d' },
    { label: 'Last 30 Days', value: '30d' },
    { label: 'Last 90 Days', value: '90d' },
    { label: 'All Time', value: 'all' }
  ];

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
      <span style={{ fontSize: 13, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
        <Calendar size={14} color="var(--cat-yellow)" /> Date Range:
      </span>
      <div className="filter-tabs">
        {options.map(opt => (
          <button 
            key={opt.value}
            className={`tab-btn ${selectedRange === opt.value ? 'active' : ''}`}
            onClick={() => onChangeRange(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
