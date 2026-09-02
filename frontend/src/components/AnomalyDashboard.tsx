import React, { useState, useEffect } from 'react';
import type { AnomalyItem } from '../types/equipment';
import { api } from '../services/api';
import { ShieldAlert, AlertTriangle, CheckCircle, Zap, RefreshCw, Filter, Check } from 'lucide-react';

interface AnomalyDashboardProps {
  onEquipmentSelect?: (equipmentId: string) => void;
  onAnomalyResolved?: () => void;
  onAnomalyEvent?: (message: string) => void;
}

export const AnomalyDashboard: React.FC<AnomalyDashboardProps> = ({ onEquipmentSelect, onAnomalyResolved, onAnomalyEvent }) => {
  const [anomalies, setAnomalies] = useState<AnomalyItem[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [scanning, setScanning] = useState<boolean>(false);
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [showResolved, setShowResolved] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  const fetchAnomalyData = async () => {
    setLoading(true);
    try {
      const [anomalyList, summaryData] = await Promise.all([
        api.getAnomalies(undefined, typeFilter === 'ALL' ? undefined : typeFilter, showResolved ? undefined : false),
        api.getAnomalySummary()
      ]);
      setAnomalies(anomalyList);
      setSummary(summaryData);
    } catch (err) {
      console.error('Failed to fetch anomaly data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnomalyData();
  }, [typeFilter, showResolved]);

  const handleRunScan = async () => {
    setScanning(true);
    try {
      const newItems = await api.triggerAnomalyScan();
      if (newItems.length > 0) {
        const topIssue = newItems[0];
        onAnomalyEvent?.(`${topIssue.equipment_id} anomaly detected: ${topIssue.description}`);
      }
      setNotification({
        message: `Fleet anomaly scan complete! Detected ${newItems.length} anomaly conditions across fleet.`,
        type: 'success'
      });
      await fetchAnomalyData();
    } catch (err) {
      console.error('Failed to run anomaly scan:', err);
    } finally {
      setScanning(false);
    }
  };

  const handleResolveAnomaly = async (id: number) => {
    try {
      await api.resolveAnomaly(id);
      const resolvedItem = anomalies.find((item) => item.anomaly_id === id);
      setAnomalies(prev => prev.filter(a => a.anomaly_id !== id));
      setNotification({
        message: `Anomaly #${id} marked as resolved. Associated asset status updated.`,
        type: 'success'
      });
      if (resolvedItem) {
        onAnomalyEvent?.(`${resolvedItem.equipment_id} anomaly resolved: ${resolvedItem.description}`);
      }
      fetchAnomalyData();
      onAnomalyResolved?.();
    } catch (err) {
      console.error('Failed to resolve anomaly:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Actions Bar */}
      <div className="bg-white border border-gray-200 p-5 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm relative overflow-hidden">
        <div>
          <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-black" />
            ANOMALY DETECTION
          </h2>
        </div>

        <button
          onClick={handleRunScan}
          disabled={scanning}
          className="flex-1 md:flex-none px-5 py-2.5 bg-[#FFCD00] hover:bg-[#E6B800] text-black text-xs font-black rounded-xl shadow border border-black transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Zap className={`w-4 h-4 text-black ${scanning ? 'animate-bounce' : ''}`} />
          <span>{scanning ? 'Running Scan...' : 'Run Fleet Scan'}</span>
        </button>
      </div>

      {/* Dynamic Notification Toast */}
      {notification && (
        <div className={`p-4 rounded-xl text-xs font-bold border flex items-center justify-between transition-all ${
          notification.type === 'success' ? 'bg-emerald-50 border-emerald-300 text-emerald-900' : 'bg-blue-50 border-blue-300 text-blue-900'
        }`}>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-gray-500 hover:text-black text-sm font-bold">×</button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-xs text-gray-600 font-bold">
            <span>Active Anomalies</span>
            <ShieldAlert className="w-4 h-4 text-red-600" />
          </div>
          <p className="text-2xl font-black text-red-700 mt-2">{summary?.unresolved_count ?? 0}</p>
          <span className="text-[10px] font-semibold text-gray-500">Fleet-wide unresolved</span>
        </div>

        <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-xs text-gray-600 font-bold">
            <span>Excessive Idle</span>
            <AlertTriangle className="w-4 h-4 text-orange-600" />
          </div>
          <p className="text-2xl font-black text-orange-700 mt-2">{summary?.excessive_idle_count ?? 0}</p>
          <span className="text-[10px] font-semibold text-gray-500">&gt; 8.0 idle hrs/day</span>
        </div>

        <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-xs text-gray-600 font-bold">
            <span>Unassigned Machine</span>
            <Filter className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-black text-purple-700 mt-2">{summary?.unassigned_count ?? 0}</p>
          <span className="text-[10px] font-semibold text-gray-500">Running without operator</span>
        </div>
      </div>

      {/* Filter Tabs & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'ALL', label: 'All Anomalies' },
            { id: 'EXCESSIVE_IDLE', label: 'Excessive Idle' },
            { id: 'UNASSIGNED', label: 'Unassigned Active' },
            { id: 'OVERDUE_RETURN', label: 'Overdue Return' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setTypeFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                typeFilter === tab.id
                  ? 'bg-[#FFCD00] text-black border border-black font-black shadow-xs'
                  : 'bg-gray-100 text-gray-800 hover:bg-gray-200 border border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 text-xs text-gray-700 font-bold cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showResolved}
            onChange={(e) => setShowResolved(e.target.checked)}
            className="rounded border-gray-300 bg-gray-100 text-black focus:ring-0"
          />
          <span>Include Resolved</span>
        </label>
      </div>

      {/* Anomaly Cards Grid */}
      {loading ? (
        <div className="flex items-center justify-center p-12 bg-white rounded-2xl border border-gray-200 shadow-sm">
          <RefreshCw className="w-6 h-6 text-black animate-spin" />
          <span className="ml-3 text-xs text-gray-700 font-mono font-bold">Scanning active fleet anomalies...</span>
        </div>
      ) : anomalies.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-gray-200 shadow-sm space-y-3">
          <CheckCircle className="w-12 h-12 text-emerald-600 mx-auto" />
          <h3 className="text-base font-black text-gray-900">No Active Fleet Anomalies Detected</h3>
          <p className="text-xs text-gray-600 max-w-md mx-auto font-medium">
            All equipment operating within normal duty-cycle bounds. Click "Run Fleet Scan" to check the active fleet conditions.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {anomalies.map(a => (
            <div
              key={a.anomaly_id}
              className={`p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-4 shadow-sm ${
                a.resolved
                  ? 'bg-gray-50 border-gray-200 opacity-60'
                  : 'bg-red-50/50 border-red-300 hover:border-red-400'
              }`}
            >
              <div>
                {/* Header Row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => onEquipmentSelect?.(a.equipment_id)}
                      className="px-2.5 py-1 bg-[#FFCD00] hover:bg-[#E6B800] text-black font-black text-xs rounded-md shadow-xs border border-black transition-colors cursor-pointer"
                    >
                      {a.equipment_id}
                    </button>
                    <span className={`px-2.5 py-0.5 text-[11px] font-extrabold rounded-full border ${
                      a.anomaly_type === 'EXCESSIVE_IDLE' ? 'bg-orange-100 text-orange-900 border-orange-300' :
                      a.anomaly_type === 'UNASSIGNED' ? 'bg-purple-100 text-purple-900 border-purple-300' :
                      'bg-red-100 text-red-900 border-red-300'
                    }`}>
                      {a.anomaly_type}
                    </span>
                  </div>

                  <span className="text-[10px] font-mono font-bold text-gray-500">
                    {new Date(a.detected_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {/* Description */}
                <p className="text-xs font-bold text-gray-900 mt-3">
                  {a.description}
                </p>

                {/* AI Recommendation Box */}
                {a.recommendation && (
                  <div className="mt-4 p-3 bg-white border border-amber-300 rounded-xl space-y-1 shadow-xs">
                    <div className="flex items-center gap-1.5 text-[11px] font-black text-black">
                      <CheckCircle className="w-3.5 h-3.5 text-black" />
                      <span>AI Diagnostic Recommendation</span>
                    </div>
                    <p className="text-xs text-gray-800 font-medium leading-relaxed">
                      {a.recommendation}
                    </p>
                  </div>
                )}
              </div>

              {/* Action Footer */}
              <div className="pt-3 border-t border-gray-200 flex items-center justify-between">
                <span className="text-[10px] font-bold text-gray-500">
                  Status: {a.resolved ? 'RESOLVED' : 'ACTIVE ANOMALY'}
                </span>

                {!a.resolved && (
                  <button
                    onClick={() => handleResolveAnomaly(a.anomaly_id)}
                    className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-extrabold transition-colors flex items-center gap-1.5 shadow-xs"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Resolve & Clear</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
