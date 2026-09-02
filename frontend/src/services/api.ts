import axios from 'axios';
import type { Equipment, DashboardSummary, TelemetryRecord, AlertItem, AnomalyItem } from '../types/equipment';

const API_BASE_URL = 'http://localhost:8000/api';

export const api = {
  getDashboardSummary: async (): Promise<DashboardSummary> => {
    const res = await axios.get<DashboardSummary>(`${API_BASE_URL}/dashboard/summary`);
    return res.data;
  },

  getEquipmentList: async (filters?: { status?: string; equipment_type?: string; site_id?: string }): Promise<Equipment[]> => {
    const res = await axios.get<Equipment[]>(`${API_BASE_URL}/equipment`, { params: filters });
    return res.data;
  },

  getEquipmentById: async (id: string): Promise<Equipment> => {
    const res = await axios.get<Equipment>(`${API_BASE_URL}/equipment/${id}`);
    return res.data;
  },

  updateEquipmentCheckinCheckout: async (payload: { equipment_id?: string; qr_code?: string; site_id?: string; operator_id?: string; action: 'checkout' | 'checkin'; expected_checkin_date?: string }): Promise<Equipment> => {
    const res = await axios.post<Equipment>(`${API_BASE_URL}/equipment/checkout`, payload);
    return res.data;
  },

  getTelemetryHistory: async (equipmentId: string, limit = 30, startDate?: string, endDate?: string): Promise<TelemetryRecord[]> => {
    const res = await axios.get<TelemetryRecord[]>(`${API_BASE_URL}/telemetry/${equipmentId}`, {
      params: { limit, start_date: startDate, end_date: endDate }
    });
    return res.data;
  },

  postTelemetry: async (telemetryData: Partial<TelemetryRecord>): Promise<TelemetryRecord> => {
    const res = await axios.post<TelemetryRecord>(`${API_BASE_URL}/telemetry`, telemetryData);
    return res.data;
  },

  // Telemetry Simulator APIs
  getSimulatorStatus: async (): Promise<{ is_running: boolean }> => {
    const res = await axios.get<{ is_running: boolean }>(`${API_BASE_URL}/telemetry/simulator/status`);
    return res.data;
  },

  startSimulator: async (): Promise<any> => {
    const res = await axios.post(`${API_BASE_URL}/telemetry/simulator/start`);
    return res.data;
  },

  stopSimulator: async (): Promise<any> => {
    const res = await axios.post(`${API_BASE_URL}/telemetry/simulator/stop`);
    return res.data;
  },

  triggerSimulatorStep: async (): Promise<any> => {
    const res = await axios.post(`${API_BASE_URL}/telemetry/simulator/step`);
    return res.data;
  },

  triggerExcessiveIdleDemo: async (equipmentId = 'EQX1001'): Promise<any> => {
    const res = await axios.post(`${API_BASE_URL}/telemetry/simulator/trigger-idle`, null, {
      params: { equipment_id: equipmentId }
    });
    return res.data;
  },

  triggerOverdueDemo: async (equipmentId = 'EQX1001'): Promise<any> => {
    const res = await axios.post(`${API_BASE_URL}/telemetry/simulator/trigger-overdue`, null, {
      params: { equipment_id: equipmentId }
    });
    return res.data;
  },

  getAlerts: async (filters?: { equipment_id?: string; severity?: string; acknowledged?: boolean }): Promise<AlertItem[]> => {
    const res = await axios.get<AlertItem[]>(`${API_BASE_URL}/alerts`, { params: filters });
    return res.data;
  },

  acknowledgeAlert: async (alertId: number): Promise<AlertItem> => {
    const res = await axios.patch<AlertItem>(`${API_BASE_URL}/alerts/${alertId}/acknowledge`, { acknowledged: true });
    return res.data;
  },

  resolveAlert: async (alertId: number): Promise<AlertItem> => {
    const res = await axios.patch<AlertItem>(`${API_BASE_URL}/alerts/${alertId}/resolve`, { resolved: true });
    return res.data;
  },

  getAnomalies: async (equipmentId?: string, anomalyType?: string, resolved?: boolean): Promise<AnomalyItem[]> => {
    const res = await axios.get<AnomalyItem[]>(`${API_BASE_URL}/anomalies`, {
      params: {
        ...(equipmentId ? { equipment_id: equipmentId } : {}),
        ...(anomalyType ? { anomaly_type: anomalyType } : {}),
        ...(resolved !== undefined ? { resolved } : {})
      }
    });
    return res.data;
  },

  getAnomalySummary: async (): Promise<any> => {
    const res = await axios.get(`${API_BASE_URL}/anomalies/summary`);
    return res.data;
  },

  triggerAnomalyScan: async (): Promise<AnomalyItem[]> => {
    const res = await axios.post<AnomalyItem[]>(`${API_BASE_URL}/anomalies/detect`);
    return res.data;
  },

  getDemandForecast: async (): Promise<any> => {
    const res = await axios.get(`${API_BASE_URL}/forecast/demand`);
    return res.data;
  },

  trainAnomalyModel: async (): Promise<any> => {
    const res = await axios.post(`${API_BASE_URL}/anomalies/train`);
    return res.data;
  },

  resolveAnomaly: async (anomalyId: number): Promise<AnomalyItem> => {
    const res = await axios.patch<AnomalyItem>(`${API_BASE_URL}/anomalies/${anomalyId}/resolve`);
    return res.data;
  },


  // Billing APIs
  getFleetBillingSummary: async (): Promise<import('../types/billing').FleetBillingSummary> => {
    const res = await axios.get(`${API_BASE_URL}/billing/summary`);
    return res.data;
  },

  getEquipmentBilling: async (equipmentId: string): Promise<import('../types/billing').EquipmentBilling> => {
    const res = await axios.get(`${API_BASE_URL}/billing/${equipmentId}`);
    return res.data;
  }
};
