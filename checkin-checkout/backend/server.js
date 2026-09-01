const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const initSqlJs = require('sql.js');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const dbPath = path.join(__dirname, '../../data/rental_system.db');

let SQL;
let db;

// Helper to query objects
function queryObjects(sqlStr, params = []) {
  const stmt = db.prepare(sqlStr);
  if (params && params.length > 0) stmt.bind(params);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

// Helper to execute insert/update and save DB to file
function runExec(sqlStr, params = []) {
  db.run(sqlStr, params);
  saveDb();
}

function saveDb() {
  if (db) {
    const data = db.export();
    fs.writeFileSync(dbPath, Buffer.from(data));
  }
}

// Initialize database WASM engine
initSqlJs().then(instance => {
  SQL = instance;
  if (fs.existsSync(dbPath)) {
    const filebuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(filebuffer);
    console.log('📂 Loaded existing SQLite database from rental_system.db');
  } else {
    db = new SQL.Database();
    console.log('⚠️ Database file not found yet. Run `npm run init-db` in data/ directory first.');
  }

  app.listen(PORT, () => {
    console.log(`🌐 Smart Rental Check-In/Check-Out API server running on http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Failed to initialize sql.js:', err);
});

// ----------------------------------------------------
// 1. Equipment APIs
// ----------------------------------------------------

/**
 * GET /api/equipment
 * List all equipment with current status & current active assignment details.
 */
app.get('/api/equipment', (req, res) => {
  try {
    const query = `
      SELECT 
        e.*,
        s.site_name,
        s.location as site_location,
        s.site_manager,
        rl.log_id as active_log_id,
        rl.operator_id as active_operator_id,
        o.operator_name as active_operator_name,
        rl.check_out_date,
        rl.expected_return_date,
        rl.condition_notes
      FROM equipment e
      LEFT JOIN sites s ON e.current_site_id = s.site_id
      LEFT JOIN rental_logs rl ON e.equipment_id = rl.equipment_id AND rl.status IN ('Active', 'Overdue')
      LEFT JOIN operators o ON rl.operator_id = o.operator_id
      ORDER BY e.equipment_id ASC
    `;
    const equipmentList = queryObjects(query);
    res.json(equipmentList);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/equipment/available
 * List only equipment currently marked 'Available' for check-out.
 */
app.get('/api/equipment/available', (req, res) => {
  try {
    const query = `
      SELECT * FROM equipment 
      WHERE status = 'Available'
      ORDER BY equipment_id ASC
    `;
    const available = queryObjects(query);
    res.json(available);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/equipment/:id
 * Get details of a single equipment unit + its full rental & usage logs history.
 * Returns 404 if equipment_id is not found.
 */
app.get('/api/equipment/:id', (req, res) => {
  try {
    const { id } = req.params;
    const eqList = queryObjects(`
      SELECT 
        e.*,
        s.site_name,
        s.location as site_location,
        s.site_manager
      FROM equipment e
      LEFT JOIN sites s ON e.current_site_id = s.site_id
      WHERE e.equipment_id = ?
    `, [id]);

    if (eqList.length === 0) {
      return res.status(404).json({ error: `Equipment with ID '${id}' not found.` });
    }

    const equipmentItem = eqList[0];

    // Fetch rental history
    const rentalHistory = queryObjects(`
      SELECT 
        rl.*,
        s.site_name,
        o.operator_name
      FROM rental_logs rl
      LEFT JOIN sites s ON rl.site_id = s.site_id
      LEFT JOIN operators o ON rl.operator_id = o.operator_id
      WHERE rl.equipment_id = ?
      ORDER BY rl.log_id DESC
    `, [id]);

    // Fetch usage logs history
    const usageHistory = queryObjects(`
      SELECT * FROM usage_logs
      WHERE equipment_id = ?
      ORDER BY usage_id DESC
    `, [id]);

    res.json({
      ...equipmentItem,
      rental_history: rentalHistory,
      usage_history: usageHistory
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/equipment
 * Register a new equipment unit into the system.
 */
app.post('/api/equipment', (req, res) => {
  try {
    const { equipment_id, type, model, rental_rate_per_day } = req.body;
    if (!equipment_id || !type || !model) {
      return res.status(400).json({ error: 'equipment_id, type, and model are required.' });
    }
    const created_at = new Date().toISOString();
    runExec(
      `INSERT INTO equipment (equipment_id, type, model, status, current_site_id, rental_rate_per_day, created_at)
       VALUES (?, ?, ?, 'Available', NULL, ?, ?)`,
      [equipment_id, type, model, parseFloat(rental_rate_per_day || 150.00), created_at]
    );
    res.status(201).json({ message: 'Equipment registered successfully.', equipment_id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 2. Sites & Operators APIs
// ----------------------------------------------------

/**
 * GET /api/sites
 * List all construction job sites.
 */
app.get('/api/sites', (req, res) => {
  try {
    const sites = queryObjects('SELECT * FROM sites ORDER BY site_id');
    res.json(sites);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/operators
 * List all heavy machinery operators.
 */
app.get('/api/operators', (req, res) => {
  try {
    const operators = queryObjects('SELECT * FROM operators ORDER BY operator_id');
    res.json(operators);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 3. Check-Out API (POST /api/checkout & /api/check-out)
// ----------------------------------------------------

const handleCheckout = (req, res) => {
  try {
    const { equipment_id, site_id, operator_id, check_out_date, expected_return_date } = req.body;

    if (!equipment_id) {
      return res.status(400).json({ error: 'equipment_id is required for check-out.' });
    }

    const eqList = queryObjects('SELECT * FROM equipment WHERE equipment_id = ?', [equipment_id]);
    
    // Error Handling: 404 if equipment_id doesn't exist
    if (eqList.length === 0) {
      return res.status(404).json({ error: `Equipment '${equipment_id}' not found.` });
    }

    const eq = eqList[0];

    // Error Handling: 400 if equipment is not Available (already checked out)
    if (eq.status !== 'Available') {
      return res.status(400).json({ 
        error: `Validation Error: Cannot check out '${equipment_id}' because its status is currently '${eq.status}'.` 
      });
    }

    const outDate = check_out_date || new Date().toISOString().split('T')[0];
    const returnDate = expected_return_date || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // 1. Update Equipment status to 'Checked Out' and set current_site_id
    runExec(
      `UPDATE equipment SET status = 'Checked Out', current_site_id = ? WHERE equipment_id = ?`,
      [site_id || null, equipment_id]
    );

    // 2. Insert into rental_logs table
    runExec(
      `INSERT INTO rental_logs (equipment_id, site_id, operator_id, check_out_date, expected_return_date, check_in_date, status)
       VALUES (?, ?, ?, ?, ?, NULL, 'Active')`,
      [equipment_id, site_id || null, operator_id || null, outDate, returnDate]
    );

    const siteInfo = site_id ? queryObjects('SELECT site_name FROM sites WHERE site_id = ?', [site_id])[0] : null;
    const siteLabel = siteInfo ? `${site_id} (${siteInfo.site_name})` : site_id || 'Unassigned Site';

    res.json({
      success: true,
      message: `${equipment_id} checked out to Site ${siteLabel} successfully!`,
      equipment_id,
      site_id,
      operator_id,
      check_out_date: outDate,
      expected_return_date: returnDate
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Map both /api/checkout and /api/check-out aliases
app.post('/api/checkout', handleCheckout);
app.post('/api/check-out', handleCheckout);

// ----------------------------------------------------
// 4. Check-In API (POST /api/checkin & /api/check-in)
// ----------------------------------------------------

const handleCheckin = (req, res) => {
  try {
    const { equipment_id, check_in_date, condition_notes, engine_hours, idle_hours, fuel_used, location } = req.body;

    if (!equipment_id) {
      return res.status(400).json({ error: 'equipment_id is required for check-in.' });
    }

    const eqList = queryObjects('SELECT * FROM equipment WHERE equipment_id = ?', [equipment_id]);

    // Error Handling: 404 if equipment_id doesn't exist
    if (eqList.length === 0) {
      return res.status(404).json({ error: `Equipment '${equipment_id}' not found.` });
    }

    const eq = eqList[0];

    // Error Handling: 400 if equipment is already Available
    if (eq.status === 'Available') {
      return res.status(400).json({ 
        error: `Validation Error: Cannot check in '${equipment_id}' because it is already 'Available'.` 
      });
    }

    const checkInDateStr = check_in_date || new Date().toISOString().split('T')[0];

    // 1. Update active or overdue rental_logs entry to 'Returned'
    const activeLogs = queryObjects(
      `SELECT * FROM rental_logs WHERE equipment_id = ? AND status IN ('Active', 'Overdue') ORDER BY log_id DESC LIMIT 1`,
      [equipment_id]
    );

    if (activeLogs.length > 0) {
      runExec(
        `UPDATE rental_logs SET check_in_date = ?, condition_notes = ?, status = 'Returned' WHERE log_id = ?`,
        [checkInDateStr, condition_notes || 'Good working condition upon return', activeLogs[0].log_id]
      );
    }

    // 2. Insert Usage Log if hours/fuel provided
    if (engine_hours !== undefined || idle_hours !== undefined) {
      runExec(
        `INSERT INTO usage_logs (equipment_id, log_date, engine_hours, idle_hours, fuel_used, location)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          equipment_id,
          checkInDateStr,
          parseFloat(engine_hours || 0),
          parseFloat(idle_hours || 0),
          parseFloat(fuel_used || 0),
          location || 'Depot Return'
        ]
      );
    }

    // 3. Reset equipment status back to 'Available' and clear current_site_id
    runExec(
      `UPDATE equipment SET status = 'Available', current_site_id = NULL WHERE equipment_id = ?`,
      [equipment_id]
    );

    res.json({
      success: true,
      message: `${equipment_id} checked in successfully and returned to Available fleet!`,
      equipment_id,
      check_in_date: checkInDateStr,
      condition_notes: condition_notes || 'Normal return'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Map both /api/checkin and /api/check-in aliases
app.post('/api/checkin', handleCheckin);
app.post('/api/check-in', handleCheckin);

// ----------------------------------------------------
// 5. Rental Logs History
// ----------------------------------------------------

app.get('/api/rental-logs', (req, res) => {
  try {
    const logs = queryObjects(`
      SELECT 
        rl.*,
        e.type as equipment_type,
        e.model as equipment_model,
        s.site_name,
        o.operator_name
      FROM rental_logs rl
      LEFT JOIN equipment e ON rl.equipment_id = e.equipment_id
      LEFT JOIN sites s ON rl.site_id = s.site_id
      LEFT JOIN operators o ON rl.operator_id = o.operator_id
      ORDER BY rl.log_id DESC
    `);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 6. Anomaly Detection Endpoint
// ----------------------------------------------------

app.get('/api/anomalies', (req, res) => {
  try {
    const anomalies = [];

    const missingAssignments = queryObjects(`
      SELECT e.equipment_id, e.type, e.model, rl.log_id, rl.site_id, rl.operator_id
      FROM equipment e
      JOIN rental_logs rl ON e.equipment_id = rl.equipment_id AND rl.status = 'Active'
      WHERE e.current_site_id IS NULL OR rl.site_id IS NULL OR rl.operator_id IS NULL
    `);

    for (const item of missingAssignments) {
      anomalies.push({
        anomaly_id: `ANO-S-${item.equipment_id}`,
        type: 'Missing Site/Operator Assignment',
        equipment_id: item.equipment_id,
        details: `Equipment ${item.equipment_id} is marked 'Checked Out' but lacks a valid Site ID (${item.site_id || 'NULL'}) or Operator ID (${item.operator_id || 'NULL'}).`,
        severity: 'High'
      });
    }

    const highIdle = queryObjects(`
      SELECT ul.*, e.type, e.model 
      FROM usage_logs ul
      JOIN equipment e ON ul.equipment_id = e.equipment_id
      WHERE ul.idle_hours > (ul.engine_hours * 3.0) AND ul.idle_hours > 20
    `);

    for (const item of highIdle) {
      const ratio = (item.idle_hours / (item.engine_hours || 1)).toFixed(1);
      anomalies.push({
        anomaly_id: `ANO-I-${item.equipment_id}`,
        type: 'Excessive Idle Hours Ratio',
        equipment_id: item.equipment_id,
        details: `Idle hours (${item.idle_hours} hrs) is ${ratio}x higher than engine hours (${item.engine_hours} hrs). Fuel waste alert!`,
        severity: 'Critical'
      });
    }

    const overdue = queryObjects(`
      SELECT rl.*, e.type, e.model
      FROM rental_logs rl
      JOIN equipment e ON rl.equipment_id = e.equipment_id
      WHERE rl.status = 'Overdue'
    `);

    for (const item of overdue) {
      anomalies.push({
        anomaly_id: `ANO-O-${item.equipment_id}`,
        type: 'Overdue Rental Unreturned',
        equipment_id: item.equipment_id,
        details: `Equipment return was expected on ${item.expected_return_date}. Currently unreturned.`,
        severity: 'High'
      });
    }

    res.json({ count: anomalies.length, anomalies });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
