import React, { useState, useEffect } from 'react';
import { 
  Truck, 
  Calendar, 
  User, 
  MapPin, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  Wrench, 
  PlusCircle, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Activity,
  FileText,
  Search,
  RefreshCw,
  X,
  QrCode,
  Check,
  ClipboardList
} from 'lucide-react';

export default function App() {
  const [equipment, setEquipment] = useState([]);
  const [sites, setSites] = useState([]);
  const [operators, setOperators] = useState([]);
  const [rentalLogs, setRentalLogs] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [loading, setLoading] = useState(true);

  // KIOSK MODE STATE: 'CHECK_OUT' vs 'CHECK_IN'
  const [kioskMode, setKioskMode] = useState('CHECK_OUT'); // 'CHECK_OUT' | 'CHECK_IN'
  const [isScanning, setIsScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState('');

  // Notification Toast
  const [toast, setToast] = useState(null); // { type: 'success'|'error', text: '' }

  // Form states for Station
  const todayStr = new Date().toISOString().split('T')[0];
  const defaultReturnStr = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [formState, setFormState] = useState({
    equipment_id: '',
    site_id: '',
    operator_id: '',
    check_out_date: todayStr,
    expected_return_date: defaultReturnStr,
    check_in_date: todayStr,
    condition_notes: 'Returned in good operating condition'
  });

  // Filter Tabs & Search for Grid view below
  const [activeTab, setActiveTab] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('kiosk'); // 'kiosk' | 'cards' | 'logs' | 'raw'

  // Modal State for Quick Add Equipment
  const [showAddModal, setShowAddModal] = useState(false);
  const [addEqForm, setAddEqForm] = useState({
    equipment_id: '',
    type: 'Excavator',
    model: '',
    rental_rate_per_day: '450.00'
  });

  // Fetch Data from Server
  const fetchData = async () => {
    setLoading(true);
    try {
      const [eqRes, sitesRes, opsRes, logsRes, anomalyRes] = await Promise.all([
        fetch('/api/equipment'),
        fetch('/api/sites'),
        fetch('/api/operators'),
        fetch('/api/rental-logs'),
        fetch('/api/anomalies')
      ]);

      if (eqRes.ok) {
        const eqData = await eqRes.json();
        setEquipment(eqData);
      }
      if (sitesRes.ok) setSites(await sitesRes.json());
      if (opsRes.ok) setOperators(await opsRes.json());
      if (logsRes.ok) setRentalLogs(await logsRes.json());
      if (anomalyRes.ok) {
        const data = await anomalyRes.json();
        setAnomalies(data.anomalies || []);
      }
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter equipment by mode for dropdown selection
  const availableEquipment = equipment.filter(e => e.status === 'Available');
  const checkedOutEquipment = equipment.filter(e => e.status === 'Checked Out' || e.status === 'Overdue' || e.status === 'Idle');

  // Auto-set default dropdown selection when switching mode or data updates
  useEffect(() => {
    if (kioskMode === 'CHECK_OUT') {
      if (availableEquipment.length > 0 && !availableEquipment.some(e => e.equipment_id === formState.equipment_id)) {
        setFormState(prev => ({ 
          ...prev, 
          equipment_id: availableEquipment[0].equipment_id,
          site_id: sites[0]?.site_id || 'S001',
          operator_id: operators[0]?.operator_id || 'OP101'
        }));
      }
    } else {
      if (checkedOutEquipment.length > 0 && !checkedOutEquipment.some(e => e.equipment_id === formState.equipment_id)) {
        setFormState(prev => ({ 
          ...prev, 
          equipment_id: checkedOutEquipment[0].equipment_id 
        }));
      }
    }
  }, [kioskMode, equipment]);

  // QR / RFID Scanner Simulation
  const handleSimulateScan = () => {
    setIsScanning(true);
    setScanMessage('Scanning QR/RFID Tag...');

    setTimeout(() => {
      let targetList = kioskMode === 'CHECK_OUT' ? availableEquipment : checkedOutEquipment;

      if (targetList.length === 0) {
        setIsScanning(false);
        setToast({
          type: 'error',
          text: `Scan Failed: No equipment eligible for ${kioskMode === 'CHECK_OUT' ? 'Check-Out' : 'Check-In'}.`
        });
        return;
      }

      // Pick a random equipment item from eligible list
      const randomItem = targetList[Math.floor(Math.random() * targetList.length)];
      setFormState(prev => ({ ...prev, equipment_id: randomItem.equipment_id }));
      setIsScanning(false);

      setToast({
        type: 'success',
        text: `⚡ QR/RFID Tag Scanned! Identified Unit: ${randomItem.equipment_id} (${randomItem.model})`
      });
    }, 1500);
  };

  // Submit Check-Out
  const handleCheckOutSubmit = async (e) => {
    e.preventDefault();
    if (!formState.equipment_id) {
      setToast({ type: 'error', text: 'Please select an available equipment unit to check out.' });
      return;
    }

    // Validation check
    const selected = equipment.find(e => e.equipment_id === formState.equipment_id);
    if (selected && selected.status !== 'Available') {
      setToast({ type: 'error', text: `Validation Error: Equipment ${selected.equipment_id} is already checked out!` });
      return;
    }

    try {
      const res = await fetch('/api/check-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          equipment_id: formState.equipment_id,
          site_id: formState.site_id,
          operator_id: formState.operator_id,
          check_out_date: formState.check_out_date,
          expected_return_date: formState.expected_return_date
        })
      });

      const data = await res.json();
      if (res.ok) {
        setToast({ 
          type: 'success', 
          text: `✅ ${data.message || `${formState.equipment_id} checked out to Site ${formState.site_id} successfully!`}` 
        });
        fetchData();
      } else {
        setToast({ type: 'error', text: data.error || 'Check-Out failed' });
      }
    } catch (err) {
      setToast({ type: 'error', text: 'Server connection error during Check-Out' });
    }
  };

  // Submit Check-In
  const handleCheckInSubmit = async (e) => {
    e.preventDefault();
    if (!formState.equipment_id) {
      setToast({ type: 'error', text: 'Please select a checked-out equipment unit to check in.' });
      return;
    }

    // Validation check
    const selected = equipment.find(e => e.equipment_id === formState.equipment_id);
    if (selected && selected.status === 'Available') {
      setToast({ type: 'error', text: `Validation Error: Equipment ${selected.equipment_id} is already Available!` });
      return;
    }

    try {
      const res = await fetch('/api/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          equipment_id: formState.equipment_id,
          check_in_date: formState.check_in_date,
          condition_notes: formState.condition_notes,
          engine_hours: 15.0,
          idle_hours: 3.0,
          fuel_used: 110.0
        })
      });

      const data = await res.json();
      if (res.ok) {
        setToast({ 
          type: 'success', 
          text: `✅ ${data.message || `${formState.equipment_id} checked in successfully and returned to Available fleet!`}` 
        });
        fetchData();
      } else {
        setToast({ type: 'error', text: data.error || 'Check-In failed' });
      }
    } catch (err) {
      setToast({ type: 'error', text: 'Server connection error during Check-In' });
    }
  };

  // Register New Equipment
  const submitAddEquipment = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/equipment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addEqForm)
      });
      if (res.ok) {
        setShowAddModal(false);
        setAddEqForm({ equipment_id: '', type: 'Excavator', model: '', rental_rate_per_day: '450.00' });
        setToast({ type: 'success', text: `Registered new machine ${addEqForm.equipment_id} successfully!` });
        fetchData();
      } else {
        const err = await res.json();
        setToast({ type: 'error', text: err.error || 'Registration failed' });
      }
    } catch (err) {
      setToast({ type: 'error', text: 'Error connecting to server' });
    }
  };

  // Filtered Equipment List for Grid view
  const filteredEquipment = equipment.filter(eq => {
    const matchesTab = 
      activeTab === 'ALL' ? true :
      activeTab === 'Available' ? eq.status === 'Available' :
      activeTab === 'Checked Out' ? eq.status === 'Checked Out' :
      activeTab === 'Idle' ? eq.status === 'Idle' :
      activeTab === 'Overdue' ? eq.status === 'Overdue' :
      activeTab === 'Maintenance' ? eq.status === 'Maintenance' : true;

    const matchesSearch = 
      eq.equipment_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      eq.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      eq.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (eq.site_name && eq.site_name.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchesTab && matchesSearch;
  });

  // Calculate Summary Stats
  const totalCount = equipment.length;
  const availableCount = equipment.filter(e => e.status === 'Available').length;
  const checkedOutCount = equipment.filter(e => e.status === 'Checked Out').length;
  const overdueCount = equipment.filter(e => e.status === 'Overdue').length;

  const renderBadge = (status) => {
    switch (status) {
      case 'Available':
        return <span className="badge badge-available"><CheckCircle size={13}/> Available</span>;
      case 'Checked Out':
        return <span className="badge badge-checkedout"><ArrowUpRight size={13}/> Checked Out</span>;
      case 'Idle':
        return <span className="badge badge-idle"><Clock size={13}/> Idle</span>;
      case 'Overdue':
        return <span className="badge badge-overdue"><AlertTriangle size={13}/> Overdue</span>;
      case 'Maintenance':
        return <span className="badge badge-maintenance"><Wrench size={13}/> Maintenance</span>;
      default:
        return <span className="badge">{status}</span>;
    }
  };

  return (
    <div className="app-container">
      {/* Top Navbar */}
      <header className="navbar">
        <div className="brand">
          <div className="cat-logo">CAT</div>
          <div className="brand-text">
            <h1>Smart Rental Tracking System</h1>
            <p>Check-In / Check-Out Module • Caterpillar Hackathon</p>
          </div>
        </div>

        <div className="nav-actions">
          <button className="btn btn-secondary btn-sm" onClick={fetchData}>
            <RefreshCw size={14} className={loading ? 'spin' : ''} /> Sync Data
          </button>
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            <PlusCircle size={16} /> Register Equipment
          </button>
        </div>
      </header>

      {/* Toast Notification Banner */}
      {toast && (
        <div className={toast.type === 'success' ? 'toast-success' : 'toast-error'}>
          <span>{toast.text}</span>
          <button style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer' }} onClick={() => setToast(null)}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* KPI Stats Overview */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(255, 205, 0, 0.15)', color: 'var(--cat-yellow)' }}>
            <Truck size={24} />
          </div>
          <div className="stat-info">
            <h3>{totalCount}</h3>
            <p>Total Fleet Units</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
            <CheckCircle size={24} />
          </div>
          <div className="stat-info">
            <h3>{availableCount}</h3>
            <p>Available for Rent</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
            <ArrowUpRight size={24} />
          </div>
          <div className="stat-info">
            <h3>{checkedOutCount}</h3>
            <p>Currently Checked Out</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
            <AlertTriangle size={24} />
          </div>
          <div className="stat-info">
            <h3>{overdueCount}</h3>
            <p>Overdue Rentals</p>
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------------- */}
      {/* 1. DEDICATED FORM-BASED CHECK-IN / CHECK-OUT KIOSK STATION */}
      {/* ----------------------------------------------------------- */}
      <div className="kiosk-panel">
        <div className="kiosk-header">
          <div className="kiosk-title">
            <ClipboardList size={22} color="var(--cat-yellow)" />
            <div>
              <h2>Rental Dispatch & Return Terminal</h2>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Perform instant equipment check-out or check-in operations</p>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="mode-toggle">
            <button 
              className={`mode-btn ${kioskMode === 'CHECK_OUT' ? 'checkout-active' : ''}`}
              onClick={() => { setKioskMode('CHECK_OUT'); setToast(null); }}
            >
              <ArrowUpRight size={16} /> Check Out Mode
            </button>
            <button 
              className={`mode-btn ${kioskMode === 'CHECK_IN' ? 'checkin-active' : ''}`}
              onClick={() => { setKioskMode('CHECK_IN'); setToast(null); }}
            >
              <ArrowDownLeft size={16} /> Check In Mode
            </button>
          </div>
        </div>

        {/* QR/RFID Laser Scanning HUD Overlay during scan */}
        {isScanning && (
          <div className="scanner-overlay">
            <div className="laser-beam"></div>
            <QrCode size={40} color="#60a5fa" style={{ marginBottom: 8 }} />
            <h4 style={{ color: '#60a5fa', fontSize: 16 }}>{scanMessage}</h4>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Simulating RFID/QR Code transponder detection...</p>
          </div>
        )}

        {/* Form Container */}
        {kioskMode === 'CHECK_OUT' ? (
          <form onSubmit={handleCheckOutSubmit}>
            <div className="kiosk-grid">
              {/* Equipment ID Dropdown (Available Only) */}
              <div className="form-group">
                <label>
                  <span>Equipment Unit (Available Only)</span>
                  <button 
                    type="button" 
                    className="btn btn-scan btn-sm"
                    onClick={handleSimulateScan}
                    disabled={isScanning}
                  >
                    <QrCode size={13} /> Scan QR / RFID
                  </button>
                </label>
                <select 
                  className="form-control"
                  value={formState.equipment_id}
                  onChange={(e) => setFormState({ ...formState, equipment_id: e.target.value })}
                  required
                >
                  {availableEquipment.length === 0 ? (
                    <option value="">-- No Equipment Currently Available --</option>
                  ) : (
                    availableEquipment.map(eq => (
                      <option key={eq.equipment_id} value={eq.equipment_id}>
                        {eq.equipment_id} - {eq.model} ({eq.type}) [${eq.rental_rate_per_day}/day]
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Site ID Dropdown */}
              <div className="form-group">
                <label>Destination Job Site</label>
                <select 
                  className="form-control"
                  value={formState.site_id}
                  onChange={(e) => setFormState({ ...formState, site_id: e.target.value })}
                  required
                >
                  {sites.map(s => (
                    <option key={s.site_id} value={s.site_id}>
                      {s.site_id} - {s.site_name} ({s.location})
                    </option>
                  ))}
                </select>
              </div>

              {/* Operator ID Dropdown */}
              <div className="form-group">
                <label>Assigned Operator</label>
                <select 
                  className="form-control"
                  value={formState.operator_id}
                  onChange={(e) => setFormState({ ...formState, operator_id: e.target.value })}
                  required
                >
                  {operators.map(o => (
                    <option key={o.operator_id} value={o.operator_id}>
                      {o.operator_id} - {o.operator_name} {o.certified ? '✓ Certified' : '(Uncertified)'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Check-Out Date */}
              <div className="form-group">
                <label>Check-Out Date</label>
                <input 
                  type="date"
                  className="form-control"
                  value={formState.check_out_date}
                  onChange={(e) => setFormState({ ...formState, check_out_date: e.target.value })}
                  required
                />
              </div>

              {/* Expected Return Date */}
              <div className="form-group">
                <label>Expected Return Date</label>
                <input 
                  type="date"
                  className="form-control"
                  value={formState.expected_return_date}
                  onChange={(e) => setFormState({ ...formState, expected_return_date: e.target.value })}
                  required
                />
              </div>
            </div>

            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                type="submit" 
                className="btn btn-primary"
                style={{ padding: '12px 32px', fontSize: 15 }}
                disabled={availableEquipment.length === 0}
              >
                <ArrowUpRight size={18} /> Confirm & Dispatch Equipment
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleCheckInSubmit}>
            <div className="kiosk-grid">
              {/* Equipment ID Dropdown (Checked Out Only) */}
              <div className="form-group">
                <label>
                  <span>Equipment Unit (Checked Out Only)</span>
                  <button 
                    type="button" 
                    className="btn btn-scan btn-sm"
                    onClick={handleSimulateScan}
                    disabled={isScanning}
                  >
                    <QrCode size={13} /> Scan QR / RFID
                  </button>
                </label>
                <select 
                  className="form-control"
                  value={formState.equipment_id}
                  onChange={(e) => setFormState({ ...formState, equipment_id: e.target.value })}
                  required
                >
                  {checkedOutEquipment.length === 0 ? (
                    <option value="">-- No Equipment Currently Checked Out --</option>
                  ) : (
                    checkedOutEquipment.map(eq => (
                      <option key={eq.equipment_id} value={eq.equipment_id}>
                        {eq.equipment_id} - {eq.model} ({eq.type}) [{eq.site_name || 'Site Unassigned'}]
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Check-In Date */}
              <div className="form-group">
                <label>Check-In Date</label>
                <input 
                  type="date"
                  className="form-control"
                  value={formState.check_in_date}
                  onChange={(e) => setFormState({ ...formState, check_in_date: e.target.value })}
                  required
                />
              </div>

              {/* Condition Notes */}
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label>Equipment Return Condition Notes (Optional)</label>
                <input 
                  type="text"
                  className="form-control"
                  placeholder="e.g. Engine runs smoothly, hydraulic lines clean, minor wear on tracks"
                  value={formState.condition_notes}
                  onChange={(e) => setFormState({ ...formState, condition_notes: e.target.value })}
                />
              </div>
            </div>

            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                type="submit" 
                className="btn btn-secondary"
                style={{ padding: '12px 32px', fontSize: 15, background: '#3b82f6', color: '#fff', borderColor: '#3b82f6' }}
                disabled={checkedOutEquipment.length === 0}
              >
                <ArrowDownLeft size={18} /> Confirm Check-In & Restock
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Anomaly Alert Banner for Anomaly Team Demo */}
      {anomalies.length > 0 && (
        <div className="anomaly-banner">
          <div>
            <div className="anomaly-title">
              <AlertTriangle size={20} color="#f87171" />
              <h4>{anomalies.length} Intentional Data Anomalies Detected (Anomaly Demo Ready)</h4>
            </div>
            <div className="anomaly-chips">
              {anomalies.map(a => (
                <span key={a.anomaly_id} className="anomaly-chip">
                  <strong>[{a.equipment_id}]</strong> {a.type}
                </span>
              ))}
            </div>
          </div>
          <button className="btn btn-outline-danger btn-sm" onClick={() => setViewMode('raw')}>
            View Anomaly Details
          </button>
        </div>
      )}

      {/* Controls Bar & View Mode Switcher */}
      <div className="controls-bar">
        <div className="filter-tabs">
          {['ALL', 'Available', 'Checked Out', 'Idle', 'Overdue', 'Maintenance'].map(tab => (
            <button
              key={tab}
              className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div className="filter-tabs">
            <button className={`tab-btn ${viewMode === 'cards' ? 'active' : ''}`} onClick={() => setViewMode('cards')}>
              <Truck size={14} style={{ display: 'inline', marginRight: 4 }} /> Equipment Grid
            </button>
            <button className={`tab-btn ${viewMode === 'logs' ? 'active' : ''}`} onClick={() => setViewMode('logs')}>
              <FileText size={14} style={{ display: 'inline', marginRight: 4 }} /> Rental Logs
            </button>
            <button className={`tab-btn ${viewMode === 'raw' ? 'active' : ''}`} onClick={() => setViewMode('raw')}>
              <Activity size={14} style={{ display: 'inline', marginRight: 4 }} /> Anomaly & Dataset Export
            </button>
          </div>

          <div>
            <input
              type="text"
              className="search-input"
              placeholder="Search equipment ID, model, site..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* VIEW MODE 1: Equipment Grid */}
      {viewMode === 'cards' && (
        <div className="equipment-grid">
          {filteredEquipment.map(eq => (
            <div key={eq.equipment_id} className="equipment-card">
              <div>
                <div className="card-header">
                  <div>
                    <span className="eq-id">{eq.equipment_id}</span>
                    <h2 className="eq-model">{eq.model}</h2>
                    <p className="eq-type">{eq.type}</p>
                  </div>
                  <div>{renderBadge(eq.status)}</div>
                </div>

                <div className="card-details">
                  <div className="detail-row">
                    <span>Current Site:</span>
                    <span className="detail-value">{eq.site_name || (eq.status === 'Checked Out' ? '❌ NULL (Anomaly)' : 'Unassigned')}</span>
                  </div>
                  {eq.site_location && (
                    <div className="detail-row">
                      <span>Location:</span>
                      <span className="detail-value">{eq.site_location}</span>
                    </div>
                  )}
                  {eq.active_operator_name && (
                    <div className="detail-row">
                      <span>Assigned Operator:</span>
                      <span className="detail-value">{eq.active_operator_name}</span>
                    </div>
                  )}
                  {eq.expected_return_date && (
                    <div className="detail-row">
                      <span>Expected Return:</span>
                      <span className="detail-value" style={{ color: eq.status === 'Overdue' ? '#f87171' : 'inherit' }}>
                        {eq.expected_return_date}
                      </span>
                    </div>
                  )}
                  <div className="detail-row">
                    <span>Rental Rate:</span>
                    <span className="detail-value" style={{ color: 'var(--cat-yellow)' }}>${eq.rental_rate_per_day.toFixed(2)}/day</span>
                  </div>
                </div>
              </div>

              <div className="card-actions">
                {eq.status === 'Available' && (
                  <button className="btn btn-primary btn-sm" style={{ width: '100%' }} onClick={() => {
                    setKioskMode('CHECK_OUT');
                    setFormState(prev => ({ ...prev, equipment_id: eq.equipment_id }));
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}>
                    <ArrowUpRight size={14}/> Check-Out Equipment
                  </button>
                )}
                {(eq.status === 'Checked Out' || eq.status === 'Overdue' || eq.status === 'Idle') && (
                  <button className="btn btn-secondary btn-sm" style={{ width: '100%' }} onClick={() => {
                    setKioskMode('CHECK_IN');
                    setFormState(prev => ({ ...prev, equipment_id: eq.equipment_id }));
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}>
                    <ArrowDownLeft size={14}/> Check-In Equipment
                  </button>
                )}
                {eq.status === 'Maintenance' && (
                  <button className="btn btn-secondary btn-sm" style={{ width: '100%' }} onClick={() => {
                    setKioskMode('CHECK_IN');
                    setFormState(prev => ({ ...prev, equipment_id: eq.equipment_id }));
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}>
                    <Wrench size={14}/> Complete Maintenance
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* VIEW MODE 2: Historical Rental Logs Table */}
      {viewMode === 'logs' && (
        <div className="data-table-container">
          <div className="table-header">
            <h3>Historical Rental & Check-In/Out Logs</h3>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Total Logs: {rentalLogs.length}</span>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Log ID</th>
                <th>Equipment</th>
                <th>Site</th>
                <th>Operator</th>
                <th>Check-Out Date</th>
                <th>Expected Return</th>
                <th>Check-In Date</th>
                <th>Condition Notes</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rentalLogs.map(log => (
                <tr key={log.log_id}>
                  <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--cat-yellow)' }}>#{log.log_id}</td>
                  <td><strong>{log.equipment_id}</strong> ({log.equipment_type})</td>
                  <td>{log.site_name || <span style={{ color: '#f87171' }}>NULL (Anomaly)</span>}</td>
                  <td>{log.operator_name || <span style={{ color: '#f87171' }}>Unassigned</span>}</td>
                  <td>{log.check_out_date}</td>
                  <td>{log.expected_return_date}</td>
                  <td>{log.check_in_date || '—'}</td>
                  <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{log.condition_notes || '—'}</td>
                  <td>{renderBadge(log.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* VIEW MODE 3: Anomaly & Raw Reference Format */}
      {viewMode === 'raw' && (
        <div className="data-table-container">
          <div className="table-header">
            <h3>Intentional Data Anomalies (Anomaly Detection Team Interface)</h3>
          </div>

          <div style={{ display: 'grid', gap: '12px', marginBottom: '28px' }}>
            {anomalies.map(ano => (
              <div key={ano.anomaly_id} style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 12, padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <strong style={{ color: '#f87171' }}>[{ano.anomaly_id}] {ano.type}</strong>
                  <span className="badge badge-overdue">{ano.severity} Severity</span>
                </div>
                <p style={{ fontSize: 13, color: 'var(--text-main)' }}>{ano.details}</p>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>Target Equipment ID: <code>{ano.equipment_id}</code></div>
              </div>
            ))}
          </div>

          <div className="table-header">
            <h3>Reference Text Format Export (Space-Delimited Dataset)</h3>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Reference Schema: <code>EQ_ID Type Site_ID CheckOut_Date Return_Date Days Engine_Hrs Idle_Hrs Operator_ID</code>
          </p>
          <div className="raw-string-box">
{`EQX1001 Excavator S003 2025-04-01 2025-04-16 1.5 10 15 OP101
EQC1001 Crane S001 2025-04-02 2025-04-20 2.0 32.5 4 OP102
EQB1001 Bulldozer S002 2025-03-15 2025-03-30 3.5 64 12 OP103
EQW1001 WheelLoader S004 2025-04-05 2025-04-25 1.8 44 8.5 OP104
EQC1002 Crane S005 2025-04-10 2025-05-01 2.5 50 10 OP105
EQG1002 Grader S002 2025-04-08 2025-04-22 1.2 28 6 OP107
EQB1003 Bulldozer S003 2025-04-03 2025-04-18 4.0 12 148 OP101  <-- [ANOMALY: Excessive Idle 148h vs 12h]
EQC1004 Crane S004 2025-03-01 2025-03-20 5.0 88 22 OP105        <-- [ANOMALY: Overdue >40 days]
EQX1007 Excavator NULL 2025-04-12 2025-04-26 1.0 5 2 NULL       <-- [ANOMALY: NULL Site & Operator]
EQW1003 WheelLoader S005 2025-04-14 2025-04-28 2.2 18 3 OP103`}
          </div>
        </div>
      )}

      {/* MODAL: Register New Equipment */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Register New Equipment Unit</h3>
              <button className="modal-close" onClick={() => setShowAddModal(false)}><X size={20}/></button>
            </div>
            <form onSubmit={submitAddEquipment}>
              <div className="form-group">
                <label>Equipment ID (e.g. EQX1009)</label>
                <input 
                  className="form-control" 
                  type="text" 
                  placeholder="e.g. EQX1009"
                  value={addEqForm.equipment_id}
                  onChange={(e) => setAddEqForm({ ...addEqForm, equipment_id: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Machine Type</label>
                <select 
                  className="form-control"
                  value={addEqForm.type}
                  onChange={(e) => setAddEqForm({ ...addEqForm, type: e.target.value })}
                >
                  <option value="Excavator">Excavator</option>
                  <option value="Crane">Crane</option>
                  <option value="Bulldozer">Bulldozer</option>
                  <option value="Grader">Grader</option>
                  <option value="Wheel Loader">Wheel Loader</option>
                </select>
              </div>
              <div className="form-group">
                <label>Machine Model</label>
                <input 
                  className="form-control" 
                  type="text" 
                  placeholder="e.g. Cat 336 Heavy Hydraulic"
                  value={addEqForm.model}
                  onChange={(e) => setAddEqForm({ ...addEqForm, model: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Daily Rental Rate ($)</label>
                <input 
                  className="form-control" 
                  type="number" 
                  step="10"
                  value={addEqForm.rental_rate_per_day}
                  onChange={(e) => setAddEqForm({ ...addEqForm, rental_rate_per_day: e.target.value })}
                />
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Register Machine</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
