import React, { useState, useMemo } from 'react';
import type { Equipment, EquipmentStatus } from '../types/equipment';
import { Search, Filter, AlertTriangle, ShieldAlert, ChevronRight, Fuel } from 'lucide-react';

interface EquipmentTableProps {
  equipmentList: Equipment[];
  onSelectEquipment: (equipment: Equipment) => void;
  statusFilter: string | null;
  setStatusFilter: (status: string | null) => void;
}

export const EquipmentTable: React.FC<EquipmentTableProps> = ({
  equipmentList,
  onSelectEquipment,
  statusFilter,
  setStatusFilter
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  const availableTypes = useMemo(() => {
    const types = Array.from(new Set(equipmentList.map(e => e.equipment_type)));
    return ['ALL', ...types];
  }, [equipmentList]);

  const filteredEquipment = useMemo(() => {
    return equipmentList.filter(item => {
      const matchesSearch =
        item.equipment_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.equipment_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.site_id && item.site_id.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.operator_id && item.operator_id.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = statusFilter ? item.status.toUpperCase() === statusFilter.toUpperCase() : true;
      const matchesType = typeFilter === 'ALL' ? true : item.equipment_type === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [equipmentList, searchQuery, statusFilter, typeFilter]);

  const getStatusBadge = (status: EquipmentStatus) => {
    switch (status) {
      case 'ACTIVE':
        return <span className="px-2.5 py-1 text-xs font-extrabold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1 w-max"><span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>ACTIVE</span>;
      case 'IDLE':
        return <span className="px-2.5 py-1 text-xs font-extrabold rounded-full bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1 w-max"><span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>IDLE</span>;
      case 'AVAILABLE':
        return <span className="px-2.5 py-1 text-xs font-extrabold rounded-full bg-blue-100 text-blue-800 border border-blue-300 flex items-center gap-1 w-max">AVAILABLE</span>;
      case 'OVERDUE':
        return <span className="px-2.5 py-1 text-xs font-extrabold rounded-full bg-red-100 text-red-800 border border-red-300 flex items-center gap-1 w-max animate-pulse"><AlertTriangle className="w-3 h-3 text-red-600" />OVERDUE</span>;
      case 'UNASSIGNED':
        return <span className="px-2.5 py-1 text-xs font-extrabold rounded-full bg-purple-100 text-purple-800 border border-purple-300 flex items-center gap-1 w-max">UNASSIGNED</span>;
      case 'ANOMALY':
        return <span className="px-2.5 py-1 text-xs font-extrabold rounded-full bg-orange-100 text-orange-900 border border-orange-300 flex items-center gap-1 w-max"><ShieldAlert className="w-3 h-3 text-orange-600" />ANOMALY</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-extrabold rounded-full bg-gray-100 text-gray-800 border border-gray-300">{status}</span>;
    }
  };

  const getUtilizationBar = (util: number) => {
    let color = 'bg-amber-500';
    if (util >= 70) color = 'bg-emerald-600';
    else if (util < 40) color = 'bg-red-600';

    return (
      <div className="flex items-center gap-2">
        <div className="w-16 bg-gray-200 rounded-full h-2 overflow-hidden border border-gray-300">
          <div className={`h-full ${color}`} style={{ width: `${Math.min(100, util)}%` }}></div>
        </div>
        <span className="text-xs font-extrabold text-gray-900">{util}%</span>
      </div>
    );
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
      {/* Table Toolbar */}
      <div className="p-4 border-b border-gray-200 flex flex-col md:flex-row items-center justify-between gap-4 bg-gray-50">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-gray-500" />
          <input
            type="text"
            placeholder="Search Equipment ID, Type, Site, Operator..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-lg pl-9 pr-4 py-2 focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-black" />
            <select
              value={statusFilter || 'ALL'}
              onChange={e => setStatusFilter(e.target.value === 'ALL' ? null : e.target.value)}
              className="bg-white border border-gray-300 text-gray-900 text-xs font-bold rounded-lg px-3 py-2 focus:outline-none focus:border-black"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="IDLE">IDLE</option>
              <option value="AVAILABLE">AVAILABLE</option>
              <option value="OVERDUE">OVERDUE</option>
              <option value="UNASSIGNED">UNASSIGNED</option>
              <option value="ANOMALY">ANOMALY</option>
            </select>
          </div>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="bg-white border border-gray-300 text-gray-900 text-xs font-bold rounded-lg px-3 py-2 focus:outline-none focus:border-black"
          >
            {availableTypes.map(t => (
              <option key={t} value={t}>
                {t === 'ALL' ? 'All Machine Types' : t}
              </option>
            ))}
          </select>

          {(statusFilter || searchQuery || typeFilter !== 'ALL') && (
            <button
              onClick={() => { setStatusFilter(null); setSearchQuery(''); setTypeFilter('ALL'); }}
              className="text-xs text-black hover:underline font-extrabold bg-[#FFCD00] px-2 py-1 rounded"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Equipment Data Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-gray-800">
          <thead className="bg-gray-100 text-gray-900 font-black uppercase tracking-wider border-b border-gray-200">
            <tr>
              <th className="py-3.5 px-4">Equipment ID</th>
              <th className="py-3.5 px-4">Type</th>
              <th className="py-3.5 px-4">Site ID</th>
              <th className="py-3.5 px-4">Operator</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4">Check-Out</th>
              <th className="py-3.5 px-4">Expected Return</th>
              <th className="py-3.5 px-4">Total Engine / Idle Hrs</th>
              <th className="py-3.5 px-4">Utilization</th>
              <th className="py-3.5 px-4">Fuel Level</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredEquipment.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-8 text-center text-gray-500 font-semibold">
                  No Caterpillar equipment found matching current filter criteria.
                </td>
              </tr>
            ) : (
              filteredEquipment.map(item => (
                <tr
                  key={item.equipment_id}
                  onClick={() => onSelectEquipment(item)}
                  className="hover:bg-amber-50/50 transition-colors cursor-pointer group"
                >
                  <td className="py-3 px-4 font-mono font-black text-black">
                    <span className="bg-[#FFCD00] text-black px-2 py-0.5 rounded shadow-xs group-hover:bg-[#E6B800]">
                      {item.equipment_id}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-bold text-gray-900">{item.equipment_type}</td>
                  <td className="py-3 px-4">
                    {item.site_id ? (
                      <span className="font-mono font-semibold text-gray-800 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">{item.site_id}</span>
                    ) : (
                      <span className="text-gray-400 italic">Unassigned</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {item.operator_id ? (
                      <span className="font-mono font-semibold text-gray-800">{item.operator_id}</span>
                    ) : (
                      <span className="text-gray-400 italic">None</span>
                    )}
                  </td>
                  <td className="py-3 px-4">{getStatusBadge(item.status)}</td>
                  <td className="py-3 px-4 text-gray-600 font-medium">
                    {item.checkout_date ? new Date(item.checkout_date).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="py-3 px-4 font-medium">
                    {item.expected_checkin_date ? (
                      <span className={item.is_overdue ? 'text-red-700 font-extrabold' : 'text-gray-600'}>
                        {new Date(item.expected_checkin_date).toLocaleDateString()}
                        {item.days_overdue && item.days_overdue > 0 ? ` (${item.days_overdue}d overdue)` : ''}
                      </span>
                    ) : 'N/A'}
                  </td>
                  <td className="py-3 px-4 font-mono">
                    <div className="flex flex-col">
                      <div>
                        <span className="text-emerald-700 font-extrabold">{item.total_engine_hours}h</span> / <span className="text-amber-700 font-extrabold">{item.total_idle_hours}h</span>
                      </div>
                      <span className="text-[10px] text-gray-500 font-medium">
                        ({item.engine_hours_per_day}h/d / {item.idle_hours_per_day}h/d)
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4">{getUtilizationBar(item.utilization_percentage)}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5">
                      <Fuel className="w-3.5 h-3.5 text-amber-600" />
                      <span className="font-extrabold text-gray-900">{item.fuel_level}%</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={(e) => { e.stopPropagation(); onSelectEquipment(item); }}
                      className="px-2.5 py-1 bg-gray-100 hover:bg-[#FFCD00] text-gray-900 hover:text-black font-extrabold rounded text-xs transition-colors inline-flex items-center gap-1 border border-gray-300"
                    >
                      <span>Details</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
