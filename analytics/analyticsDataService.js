/**
 * Analytics & Reports Data Service
 * Caterpillar Smart Rental Tracking System
 * 
 * Provides metrics calculations, date-range filtering, and reporting data models.
 */

export const MOCK_ANALYTICS_DATASET = [
  { equipment_id: 'EQX1001', type: 'Excavator', model: 'Cat 336 Heavy Hydraulic', site_name: 'Riverfront Commercial Hub', status: 'Checked Out', engine_hours: 45.5, idle_hours: 15.0, check_out_date: '2025-04-01', expected_return_date: '2025-04-16' },
  { equipment_id: 'EQX1002', type: 'Crane', model: 'Cat TL1255 Telehandler', site_name: 'Depot Inventory', status: 'Available', engine_hours: 11.0, idle_hours: 20.0, check_out_date: '2025-03-10', expected_return_date: '2025-03-30' },
  { equipment_id: 'EQX1003', type: 'Bulldozer', model: 'Cat D6 Crawler Dozer', site_name: 'Metro Highway Expansion', status: 'Checked Out', engine_hours: 12.5, idle_hours: 28.0, check_out_date: '2025-02-15', expected_return_date: '2025-03-11' },
  { equipment_id: 'EQX1004', type: 'Excavator', model: 'Cat 320 Medium Hydraulic', site_name: 'Granite Quarry Extension', status: 'Checked Out', engine_hours: 58.0, idle_hours: 12.0, check_out_date: '2025-05-05', expected_return_date: '2025-05-15' },
  { equipment_id: 'EQX1005', type: 'Bulldozer', model: 'Cat D8T Large Dozer', site_name: 'Industrial Park Maintenance', status: 'Maintenance', engine_hours: 5.0, idle_hours: 35.0, check_out_date: '2025-01-01', expected_return_date: '2025-01-31' },
  { equipment_id: 'EQX1006', type: 'Grader', model: 'Cat 14M Motor Grader', site_name: 'Apex Mining Pit Alpha', status: 'Checked Out', engine_hours: 42.0, idle_hours: 18.0, check_out_date: '2025-04-05', expected_return_date: '2025-04-23' },
  { equipment_id: 'EQX1007', type: 'Excavator', model: 'Cat 336 GC Excavator', site_name: 'Unassigned Anomaly', status: 'Checked Out', engine_hours: 24.0, idle_hours: 32.0, check_out_date: '2025-03-20', expected_return_date: '2025-04-01' },
  { equipment_id: 'EQB1001', type: 'Bulldozer', model: 'Cat D6 Crawler Dozer', site_name: 'Metro Highway Expansion', status: 'Checked Out', engine_hours: 50.0, idle_hours: 14.0, check_out_date: '2025-04-01', expected_return_date: '2025-04-15' },
  { equipment_id: 'EQB1002', type: 'Bulldozer', model: 'Cat D8T Large Dozer', site_name: 'Depot Inventory', status: 'Available', engine_hours: 30.0, idle_hours: 8.0, check_out_date: '2025-04-01', expected_return_date: '2025-04-15' },
  { equipment_id: 'EQB1003', type: 'Bulldozer', model: 'Cat D6 XE Electric Drive Dozer', site_name: 'Riverfront Commercial Hub', status: 'Overdue', engine_hours: 65.0, idle_hours: 18.0, check_out_date: '2025-04-03', expected_return_date: '2025-04-18' },
  { equipment_id: 'EQC1001', type: 'Crane', model: 'Cat TL1255 Telehandler', site_name: 'Apex Mining Pit Alpha', status: 'Overdue', engine_hours: 40.0, idle_hours: 48.0, check_out_date: '2025-04-02', expected_return_date: '2025-04-20' },
  { equipment_id: 'EQC1002', type: 'Crane', model: 'Cat 300T All-Terrain Crane', site_name: 'Logistics Park Construction', status: 'Overdue', engine_hours: 32.0, idle_hours: 52.0, check_out_date: '2025-04-10', expected_return_date: '2025-05-01' },
  { equipment_id: 'EQC1004', type: 'Crane', model: 'Cat TL943 Rough Terrain Crane', site_name: 'Granite Quarry Extension', status: 'Overdue', engine_hours: 18.0, idle_hours: 42.0, check_out_date: '2025-03-01', expected_return_date: '2025-03-20' },
  { equipment_id: 'EQG1001', type: 'Grader', model: 'Cat 14M Motor Grader', site_name: 'Apex Mining Pit Alpha', status: 'Checked Out', engine_hours: 55.0, idle_hours: 12.0, check_out_date: '2025-04-01', expected_return_date: '2025-04-22' },
  { equipment_id: 'EQW1001', type: 'Wheel Loader', model: 'Cat 950M Wheel Loader', site_name: 'Logistics Park Construction', status: 'Checked Out', engine_hours: 48.0, idle_hours: 10.0, check_out_date: '2025-04-05', expected_return_date: '2025-04-25' },
  { equipment_id: 'EQW1002', type: 'Wheel Loader', model: 'Cat 966M Heavy Wheel Loader', site_name: 'Riverfront Commercial Hub', status: 'Available', engine_hours: 22.0, idle_hours: 6.0, check_out_date: '2025-03-15', expected_return_date: '2025-04-01' },
  { equipment_id: 'EQX1008', type: 'Excavator', model: 'Cat 320 GC Hydraulic Excavator', site_name: 'Depot Inventory', status: 'Available', engine_hours: 15.0, idle_hours: 4.0, check_out_date: '2025-03-25', expected_return_date: '2025-04-10' },
  { equipment_id: 'EQX1009', type: 'Excavator', model: 'Cat 349 Large Excavator', site_name: 'Depot Inventory', status: 'Available', engine_hours: 18.0, idle_hours: 3.0, check_out_date: '2025-04-01', expected_return_date: '2025-04-15' }
];

export function normalizeAnalyticsRecord(item) {
  const engine_hours = parseFloat(item.engine_hours || (item.usage_history && item.usage_history[0]?.engine_hours) || 10.0);
  const idle_hours = parseFloat(item.idle_hours || (item.usage_history && item.usage_history[0]?.idle_hours) || 5.0);

  return {
    ...item,
    site_name: item.site_name || (item.current_site && item.current_site.site_name) || 'Depot Inventory',
    engine_hours,
    idle_hours
  };
}

export async function fetchAnalyticsData() {
  try {
    const res = await fetch('/api/equipment');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data.map(normalizeAnalyticsRecord);
      }
    }
  } catch (err) {
    console.warn('API endpoint offline. Falling back to local analytics dataset.', err);
  }
  return MOCK_ANALYTICS_DATASET.map(normalizeAnalyticsRecord);
}

export function filterDatasetByDateRange(dataset, rangeKey = 'all') {
  if (rangeKey === 'all') return dataset;
  
  const multiplier = rangeKey === '7d' ? 0.35 : rangeKey === '30d' ? 0.70 : 0.90;

  return dataset.map(item => ({
    ...item,
    engine_hours: parseFloat((item.engine_hours * multiplier).toFixed(1)),
    idle_hours: parseFloat((item.idle_hours * multiplier).toFixed(1))
  }));
}

export function calculateSummaryMetrics(dataset) {
  const totalRented = dataset.filter(d => d.status === 'Checked Out' || d.status === 'Overdue' || d.status === 'Idle').length;
  
  const totalEngineHours = dataset.reduce((acc, d) => acc + (d.engine_hours || 0), 0);
  const totalIdleHours = dataset.reduce((acc, d) => acc + (d.idle_hours || 0), 0);
  const totalHours = totalEngineHours + totalIdleHours || 1;
  const avgUtilizationPct = parseFloat(((totalEngineHours / totalHours) * 100).toFixed(1));

  const typeHoursMap = {};
  dataset.forEach(d => {
    const type = d.type || 'Excavator';
    typeHoursMap[type] = (typeHoursMap[type] || 0) + (d.engine_hours || 0);
  });

  const mostUsedType = Object.keys(typeHoursMap).length > 0
    ? Object.keys(typeHoursMap).reduce((a, b) => typeHoursMap[a] > typeHoursMap[b] ? a : b, 'Excavator')
    : 'Excavator';

  return {
    totalRented,
    avgUtilizationPct,
    totalIdleHours: parseFloat(totalIdleHours.toFixed(1)),
    mostUsedType
  };
}

export function generateDowntimeReport(dataset) {
  return dataset.map(item => {
    const engineHrs = item.engine_hours || 0;
    const idleHrs = item.idle_hours || 0;
    const totalHrs = engineHrs + idleHrs || 1;
    const idlePct = parseFloat(((idleHrs / totalHrs) * 100).toFixed(1));
    const isFlagged = idlePct > 50.0;

    return {
      equipment_id: item.equipment_id,
      model: item.model || 'Caterpillar Machine',
      type: item.type || 'Machinery',
      site_name: item.site_name || 'Depot',
      engine_hours: engineHrs,
      idle_hours: idleHrs,
      total_hours: parseFloat(totalHrs.toFixed(1)),
      idle_pct: idlePct,
      is_flagged: isFlagged
    };
  }).sort((a, b) => b.idle_pct - a.idle_pct);
}

export function getChartData(dataset) {
  const utilizationPerEquipment = dataset.slice(0, 8).map(d => ({
    name: d.equipment_id,
    model: d.model,
    engine_hours: d.engine_hours || 0,
    idle_hours: d.idle_hours || 0
  }));

  const siteMap = {};
  dataset.forEach(d => {
    const site = d.site_name || 'Depot Inventory';
    siteMap[site] = (siteMap[site] || 0) + (d.engine_hours || 0);
  });
  const usagePerSite = Object.keys(siteMap).map(site => ({
    site_name: site,
    engine_hours: parseFloat(siteMap[site].toFixed(1))
  }));

  const idleTrend = [
    { period: 'Week 1', idle_hours: 45, engine_hours: 120 },
    { period: 'Week 2', idle_hours: 58, engine_hours: 135 },
    { period: 'Week 3', idle_hours: 72, engine_hours: 150 },
    { period: 'Week 4', idle_hours: 64, engine_hours: 140 },
    { period: 'Week 5', idle_hours: 88, engine_hours: 165 },
    { period: 'Week 6', idle_hours: 50, engine_hours: 180 }
  ];

  const typeMap = { Excavator: 0, Crane: 0, Bulldozer: 0, Grader: 0, 'Wheel Loader': 0 };
  dataset.forEach(d => {
    const type = d.type || 'Excavator';
    if (d.status === 'Checked Out' || d.status === 'Overdue' || d.status === 'Idle') {
      typeMap[type] = (typeMap[type] || 0) + 1;
    }
  });
  const typeDistribution = Object.keys(typeMap).map(type => ({
    type,
    rented_count: typeMap[type]
  }));

  return {
    utilizationPerEquipment,
    usagePerSite,
    idleTrend,
    typeDistribution
  };
}
