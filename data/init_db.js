const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

const dbPath = path.join(__dirname, 'rental_system.db');
const schemaPath = path.join(__dirname, 'schema.sql');
const sampleDataPath = path.join(__dirname, 'sample_equipment.json');

async function main() {
  console.log('🚀 Initializing Caterpillar Smart Rental Database (sql.js WASM)...');
  const SQL = await initSqlJs();
  const db = new SQL.Database();

  // 1. Read and execute DDL Schema
  console.log('📋 Applying SQL Schema from schema.sql...');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  db.run(schemaSql);

  // 2. Seed Sample Data
  console.log('📦 Seeding sample dataset from sample_equipment.json...');
  const sampleData = JSON.parse(fs.readFileSync(sampleDataPath, 'utf8'));

  // Insert Sites
  for (const s of sampleData.sites) {
    db.run(
      `INSERT INTO sites (site_id, site_name, location, site_manager) VALUES (?, ?, ?, ?)`,
      [s.site_id, s.site_name, s.location, s.site_manager]
    );
  }
  console.log(`  ✓ Inserted ${sampleData.sites.length} sites.`);

  // Insert Operators
  for (const o of sampleData.operators) {
    db.run(
      `INSERT INTO operators (operator_id, operator_name, contact_number, certified) VALUES (?, ?, ?, ?)`,
      [o.operator_id, o.operator_name, o.contact_number, o.certified ? 1 : 0]
    );
  }
  console.log(`  ✓ Inserted ${sampleData.operators.length} operators.`);

  // Insert Equipment
  for (const eq of sampleData.equipment) {
    db.run(
      `INSERT INTO equipment (equipment_id, type, model, status, current_site_id, rental_rate_per_day, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [eq.equipment_id, eq.type, eq.model, eq.status, eq.current_site_id, eq.rental_rate_per_day, eq.created_at]
    );
  }
  console.log(`  ✓ Inserted ${sampleData.equipment.length} equipment items.`);

  // Insert Rental Logs
  for (const rl of sampleData.rental_logs) {
    db.run(
      `INSERT INTO rental_logs (log_id, equipment_id, site_id, operator_id, check_out_date, expected_return_date, check_in_date, condition_notes, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [rl.log_id, rl.equipment_id, rl.site_id, rl.operator_id, rl.check_out_date, rl.expected_return_date, rl.check_in_date, rl.condition_notes || null, rl.status]
    );
  }
  console.log(`  ✓ Inserted ${sampleData.rental_logs.length} rental logs.`);

  // Insert Usage Logs
  for (const ul of sampleData.usage_logs) {
    db.run(
      `INSERT INTO usage_logs (usage_id, equipment_id, log_date, engine_hours, idle_hours, fuel_used, location) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [ul.usage_id, ul.equipment_id, ul.log_date, ul.engine_hours, ul.idle_hours, ul.fuel_used, ul.location]
    );
  }
  console.log(`  ✓ Inserted ${sampleData.usage_logs.length} usage logs.`);

  // Export DB binary buffer and write to disk
  const binaryArray = db.export();
  fs.writeFileSync(dbPath, Buffer.from(binaryArray));
  console.log('✅ Database initialization complete! File saved: rental_system.db');
}

main().catch(console.error);
