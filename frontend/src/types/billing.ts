export interface EquipmentBilling {
  equipment_id: string;
  equipment_type: string;
  status: string;
  checkout_date?: string;
  expected_checkin_date?: string;
  days_rented: number;
  daily_rate: number;
  base_rent_cost: number;
  is_overdue: boolean;
  days_overdue: number;
  overdue_penalty_rate: number;
  overdue_penalty_cost: number;
  total_idle_hours: number;
  excessive_idle_hours: number;
  idle_penalty_rate: number;
  idle_penalty_cost: number;
  fuel_surcharge: number;
  total_invoice_amount: number;
  currency: string;
}

export interface FleetBillingSummary {
  total_rented_assets: number;
  overdue_asset_count: number;
  total_base_revenue: number;
  total_overdue_penalties: number;
  total_idle_penalties: number;
  total_fleet_revenue: number;
  currency: string;
  items: EquipmentBilling[];
}
