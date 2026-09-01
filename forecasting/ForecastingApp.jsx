import React, { useState, useEffect } from 'react';
import PrePositioningRollup from './components/PrePositioningRollup.jsx';
import PatternForecastTable from './components/PatternForecastTable.jsx';
import DemandTrendChart from './components/DemandTrendChart.jsx';
import ReallocationRecommendations from './components/ReallocationRecommendations.jsx';
import { 
  fetchForecastingData, 
  generatePatternBasedForecast, 
  calculateMonthlyDemandTrends 
} from './forecastingDataService.js';
import { RefreshCw, TrendingUp } from 'lucide-react';

export default function ForecastingApp() {
  const [data, setData] = useState([]);
  const [forecastOutput, setForecastOutput] = useState({ predictions: [], prePositioningRollup: null });
  const [monthlyTrends, setMonthlyTrends] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    const records = await fetchForecastingData();
    setData(records);
    setForecastOutput(generatePatternBasedForecast(records));
    setMonthlyTrends(calculateMonthlyDemandTrends(records));
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="forecasting-module-container">
      {/* 1. Module Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10 }}>
            <TrendingUp size={24} color="var(--cat-yellow)" /> Demand Forecasting & Pattern Analysis
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Explainable Pattern-Based Machine Demand Predictions for the Next 30 Days</p>
        </div>

        <button className="btn btn-secondary btn-sm" onClick={loadData}>
          <RefreshCw size={13} className={loading ? 'spin' : ''} /> Refresh Pattern Engine
        </button>
      </div>

      {/* 2. Recommended Pre-Positioning Summary Rollup Section */}
      <PrePositioningRollup rollup={forecastOutput.prePositioningRollup} />

      {/* 3. 12-Month Utilization & Seasonal Demand Trend Chart */}
      <DemandTrendChart monthlyData={monthlyTrends} />

      {/* 4. Main Pattern Forecast Table (Next 30 Days Predictions with Confidence Badges) */}
      <PatternForecastTable predictions={forecastOutput.predictions} />
    </div>
  );
}
