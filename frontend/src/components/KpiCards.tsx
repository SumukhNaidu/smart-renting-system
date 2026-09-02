import React from 'react';
import type { DashboardSummary } from '../types/equipment';
import { Truck, PlayCircle, PauseCircle, CheckCircle, AlertTriangle, UserX, ShieldAlert, Gauge } from 'lucide-react';

interface KpiCardsProps {
  summary: DashboardSummary | null;
  activeFilter: string | null;
  onFilterChange: (statusFilter: string | null) => void;
}

export const KpiCards: React.FC<KpiCardsProps> = ({ summary, activeFilter, onFilterChange }) => {
  if (!summary) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 animate-pulse">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-24 bg-white rounded-xl border border-gray-200 shadow-sm"></div>
        ))}
      </div>
    );
  }

  const cards = [
    {
      id: null,
      title: 'Total Assets',
      value: summary.total_equipment,
      icon: Truck,
      color: 'text-gray-900',
      bgColor: 'bg-white hover:bg-gray-50',
      borderColor: 'border-gray-300'
    },
    {
      id: 'ACTIVE',
      title: 'Active Fleet',
      value: summary.active_equipment,
      icon: PlayCircle,
      color: 'text-emerald-700',
      bgColor: 'bg-emerald-50/60 hover:bg-emerald-50',
      borderColor: 'border-emerald-200'
    },
    {
      id: 'IDLE',
      title: 'Idle Fleet',
      value: summary.idle_equipment,
      icon: PauseCircle,
      color: 'text-amber-700',
      bgColor: 'bg-amber-50/60 hover:bg-amber-50',
      borderColor: 'border-amber-200'
    },
    {
      id: 'AVAILABLE',
      title: 'Available',
      value: summary.available_equipment,
      icon: CheckCircle,
      color: 'text-blue-700',
      bgColor: 'bg-blue-50/60 hover:bg-blue-50',
      borderColor: 'border-blue-200'
    },
    {
      id: 'OVERDUE',
      title: 'Overdue Rentals',
      value: summary.overdue_equipment,
      icon: AlertTriangle,
      color: 'text-red-700',
      bgColor: 'bg-red-50/60 hover:bg-red-50',
      borderColor: 'border-red-200'
    },
    {
      id: 'UNASSIGNED',
      title: 'Unassigned',
      value: summary.unassigned_equipment,
      icon: UserX,
      color: 'text-purple-700',
      bgColor: 'bg-purple-50/60 hover:bg-purple-50',
      borderColor: 'border-purple-200'
    },
    {
      id: 'ANOMALY',
      title: 'Anomalies',
      value: summary.anomaly_equipment,
      icon: ShieldAlert,
      color: 'text-orange-700',
      bgColor: 'bg-orange-50/60 hover:bg-orange-50',
      borderColor: 'border-orange-200'
    },
    {
      id: 'UTILIZATION',
      title: 'Avg Utilization',
      value: `${summary.average_utilization}%`,
      icon: Gauge,
      color: 'text-black',
      bgColor: 'bg-[#FFCD00]/20 hover:bg-[#FFCD00]/30',
      borderColor: 'border-[#FFCD00]'
    }
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
      {cards.map((card) => {
        const IconComponent = card.icon;
        const isSelected = activeFilter === card.id;
        return (
          <div
            key={card.title}
            onClick={() => card.id !== 'UTILIZATION' && onFilterChange(isSelected ? null : card.id)}
            className={`p-3.5 rounded-xl border shadow-sm transition-all cursor-pointer select-none flex flex-col justify-between ${card.bgColor} ${card.borderColor} ${
              isSelected ? 'ring-2 ring-black scale-[1.02] shadow-md bg-[#FFCD00]/30' : 'hover:scale-[1.01]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">{card.title}</span>
              <IconComponent className={`w-4 h-4 ${card.color}`} />
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className={`text-2xl font-black ${card.color}`}>{card.value}</span>
              {isSelected && <span className="text-[10px] font-extrabold text-black uppercase bg-[#FFCD00] px-1.5 py-0.5 rounded">Active</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
};
