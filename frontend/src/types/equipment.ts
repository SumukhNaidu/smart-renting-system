export type EquipmentStatus = 'AVAILABLE' | 'ACTIVE' | 'IDLE' | 'OVERDUE' | 'UNASSIGNED' | 'ANOMALY';
export type UtilizationCategory = 'HIGH' | 'NORMAL' | 'LOW';
export type AlertSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface Equipment {
  equipment_id: string;
  qr_code?: string | null;
  equipment_type: string;
  site_id: string | null;
  operator_id: string | null;
  status: EquipmentStatus;
  checkout_date: string | null;
  expected_checkin_date: string | null;
  actual_checkin_date: string | null;
  engine_hours_per_day: number;
  idle_hours_per_day: number;
  total_engine_hours: number;
  total_idle_hours: number;
  operating_days: number;
  fuel_level: number;
  latitude: number | null;
  longitude: number | null;
  utilization_percentage: number;
  utilization_category: UtilizationCategory;
  is_overdue: boolean;
  days_overdue: number | null;
  active_alert_count: number;
  has_anomaly: boolean;
  last_telemetry_updated: string | null;
  created_at: string;
  updated_at: string;
}

export interface DashboardSummary {
  total_equipment: number;
  active_equipment: number;
  idle_equipment: number;
  available_equipment: number;
  overdue_equipment: number;
  unassigned_equipment: number;
  anomaly_equipment: number;
  average_utilization: number;
}

export interface TelemetryRecord {
  telemetry_id: number;
  equipment_id: string;
  timestamp: string;
  latitude: number;
  longitude: number;
  engine_hours: number;
  idle_hours: number;
  fuel_level: number;
  operating_status: string;
  fuel_consumption: number;
  speed: number;
  engine_temperature: number;
  site_id?: string;
  operator_id?: string;
  utilization_percentage: number;
}

export interface AlertItem {
  alert_id: number;
  equipment_id: string;
  alert_type: string;
  severity: AlertSeverity;
  message: string;
  created_at: string;
  acknowledged: boolean;
  resolved: boolean;
  resolved_at: string | null;
}

export interface AnomalyItem {
  anomaly_id: number;
  equipment_id: string;
  telemetry_id: number | null;
  anomaly_type: string;
  anomaly_score: number;
  description: string;
  recommendation: string | null;
  detected_at: string;
  acknowledged: boolean;
  resolved: boolean;
}
