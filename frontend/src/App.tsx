import React, { useState, useEffect, useMemo, useRef } from 'react';
import QRCode from 'qrcode';
import type { Equipment, DashboardSummary, AlertItem } from './types/equipment';
import { api } from './services/api';
import { Header } from './components/Header';

interface DealerNotification {
  id: string;
  type: 'overdue' | 'alert' | 'idle' | 'checkin' | 'checkout' | 'anomaly';
  title: string;
  message: string;
  createdAt: string;
}
import { KpiCards } from './components/KpiCards';
import { TelemetryControlPanel } from './components/TelemetryControlPanel';
import { EquipmentTable } from './components/EquipmentTable';
import { EquipmentMap } from './components/EquipmentMap';
import { EquipmentDetailModal } from './components/EquipmentDetailModal';
import { AnomalyDashboard } from './components/AnomalyDashboard';
import { RefreshCw, Activity, Cpu, ArrowRightLeft, LogIn, QrCode, UserRound, TrendingUp, Bot } from 'lucide-react';
import { RentalOperationsPage } from './components/RentalOperationsPage';
import { DemandForecastPanel, type DemandForecastResponse } from './components/DemandForecastPanel';
import { CostImpactPanel } from './components/CostImpactPanel';
import { DealerAssistantPanel } from './components/DealerAssistantPanel';
import type { FleetBillingSummary } from './types/billing';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'OPERATIONS' | 'RENTAL' | 'ANOMALIES' | 'FORECAST'>('OPERATIONS');
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [forecast, setForecast] = useState<DemandForecastResponse | null>(null);
  const [billing, setBilling] = useState<FleetBillingSummary | null>(null);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [forecastLoading, setForecastLoading] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState<string | null>(null);
  const [loginInput, setLoginInput] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [selectedLoginOperator, setSelectedLoginOperator] = useState('OP101');
  const [generatedQrUrl, setGeneratedQrUrl] = useState('');
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [liveNotifications, setLiveNotifications] = useState<DealerNotification[]>([]);
  const [toast, setToast] = useState<{ title: string; message: string; type: string } | null>(null);
  const previousFleetRef = useRef<{ equipmentList: Equipment[]; alerts: AlertItem[] } | null>(null);

  const operatorOptions = useMemo(() => {
    const values = equipmentList
      .map((item) => item.operator_id)
      .filter((value): value is string => Boolean(value));
    const uniqueValues = Array.from(new Set(values)).sort();
    return uniqueValues.length ? uniqueValues : ['OP101'];
  }, [equipmentList]);

  useEffect(() => {
    if (!operatorOptions.includes(selectedLoginOperator)) {
      setSelectedLoginOperator(operatorOptions[0]);
    }
  }, [operatorOptions, selectedLoginOperator]);

  useEffect(() => {
    const payload = `SMART_RENTAL_LOGIN:${selectedLoginOperator}`;
    QRCode.toDataURL(payload)
      .then((url: string) => setGeneratedQrUrl(url))
      .catch(() => setGeneratedQrUrl(''));
  }, [selectedLoginOperator]);

  const fetchDashboardData = async (): Promise<void> => {
    try {
      const [sumRes, eqRes, alertRes, forecastRes, billingRes] = await Promise.all([
        api.getDashboardSummary(),
        api.getEquipmentList(),
        api.getAlerts(),
        api.getDemandForecast(),
        api.getFleetBillingSummary()
      ]);
      setSummary(sumRes);
      setEquipmentList(eqRes);
      setAlerts(alertRes);
      setForecast(forecastRes);
      setBilling(billingRes);
      syncLiveNotifications(eqRes, alertRes);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setForecast(null);
      setBilling(null);
    } finally {
      setLoading(false);
      setForecastLoading(false);
    }
  };

  const refreshFleetData = async (): Promise<void> => {
    setLoading(true);
    setForecastLoading(true);
    await fetchDashboardData();
  };

  useEffect(() => {
    void fetchDashboardData();

    // Setup WebSockets stream connection
    const ws = new WebSocket('ws://localhost:8000/ws');

    ws.onopen = () => {
      console.log('Connected to Caterpillar Telemetry WebSocket server');
      setWsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        console.log('WebSocket stream update:', payload);
        void refreshFleetData();
      } catch (err) {
        console.error('Error parsing WebSocket message:', err);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setWsConnected(false);
    };

    return () => {
      ws.close();
    };
  }, []);

  const pushActivityNotification = (title: string, message: string, type: DealerNotification['type'] = 'alert') => {
    const newItem: DealerNotification = {
      id: `${type}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      type,
      title,
      message,
      createdAt: new Date().toISOString(),
    };

    setLiveNotifications((current) => [newItem, ...current].slice(0, 30));
    setToast({ title, message, type });
    window.setTimeout(() => setToast(null), 3500);
  };

  const syncLiveNotifications = (nextEquipmentList: Equipment[], nextAlerts: AlertItem[]) => {
    const derived: DealerNotification[] = [];

    nextEquipmentList.forEach((equipment) => {
      const overdueDays = equipment.days_overdue ?? 0;

      if (equipment.is_overdue || equipment.status === 'OVERDUE') {
        derived.push({
          id: `overdue-${equipment.equipment_id}`,
          type: 'overdue',
          title: 'Return date exceeded',
          message: `${equipment.equipment_id} exceeded the expected return date by ${overdueDays} day${overdueDays === 1 ? '' : 's'}. Dealer follow-up is required to confirm the machine status and recover the asset.`,
          createdAt: equipment.expected_checkin_date ?? equipment.updated_at ?? new Date().toISOString(),
        });
      }

      if (equipment.status === 'IDLE' && equipment.utilization_percentage < 40) {
        derived.push({
          id: `idle-${equipment.equipment_id}`,
          type: 'idle',
          title: 'Low utilization alert',
          message: `${equipment.equipment_id} is idle with only ${equipment.utilization_percentage}% utilization. This is reducing fleet productivity and should be reassigned or redeployed.`,
          createdAt: equipment.last_telemetry_updated ?? equipment.updated_at ?? new Date().toISOString(),
        });
      }
    });

    nextAlerts
      .filter((alert) => !alert.acknowledged && !alert.resolved)
      .forEach((alert) => {
        derived.push({
          id: `alert-${alert.alert_id}`,
          type: 'alert',
          title: alert.alert_type,
          message: `${alert.equipment_id}: ${alert.message}`,
          createdAt: alert.created_at ?? new Date().toISOString(),
        });
      });

    setLiveNotifications((current) => {
      const nextMap = new Map(derived.map((item) => [item.id, item]));
      const preserved = current.filter((item) => item.type === 'checkin' || item.type === 'checkout' || item.type === 'anomaly');
      const merged = [...derived, ...preserved.filter((item) => !nextMap.has(item.id))];
      const unique = merged.filter((item, index, arr) => arr.findIndex((candidate) => candidate.id === item.id) === index);
      return unique.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 12);
    });

    previousFleetRef.current = { equipmentList: nextEquipmentList, alerts: nextAlerts };
  };

  const dealerNotifications = useMemo<DealerNotification[]>(() => {
    const notifications: DealerNotification[] = [...liveNotifications];

    equipmentList.forEach((equipment) => {
      const overdueDays = equipment.days_overdue ?? 0;

      if (equipment.is_overdue || equipment.status === 'OVERDUE') {
        notifications.push({
          id: `overdue-${equipment.equipment_id}`,
          type: 'overdue',
          title: 'Return date exceeded',
          message: `${equipment.equipment_id} exceeded the expected return date by ${overdueDays} day${overdueDays === 1 ? '' : 's'}. Dealer follow-up is required to confirm the machine status and recover the asset.`,
          createdAt: equipment.expected_checkin_date ?? equipment.updated_at ?? new Date().toISOString(),
        });
      }

      if (equipment.status === 'IDLE' && equipment.utilization_percentage < 40) {
        notifications.push({
          id: `idle-${equipment.equipment_id}`,
          type: 'idle',
          title: 'Low utilization alert',
          message: `${equipment.equipment_id} is idle with only ${equipment.utilization_percentage}% utilization. This is reducing fleet productivity and should be reassigned or redeployed.`,
          createdAt: equipment.last_telemetry_updated ?? equipment.updated_at ?? new Date().toISOString(),
        });
      }
    });

    alerts
      .filter((alert) => !alert.acknowledged && !alert.resolved)
      .forEach((alert) => {
        notifications.push({
          id: `alert-${alert.alert_id}`,
          type: 'alert',
          title: alert.alert_type,
          message: `${alert.equipment_id}: ${alert.message}`,
          createdAt: alert.created_at ?? new Date().toISOString(),
        });
      });

    const uniqueNotifications = notifications.filter(
      (item, index, array) => array.findIndex((candidate) => candidate.id === item.id) === index
    );

    uniqueNotifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return uniqueNotifications;
  }, [equipmentList, alerts, liveNotifications]);

  const unreadAlertCount = dealerNotifications.length;

  const handleLogin = () => {
    const normalizedInput = loginInput.trim().toUpperCase();
    const generatedLoginValue = `SMART_RENTAL_LOGIN:${selectedLoginOperator}`.toUpperCase();

    if (!normalizedInput) {
      setLoginError('Enter an operator ID or scan the generated QR code to log in.');
      return;
    }

    const validById = operatorOptions.some((operator) => operator.toUpperCase() === normalizedInput);
    const validByQr = normalizedInput === generatedLoginValue;

    if (validById || validByQr) {
      setLoggedInUser(normalizedInput.replace('SMART_RENTAL_LOGIN:', ''));
      setLoginError(null);
      return;
    }

    setLoginError('That operator ID or QR login value was not recognized.');
  };

  const logout = () => {
    setLoggedInUser(null);
    setLoginInput('');
    setLoginError(null);
  };

  if (!loggedInUser) {
    return (
      <div className="min-h-screen bg-[#F4F5F7] flex items-center justify-center p-6">
        <div className="w-full max-w-5xl rounded-3xl border border-gray-200 bg-white shadow-xl overflow-hidden">
          <div className="flex items-center justify-between bg-[#FFCD00] px-6 py-4 border-b border-black">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-black/70">Smart Rental Access</p>
              <h1 className="text-2xl font-black text-black">Operator Login</h1>
            </div>
            <div className="rounded-full bg-black p-2 text-[#FFCD00]">
              <LogIn className="w-5 h-5" />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-8 p-6 md:p-8">
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-[0.2em] font-black text-gray-700">Operator ID</label>
                <div className="relative">
                  <UserRound className="w-4 h-4 absolute left-3 top-3 text-gray-500" />
                  <input
                    value={loginInput}
                    onChange={(event) => setLoginInput(event.target.value)}
                    placeholder="Enter OP101 or scan QR"
                    className="w-full rounded-xl border border-gray-300 bg-white pl-9 pr-3 py-3 text-base font-medium text-gray-900 focus:border-black focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-[0.2em] font-black text-gray-700">Select Operator</label>
                <select
                  value={selectedLoginOperator}
                  onChange={(event) => setSelectedLoginOperator(event.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-base font-medium text-gray-900 focus:border-black focus:outline-none"
                >
                  {operatorOptions.map((operator) => (
                    <option key={operator} value={operator}>{operator}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleLogin}
                  className="flex-1 rounded-xl bg-[#FFCD00] border border-black px-5 py-3 text-sm font-black text-black shadow-sm"
                >
                  Login with ID or QR
                </button>
              </div>

              {loginError && (
                <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
                  {loginError}
                </div>
              )}
            </div>

            <div className="space-y-4 rounded-2xl border border-gray-200 bg-gray-50 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] font-black text-gray-700">Generated QR</p>
                  <h2 className="text-xl font-black text-gray-900">Login Token</h2>
                </div>
                <div className="rounded-full bg-white border border-gray-300 p-2">
                  <QrCode className="w-5 h-5 text-gray-700" />
                </div>
              </div>

              {generatedQrUrl ? (
                <div className="flex justify-center rounded-2xl border border-gray-200 bg-white p-4">
                  <img src={generatedQrUrl} alt="Login QR code" className="w-56 h-56 rounded-xl" />
                </div>
              ) : (
                <div className="flex h-56 items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white text-sm font-medium text-gray-500">
                  Generating QR...
                </div>
              )}

              <div className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700">
                <span className="font-black text-gray-900">Value:</span> {`SMART_RENTAL_LOGIN:${selectedLoginOperator}`}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F5F7] text-gray-900 flex flex-col font-sans selection:bg-[#FFCD00] selection:text-black">
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-[#FFCD00] border border-black p-2">
            <UserRound className="w-4 h-4 text-black" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] font-black text-gray-500">Operator session</p>
            <h2 className="text-sm font-black text-gray-900">Logged in as {loggedInUser}</h2>
          </div>
        </div>

        <button
          onClick={logout}
          className="rounded-xl border border-gray-300 bg-gray-100 px-3 py-2 text-xs font-black text-gray-800"
        >
          Log out
        </button>
      </div>

      {/* Caterpillar Header */}
      <Header
        unreadAlertCount={unreadAlertCount}
        onOpenNotifications={() => setNotificationOpen((open) => !open)}
        wsConnected={wsConnected}
      />

      {toast && (
        <div className="fixed right-5 top-20 z-[60] w-[360px] max-w-[calc(100vw-2rem)] rounded-2xl border border-black bg-white shadow-2xl px-4 py-3">
          <div className="mb-1 flex items-center justify-between gap-3">
            <span className="rounded-full bg-[#FFCD00] px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.16em] text-black">
              {toast.type}
            </span>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="text-xs font-black text-gray-700"
            >
              Close
            </button>
          </div>
          <p className="text-sm font-black text-gray-900">{toast.title}</p>
          <p className="mt-1 text-sm text-gray-700">{toast.message}</p>
        </div>
      )}

      {notificationOpen && (
        <div className="fixed right-5 top-20 z-50 w-[380px] max-w-[calc(100vw-2rem)] rounded-2xl border border-gray-200 bg-white shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-gray-200 bg-[#FFCD00] px-4 py-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] font-black text-black/70">Dealer alerts</p>
              <h3 className="text-lg font-black text-black">Open fleet notifications</h3>
            </div>
            <button
              type="button"
              onClick={() => setNotificationOpen(false)}
              className="rounded-full border border-black bg-white px-2 py-1 text-xs font-black text-black"
            >
              Close
            </button>
          </div>

          <div className="max-h-[420px] overflow-y-auto p-3 space-y-3 bg-gray-50">
            {dealerNotifications.length > 0 ? (
              dealerNotifications.map((notification) => (
                <div key={notification.id} className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.15em] ${
                      notification.type === 'overdue'
                        ? 'bg-red-100 text-red-700'
                        : notification.type === 'idle'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-blue-100 text-blue-700'
                    }`}>
                      {notification.type}
                    </span>
                    <span className="text-[10px] font-bold text-gray-500">
                      {new Date(notification.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <p className="text-sm font-black text-gray-900">{notification.title}</p>
                  <p className="mt-1 text-sm leading-5 text-gray-700">{notification.message}</p>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-gray-300 bg-white px-4 py-6 text-sm font-medium text-gray-600">
                No dealer-side alerts are open right now.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 p-4 md:p-6 space-y-6 max-w-[1600px] w-full mx-auto">
        {/* Top Control & Navigation Bar */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-3.5 rounded-xl border border-gray-200 shadow-sm">
          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-xl border border-gray-300 flex-wrap">
            <button
              onClick={() => setActiveTab('OPERATIONS')}
              className={`px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-2 ${
                activeTab === 'OPERATIONS'
                  ? 'bg-[#FFCD00] text-black border border-black shadow-xs'
                  : 'text-gray-700 hover:text-black hover:bg-gray-200 font-bold'
              }`}
            >
              <Activity className="w-4 h-4 text-black" />
              <span>Fleet Operations & Map</span>
            </button>

            <button
              onClick={() => setActiveTab('RENTAL')}
              className={`px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-2 ${
                activeTab === 'RENTAL'
                  ? 'bg-[#FFCD00] text-black border border-black shadow-xs'
                  : 'text-gray-700 hover:text-black hover:bg-gray-200 font-bold'
              }`}
            >
              <ArrowRightLeft className="w-4 h-4 text-black" />
              <span>Check-In / Check-Out</span>
            </button>

            <button
              onClick={() => setActiveTab('ANOMALIES')}
              className={`px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-2 relative ${
                activeTab === 'ANOMALIES'
                  ? 'bg-[#FFCD00] text-black border border-black shadow-xs'
                  : 'text-gray-700 hover:text-black hover:bg-gray-200 font-bold'
              }`}
            >
              <Cpu className="w-4 h-4 text-black" />
              <span>AI Anomaly & Diagnostics</span>
              {summary && summary.anomaly_equipment > 0 && (
                <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping absolute top-1.5 right-1.5" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('FORECAST')}
              className={`px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-2 ${
                activeTab === 'FORECAST'
                  ? 'bg-[#FFCD00] text-black border border-black shadow-xs'
                  : 'text-gray-700 hover:text-black hover:bg-gray-200 font-bold'
              }`}
            >
              <TrendingUp className="w-4 h-4 text-black" />
              <span>Demand Forecast</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => { void refreshFleetData(); }}
              className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 text-xs font-bold rounded-lg border border-gray-300 transition-colors flex items-center gap-2 shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-black ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Fleet Data</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Fleet Operations & Telemetry */}
        {activeTab === 'OPERATIONS' && (
          <div className="space-y-6">
            {/* Telemetry Simulator Control Panel */}
            <TelemetryControlPanel onTelemetryUpdated={fetchDashboardData} />

            {/* Dynamic KPI Cards Section */}
            <KpiCards
              summary={summary}
              activeFilter={statusFilter}
              onFilterChange={setStatusFilter}
            />

            {/* Map & Equipment Split Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Leaflet Map (5 cols) */}
              <div className="lg:col-span-5">
                <EquipmentMap
                  equipmentList={equipmentList}
                  onSelectEquipment={setSelectedEquipment}
                />
              </div>

              {/* Searchable Equipment Table (7 cols) */}
              <div className="lg:col-span-7">
                <EquipmentTable
                  equipmentList={equipmentList}
                  onSelectEquipment={setSelectedEquipment}
                  statusFilter={statusFilter}
                  setStatusFilter={setStatusFilter}
                />
              </div>
            </div>

            <div className="pt-2">
              <CostImpactPanel billing={billing} loading={loading} />
            </div>
          </div>
        )}

        {activeTab === 'RENTAL' && (
          <RentalOperationsPage
            equipmentList={equipmentList}
            onRefresh={fetchDashboardData}
          />
        )}

        {/* Tab 2: Module 3 AI Anomaly & Diagnostics */}
        {activeTab === 'ANOMALIES' && (
          <AnomalyDashboard
            onEquipmentSelect={(id) => {
              const eq = equipmentList.find(e => e.equipment_id === id);
              if (eq) setSelectedEquipment(eq);
            }}
            onAnomalyResolved={fetchDashboardData}
            onAnomalyEvent={(message) => pushActivityNotification('Anomaly detected', message, 'anomaly')}
          />
        )}

        {activeTab === 'FORECAST' && (
          <DemandForecastPanel forecast={forecast} loading={forecastLoading} />
        )}
      </main>

      <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
        {assistantOpen && (
          <div className="w-[420px] max-w-[calc(100vw-2rem)] shadow-2xl">
            <DealerAssistantPanel equipmentList={equipmentList} alerts={alerts} billing={billing} forecast={forecast} />
          </div>
        )}

        <button
          type="button"
          onClick={() => setAssistantOpen((open) => !open)}
          className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-[#FFCD00] text-black shadow-lg transition-all hover:scale-105"
          aria-label="Open dealer assistant"
          title="Open AI Fleet Assistant"
        >
          <Bot className="h-7 w-7" />
        </button>
      </div>

      {/* Equipment Detail Modal */}
      {selectedEquipment && (
        <EquipmentDetailModal
          equipment={selectedEquipment}
          onClose={() => setSelectedEquipment(null)}
          onAfterUpdate={refreshFleetData}
          onLifecycleEvent={(action, equipmentId) => {
            const title = action === 'checkin' ? 'Equipment checked in' : 'Equipment checked out';
            const message = `${equipmentId} was successfully ${action === 'checkin' ? 'checked in' : 'checked out'} and updated in the dealer fleet log.`;
            pushActivityNotification(title, message, action === 'checkin' ? 'checkin' : 'checkout');
          }}
        />
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 text-gray-600 text-xs px-6 py-4 text-center font-bold">
        <p>CATERPILLAR • Smart Rental Tracking System (Official Corporate Palette)</p>
      </footer>
    </div>
  );
};

export default App;
