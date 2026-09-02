import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Radio, Play, Square, Zap, AlertTriangle, Clock } from 'lucide-react';

interface TelemetryControlPanelProps {
  onTelemetryUpdated: () => void;
}

export const TelemetryControlPanel: React.FC<TelemetryControlPanelProps> = ({ onTelemetryUpdated }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const checkStatus = async () => {
    try {
      const res = await api.getSimulatorStatus();
      setIsRunning(res.is_running);
    } catch (err) {
      console.error('Failed to get simulator status:', err);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  const handleToggleSimulator = async () => {
    setLoading(true);
    try {
      if (isRunning) {
        await api.stopSimulator();
        setIsRunning(false);
        setStatusMessage('Telemetry Auto-Simulator Paused.');
      } else {
        await api.startSimulator();
        setIsRunning(true);
        setStatusMessage('Telemetry Auto-Simulator Started (Stream cycle every 3s).');
      }
    } catch (err) {
      setStatusMessage('Error toggling telemetry simulator.');
    } finally {
      setLoading(false);
    }
  };

  const handleManualStep = async () => {
    setLoading(true);
    try {
      const res = await api.triggerSimulatorStep();
      setStatusMessage(`Manual step generated telemetry update for ${res.updated_count || 0} equipment items.`);
      onTelemetryUpdated();
    } catch (err) {
      setStatusMessage('Failed to execute telemetry step.');
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerIdle = async () => {
    setLoading(true);
    try {
      await api.triggerExcessiveIdleDemo('EQX1001');
      setStatusMessage(`⚠️ DEMO: Excessive idle surge applied to EQX1001 (12 hrs idle/day).`);
      onTelemetryUpdated();
    } catch (err) {
      setStatusMessage('Failed to trigger idle scenario.');
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerOverdue = async () => {
    setLoading(true);
    try {
      await api.triggerOverdueDemo('EQX1001');
      setStatusMessage(`🚨 DEMO: Rental return date set to past for EQX1001 (3 days overdue).`);
      onTelemetryUpdated();
    } catch (err) {
      setStatusMessage('Failed to trigger overdue scenario.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-3">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Header Title */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#FFCD00]/20 border border-[#FFCD00] rounded-lg text-black">
            <Radio className={`w-5 h-5 ${isRunning ? 'animate-pulse text-emerald-600' : 'text-gray-900'}`} />
          </div>
          <div>
            <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
              TELEMETRY SIMULATOR ENGINE
            </h3>
            <p className="text-xs text-gray-500 font-medium">
              Generates correlated physical telemetry (runtime, idle, fuel burn, GPS coordinates)
            </p>
          </div>
        </div>

        {/* Live Status & Main Start/Stop Controls */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Simulator Toggle Button */}
          <button
            onClick={handleToggleSimulator}
            disabled={loading}
            className={`px-3.5 py-2 rounded-lg font-extrabold text-xs flex items-center gap-2 transition-all shadow ${
              isRunning
                ? 'bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
          >
            {isRunning ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span>{isRunning ? 'Pause Telemetry Generator' : 'Start Auto Telemetry Stream'}</span>
          </button>

          {/* Single Step Trigger */}
          <button
            onClick={handleManualStep}
            disabled={loading}
            className="px-3.5 py-2 bg-[#FFCD00] hover:bg-[#E6B800] text-black text-xs font-bold rounded-lg border border-black transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Zap className="w-3.5 h-3.5 text-black" />
            <span>Generate 1 Step</span>
          </button>
        </div>
      </div>

      {/* Demo Scenario Quick Trigger Bar */}
      <div className="pt-2 border-t border-gray-200 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-gray-500 font-bold uppercase text-[10px] tracking-wider">Demo Scenarios:</span>
          <button
            onClick={handleTriggerIdle}
            disabled={loading}
            className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded font-bold transition-colors flex items-center gap-1"
          >
            <Clock className="w-3 h-3 text-amber-600" />
            <span>Simulate Excessive Idle (EQX1001)</span>
          </button>
          <button
            onClick={handleTriggerOverdue}
            disabled={loading}
            className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-900 border border-red-300 rounded font-bold transition-colors flex items-center gap-1"
          >
            <AlertTriangle className="w-3 h-3 text-red-600" />
            <span>Simulate Rental Overdue (EQX1001)</span>
          </button>
        </div>

        {statusMessage && (
          <span className="text-xs font-mono text-gray-900 bg-amber-100 px-2.5 py-1 rounded border border-amber-300 font-semibold animate-fade-in">
            {statusMessage}
          </span>
        )}
      </div>
    </div>
  );
};
