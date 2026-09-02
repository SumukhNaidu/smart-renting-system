import React, { useEffect, useState } from 'react';
import type { Equipment, TelemetryRecord, AnomalyItem } from '../types/equipment';
import { api } from '../services/api';
import { X, Calendar, Gauge, Fuel, Clock, ShieldAlert, Activity, QrCode, ArrowRightLeft } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';

interface EquipmentDetailModalProps {
  equipment: Equipment | null;
  onClose: () => void;
  onAfterUpdate?: () => void | Promise<void>;
  onLifecycleEvent?: (action: 'checkin' | 'checkout', equipmentId: string) => void;
}

export const EquipmentDetailModal: React.FC<EquipmentDetailModalProps> = ({ equipment, onClose, onAfterUpdate, onLifecycleEvent }) => {
  const [telemetryHistory, setTelemetryHistory] = useState<TelemetryRecord[]>([]);
  const [anomalies, setAnomalies] = useState<AnomalyItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState<'checkout' | 'checkin'>('checkout');
  const [scanId, setScanId] = useState('');
  const [scanQr, setScanQr] = useState('');
  const [siteId, setSiteId] = useState('');
  const [operatorId, setOperatorId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!equipment) return;

    const currentEquipment = equipment;

    setScanId(currentEquipment.equipment_id);
    setScanQr(currentEquipment.qr_code ?? '');
    setSiteId(currentEquipment.site_id ?? '');
    setOperatorId(currentEquipment.operator_id ?? '');

    const fetchData = async () => {
      setLoading(true);
      try {
        const [history, anomalyData] = await Promise.all([
          api.getTelemetryHistory(currentEquipment.equipment_id, 30),
          api.getAnomalies(currentEquipment.equipment_id)
        ]);
        setTelemetryHistory(history);
        setAnomalies(anomalyData);
      } catch (err) {
        console.error('Failed to load asset details:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [equipment]);

  const handleSubmitCheckinCheckout = async () => {
    if (!equipment) return;
    const currentEquipment = equipment;

    try {
      setSubmitting(true);
      const result = await api.updateEquipmentCheckinCheckout({
        equipment_id: scanId || currentEquipment.equipment_id,
        qr_code: scanQr || currentEquipment.qr_code || undefined,
        site_id: siteId || currentEquipment.site_id || undefined,
        operator_id: operatorId || currentEquipment.operator_id || undefined,
        action,
      });

      if (result.equipment_id) {
        const refreshed = await api.getEquipmentById(result.equipment_id);
        equipment = refreshed;
        setScanId(refreshed.equipment_id);
        setScanQr(refreshed.qr_code ?? '');
        setSiteId(refreshed.site_id ?? '');
        setOperatorId(refreshed.operator_id ?? '');
        onLifecycleEvent?.(action, refreshed.equipment_id);
        await onAfterUpdate?.();
        onClose();
      }
    } catch (err) {
      console.error('Failed to update equipment lifecycle:', err);
      alert('Check-in / check-out update failed. Please verify the equipment ID or QR code.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!equipment) return null;

  const chartData = telemetryHistory.map(t => ({
    date: new Date(t.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    engine_hours: t.engine_hours,
    idle_hours: t.idle_hours,
    fuel_level: t.fuel_level,
    utilization: t.utilization_percentage
  }));

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-gray-300 rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Modal Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between bg-gray-50 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <div className="bg-[#FFCD00] text-black font-black text-xl px-3 py-1.5 rounded shadow border border-black">
              {equipment.equipment_id}
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
                {equipment.equipment_type} Specifications
              </h2>
              <p className="text-xs text-gray-600 font-mono font-semibold">
                Site: {equipment.site_id || 'NULL (Unassigned)'} • Operator: {equipment.operator_id || 'NULL'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 text-xs font-extrabold rounded-full border ${
              equipment.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
              equipment.status === 'OVERDUE' ? 'bg-red-100 text-red-800 border-red-300 animate-pulse' :
              equipment.status === 'ANOMALY' ? 'bg-orange-100 text-orange-900 border-orange-300' :
              'bg-gray-100 text-gray-800 border-gray-300'
            }`}>
              {equipment.status}
            </span>
            <button
              onClick={onClose}
              className="p-2 text-gray-600 hover:text-black hover:bg-gray-200 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-6">
          {/* Metadata Specs Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
              <span className="text-xs text-gray-600 font-bold flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-black" /> Rental Schedule
              </span>
              <div className="mt-2 text-xs space-y-1">
                <p><span className="text-gray-500">Checkout:</span> <strong className="text-gray-900">{equipment.checkout_date ? new Date(equipment.checkout_date).toLocaleDateString() : 'N/A'}</strong></p>
                <p><span className="text-gray-500">Expected:</span> <strong className={equipment.is_overdue ? 'text-red-700 font-extrabold' : 'text-gray-900'}>{equipment.expected_checkin_date ? new Date(equipment.expected_checkin_date).toLocaleDateString() : 'N/A'}</strong></p>
                {equipment.days_overdue ? <p className="text-red-700 font-extrabold">{equipment.days_overdue} days overdue</p> : null}
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
              <span className="text-xs text-gray-600 font-bold flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-700" /> Daily Runtime & Idle
              </span>
              <div className="mt-2 text-xs space-y-1">
                <p><span className="text-gray-500">Engine Hrs/Day:</span> <strong className="text-emerald-700 font-extrabold">{equipment.engine_hours_per_day} hrs</strong></p>
                <p><span className="text-gray-500">Idle Hrs/Day:</span> <strong className="text-amber-700 font-extrabold">{equipment.idle_hours_per_day} hrs</strong></p>
                <p><span className="text-gray-500">Operating Days:</span> <strong className="text-gray-900">{equipment.operating_days} days</strong></p>
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
              <span className="text-xs text-gray-600 font-bold flex items-center gap-1.5">
                <Gauge className="w-3.5 h-3.5 text-blue-700" /> Fleet Utilization
              </span>
              <div className="mt-2">
                <span className="text-2xl font-black text-gray-900">{equipment.utilization_percentage}%</span>
                <span className={`ml-2 text-xs font-extrabold px-2 py-0.5 rounded border ${
                  equipment.utilization_category === 'HIGH' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                  equipment.utilization_category === 'NORMAL' ? 'bg-blue-100 text-blue-800 border-blue-300' : 'bg-red-100 text-red-800 border-red-300'
                }`}>
                  {equipment.utilization_category}
                </span>
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
              <span className="text-xs text-gray-600 font-bold flex items-center gap-1.5">
                <Fuel className="w-3.5 h-3.5 text-amber-700" /> Fuel Level & Telemetry
              </span>
              <div className="mt-2 text-xs space-y-1">
                <p><span className="text-gray-500">Current Fuel:</span> <strong className="text-amber-700 font-extrabold">{equipment.fuel_level}%</strong></p>
                <p><span className="text-gray-500">Last Telemetry:</span> <strong className="text-gray-900">{equipment.last_telemetry_updated ? new Date(equipment.last_telemetry_updated).toLocaleTimeString() : 'N/A'}</strong></p>
              </div>
            </div>
          </div>

          {/* Check In / Check Out Action Panel */}
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-4">
            <div className="flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-black" />
              <h4 className="text-sm font-black text-gray-900 uppercase tracking-wide">Check In / Check Out</h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wide font-bold text-gray-700">Equipment ID</label>
                <input
                  value={scanId}
                  onChange={(e) => setScanId(e.target.value)}
                  className="w-full border border-gray-300 bg-white rounded-lg px-3 py-2 text-sm font-medium text-gray-900"
                  placeholder="EQX1001"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wide font-bold text-gray-700">QR Code</label>
                <div className="relative">
                  <QrCode className="w-4 h-4 absolute left-3 top-3 text-gray-500" />
                  <input
                    value={scanQr}
                    onChange={(e) => setScanQr(e.target.value)}
                    className="w-full border border-gray-300 bg-white rounded-lg pl-9 pr-3 py-2 text-sm font-medium text-gray-900"
                    placeholder="CAT-EQX1001"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wide font-bold text-gray-700">Action</label>
                <select
                  value={action}
                  onChange={(e) => setAction(e.target.value as 'checkout' | 'checkin')}
                  className="w-full border border-gray-300 bg-white rounded-lg px-3 py-2 text-sm font-medium text-gray-900"
                >
                  <option value="checkout">Checkout</option>
                  <option value="checkin">Check In</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wide font-bold text-gray-700">Site ID</label>
                <input
                  value={siteId}
                  onChange={(e) => setSiteId(e.target.value)}
                  className="w-full border border-gray-300 bg-white rounded-lg px-3 py-2 text-sm font-medium text-gray-900"
                  placeholder="S003"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wide font-bold text-gray-700">Operator ID</label>
                <input
                  value={operatorId}
                  onChange={(e) => setOperatorId(e.target.value)}
                  className="w-full border border-gray-300 bg-white rounded-lg px-3 py-2 text-sm font-medium text-gray-900"
                  placeholder="OP101"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleSubmitCheckinCheckout}
                disabled={submitting}
                className="px-4 py-2 bg-[#FFCD00] text-black font-black rounded-lg border border-black shadow-sm disabled:opacity-60"
              >
                {submitting ? 'Processing...' : action === 'checkout' ? 'Confirm Checkout' : 'Confirm Check In'}
              </button>
            </div>
          </div>

          {/* Anomaly Recommendation Panel if active */}
          {anomalies.length > 0 && (
            <div className="p-4 bg-orange-50 border border-orange-300 rounded-xl flex items-start gap-3">
              <ShieldAlert className="w-6 h-6 text-orange-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-black text-orange-950 uppercase tracking-wide">
                  SYSTEM ANOMALY DETECTION NOTICE ({anomalies[0].anomaly_type})
                </h4>
                <p className="text-xs text-gray-800 font-semibold mt-1">{anomalies[0].description}</p>
                {anomalies[0].recommendation && (
                  <p className="text-xs text-orange-900 font-medium italic mt-2 border-t border-orange-200 pt-1.5">
                    💡 <strong>System Recommendation:</strong> "{anomalies[0].recommendation}"
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Historical Recharts Visualizations */}
          <div className="space-y-6">
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-black" /> Historical Telemetry Analytics
            </h3>

            {loading ? (
              <div className="h-64 flex items-center justify-center text-gray-500 font-semibold">Loading historical telemetry charts...</div>
            ) : chartData.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-gray-500 font-semibold">No telemetry log history available yet.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Runtime vs Idle Hours Chart */}
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <h4 className="text-xs font-bold text-gray-700 mb-3">Engine Runtime vs. Idle Hours Timeline</h4>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <XAxis dataKey="date" stroke="#64748B" fontSize={10} />
                        <YAxis stroke="#64748B" fontSize={10} />
                        <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#CBD5E1', borderRadius: '8px', color: '#111827' }} />
                        <Legend wrapperStyle={{ fontSize: '11px' }} />
                        <Bar dataKey="engine_hours" name="Engine Hours" fill="#059669" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="idle_hours" name="Idle Hours" fill="#D97706" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Utilization % Trend Chart */}
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <h4 className="text-xs font-bold text-gray-700 mb-3">Equipment Utilization % Trend</h4>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <XAxis dataKey="date" stroke="#64748B" fontSize={10} />
                        <YAxis stroke="#64748B" fontSize={10} domain={[0, 100]} />
                        <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#CBD5E1', borderRadius: '8px', color: '#111827' }} />
                        <Area type="monotone" dataKey="utilization" name="Utilization %" stroke="#FFCD00" fill="#FFCD0066" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
