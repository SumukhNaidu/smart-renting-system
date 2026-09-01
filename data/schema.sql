-- Caterpillar Smart Rental Tracking System Schema
-- Module: Data & Check-In/Check-Out

DROP TABLE IF EXISTS usage_logs;
DROP TABLE IF EXISTS rental_logs;
DROP TABLE IF EXISTS equipment;
DROP TABLE IF EXISTS operators;
DROP TABLE IF EXISTS sites;

-- 1. Sites Table
CREATE TABLE sites (
    site_id TEXT PRIMARY KEY,
    site_name TEXT NOT NULL,
    location TEXT NOT NULL,
    site_manager TEXT NOT NULL
);

-- 2. Operators Table
CREATE TABLE operators (
    operator_id TEXT PRIMARY KEY,
    operator_name TEXT NOT NULL,
    contact_number TEXT NOT NULL,
    certified INTEGER DEFAULT 1
);

-- 3. Equipment Table
CREATE TABLE equipment (
    equipment_id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    model TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('Available', 'Checked Out', 'Idle', 'Overdue', 'Maintenance')),
    current_site_id TEXT,
    rental_rate_per_day REAL NOT NULL DEFAULT 150.00,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(current_site_id) REFERENCES sites(site_id) ON DELETE SET NULL
);

-- 4. Rental Logs Table
CREATE TABLE rental_logs (
    log_id INTEGER PRIMARY KEY AUTOINCREMENT,
    equipment_id TEXT NOT NULL,
    site_id TEXT,
    operator_id TEXT,
    check_out_date TEXT NOT NULL,
    expected_return_date TEXT NOT NULL,
    check_in_date TEXT,
    condition_notes TEXT,
    status TEXT NOT NULL CHECK(status IN ('Active', 'Returned', 'Overdue')),
    FOREIGN KEY(equipment_id) REFERENCES equipment(equipment_id) ON DELETE CASCADE,
    FOREIGN KEY(site_id) REFERENCES sites(site_id) ON DELETE SET NULL,
    FOREIGN KEY(operator_id) REFERENCES operators(operator_id) ON DELETE SET NULL
);

-- 5. Usage Logs Table
CREATE TABLE usage_logs (
    usage_id INTEGER PRIMARY KEY AUTOINCREMENT,
    equipment_id TEXT NOT NULL,
    log_date TEXT NOT NULL,
    engine_hours REAL NOT NULL DEFAULT 0.0,
    idle_hours REAL NOT NULL DEFAULT 0.0,
    fuel_used REAL NOT NULL DEFAULT 0.0,
    location TEXT,
    FOREIGN KEY(equipment_id) REFERENCES equipment(equipment_id) ON DELETE CASCADE
);
