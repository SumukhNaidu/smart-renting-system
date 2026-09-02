import React from 'react';
import { DollarSign, AlertTriangle, TrendingDown, BriefcaseBusiness } from 'lucide-react';
import type { FleetBillingSummary } from '../types/billing';

interface CostImpactPanelProps {
  billing: FleetBillingSummary | null;
  loading: boolean;
}

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

export const CostImpactPanel: React.FC<CostImpactPanelProps> = ({ billing, loading }) => {
  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 animate-pulse">
        <div className="h-5 w-48 bg-gray-200 rounded mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-24 bg-gray-100 rounded-xl border border-gray-200" />
          ))}
        </div>
      </div>
    );
  }

  if (!billing) {
    return null;
  }

  const topCostItems = [...billing.items]
    .sort((a, b) => b.total_invoice_amount - a.total_invoice_amount)
    .slice(0, 4);

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="flex items-center justify-between gap-4 p-5 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-[#FFCD00] border border-black p-2">
            <DollarSign className="w-5 h-5 text-black" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] font-black text-gray-600">Financial impact</p>
            <h2 className="text-2xl font-black text-gray-900">Cost Impact Panel</h2>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-5">
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-wide text-gray-600 font-black">
            <span>Fleet revenue</span>
            <TrendingDown className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-3xl font-black text-emerald-700">{currency.format(billing.total_fleet_revenue)}</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-wide text-gray-600 font-black">
            <span>Idle penalties</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <p className="mt-2 text-3xl font-black text-amber-700">{currency.format(billing.total_idle_penalties)}</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-wide text-gray-600 font-black">
            <span>Overdue penalties</span>
            <AlertTriangle className="w-4 h-4 text-red-600" />
          </div>
          <p className="mt-2 text-3xl font-black text-red-700">{currency.format(billing.total_overdue_penalties)}</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-wide text-gray-600 font-black">
            <span>Rented assets</span>
            <BriefcaseBusiness className="w-4 h-4 text-blue-600" />
          </div>
          <p className="mt-2 text-3xl font-black text-gray-900">{billing.total_rented_assets}</p>
        </div>
      </div>

      <div className="px-5 pb-5">
        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
          <h3 className="text-sm font-black uppercase tracking-[0.2em] text-gray-700 mb-4">Top cost drivers</h3>
          <div className="space-y-3">
            {topCostItems.map((item) => (
              <div key={item.equipment_id} className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-3">
                <div>
                  <p className="font-black text-gray-900">{item.equipment_id}</p>
                  <p className="text-xs text-gray-600 font-medium">{item.equipment_type} • {item.status}</p>
                </div>
                <div className="text-right">
                  <p className="font-black text-gray-900">{currency.format(item.total_invoice_amount)}</p>
                  <p className="text-[10px] text-gray-600 uppercase tracking-wider font-bold">
                    Idle {currency.format(item.idle_penalty_cost)} • Overdue {currency.format(item.overdue_penalty_cost)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
