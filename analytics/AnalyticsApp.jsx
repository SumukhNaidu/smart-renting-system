import React, { useState, useEffect } from 'react';
import DateRangeSelector from './components/DateRangeSelector.jsx';
import AnalyticsSummaryCards from './components/AnalyticsSummaryCards.jsx';
import AnalyticsChartsGrid from './components/AnalyticsChartsGrid.jsx';
import DowntimeReportTable from './components/DowntimeReportTable.jsx';
import { 
  fetchAnalyticsData, 
  filterDatasetByDateRange, 
  calculateSummaryMetrics, 
  generateDowntimeReport, 
  getChartData 
} from './analyticsDataService.js';
import { RefreshCw, BarChart2 } from 'lucide-react';

export default function AnalyticsApp() {
  const [rawDataset, setRawDataset] = useState([]);
  const [selectedRange, setSelectedRange] = useState('all');
  const [metrics, setMetrics] = useState({ totalRented: 0, avgUtilizationPct: 0, totalIdleHours: 0, mostUsedType: 'Excavator' });
  const [chartData, setChartData] = useState({ utilizationPerEquipment: [], usagePerSite: [], idleTrend: [], typeDistribution: [] });
  const [downtimeReport, setDowntimeReport] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    const data = await fetchAnalyticsData();
    setRawDataset(data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Update metrics whenever raw dataset or selected date range changes
  useEffect(() => {
    if (rawDataset.length === 0) return;
    const filtered = filterDatasetByDateRange(rawDataset, selectedRange);
    setMetrics(calculateSummaryMetrics(filtered));
    setChartData(getChartData(filtered));
    setDowntimeReport(generateDowntimeReport(filtered));
  }, [rawDataset, selectedRange]);

  return (
    <div className="analytics-module-container">
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10 }}>
            <BarChart2 size={24} color="var(--cat-yellow)" /> Analytics & Performance Reports
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Caterpillar Fleet Utilization, Downtime Analysis & Operational Reports</p>
        </div>

        <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
          <DateRangeSelector selectedRange={selectedRange} onChangeRange={(range) => setSelectedRange(range)} />
          <button className="btn btn-secondary btn-sm" onClick={loadData}>
            <RefreshCw size={13} className={loading ? 'spin' : ''} /> Sync Reports
          </button>
        </div>
      </div>

      {/* 1. Summary Stat Cards */}
      <AnalyticsSummaryCards metrics={metrics} />

      {/* 2. Brand Charts Grid */}
      <AnalyticsChartsGrid chartData={chartData} />

      {/* 3. Downtime Report Table */}
      <DowntimeReportTable downtimeData={downtimeReport} />
    </div>
  );
}
