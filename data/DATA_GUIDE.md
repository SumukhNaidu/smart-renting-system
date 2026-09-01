# 📚 Smart Rental Tracking System - Data Guide

This data guide accompanies the exported dataset (`combined_dataset.json` & `sample_equipment.json`) and database schema (`schema.sql`). It is designed for team members building the **Dashboard**, **Alerts / Anomaly Detection**, and **Forecasting** modules.

---

## 📁 Dataset Files Overview

1. **`data/combined_dataset.json`**: Single consolidated JSON file containing all equipment, sites, operators, historical rental logs, usage logs, and intentional anomaly flags. Can be directly imported without a database server.
2. **`data/sample_equipment.json`**: Original structured sample dataset + raw reference space-delimited text strings.
3. **`data/schema.sql`**: SQLite relational schema DDL definition.
4. **`data/rental_system.db`**: Generated SQLite database file.

---

## 🗂️ Data Schema & Field Definitions

### 1. `equipment`
Represents physical Caterpillar machinery in the rental fleet.

| Field Name | Type | Description |
| :--- | :--- | :--- |
| `equipment_id` | `TEXT` *(Primary Key)* | Unique identifier string (e.g., `EQX1001`, `EQB1003`). Prefixes: `EQX` = Excavator, `EQC` = Crane, `EQB` = Bulldozer, `EQG` = Grader, `EQW` = Wheel Loader. |
| `type` | `TEXT` | Machinery classification (`Excavator`, `Crane`, `Bulldozer`, `Grader`, `Wheel Loader`). |
| `model` | `TEXT` | Specific Cat model name (e.g., `Cat 336 Heavy Hydraulic`, `Cat D6 XE Electric Drive`). |
| `status` | `TEXT` *(CHECK)* | Current operational status of the machine. **Allowed Values**: `'Available'`, `'Checked Out'`, `'Idle'`, `'Overdue'`, `'Maintenance'`. |
| `current_site_id` | `TEXT` *(Foreign Key)* | References `sites.site_id` where the machine is currently deployed. `NULL` if available or in depot. |
| `rental_rate_per_day` | `REAL` | Daily rental fee in USD (e.g. `450.00`). |
| `created_at` | `DATETIME` | ISO 8601 registration timestamp. |

#### 💡 Possible `status` Values in `equipment`:
- **`Available`**: Equipment is parked at depot and ready for immediate check-out.
- **`Checked Out`**: Equipment is actively leased and dispatched to a job site.
- **`Idle`**: Equipment is checked out to a site but currently inactive / non-operational.
- **`Overdue`**: Equipment return date has passed without check-in.
- **`Maintenance`**: Equipment is in workshop undergoing scheduled repair/service.

---

### 2. `sites`
Represents active construction, mining, and quarry job sites.

| Field Name | Type | Description |
| :--- | :--- | :--- |
| `site_id` | `TEXT` *(Primary Key)* | Unique site identifier (e.g., `S001`, `S002`, `S003`). |
| `site_name` | `TEXT` | Descriptive project name (e.g., `Apex Mining Pit Alpha`, `Metro Highway Expansion`). |
| `location` | `TEXT` | City/State location (e.g., `Peoria, IL`, `St. Louis, MO`). |
| `site_manager` | `TEXT` | Contact name of the site supervisor. |

---

### 3. `operators`
Represents heavy equipment operators.

| Field Name | Type | Description |
| :--- | :--- | :--- |
| `operator_id` | `TEXT` *(Primary Key)* | Unique operator identifier (e.g., `OP101`, `OP102`). |
| `operator_name` | `TEXT` | Full name of the operator. |
| `contact_number` | `TEXT` | Phone number. |
| `certified` | `INTEGER / BOOLEAN` | Certification flag (`1` / `true` = Certified, `0` / `false` = Uncertified). |

---

### 4. `rental_logs`
Logs equipment check-out and check-in transactions over time.

| Field Name | Type | Description |
| :--- | :--- | :--- |
| `log_id` | `INTEGER` *(Primary Key)* | Auto-incrementing log ID. |
| `equipment_id` | `TEXT` *(Foreign Key)* | Target equipment ID. |
| `site_id` | `TEXT` *(Foreign Key)* | Target construction site ID (may be `NULL` in data anomalies). |
| `operator_id` | `TEXT` *(Foreign Key)* | Assigned operator ID (may be `NULL` in data anomalies). |
| `check_out_date` | `TEXT` | Date machine was checked out (`YYYY-MM-DD`). |
| `expected_return_date` | `TEXT` | Agreed return date (`YYYY-MM-DD`). |
| `check_in_date` | `TEXT` | Actual return date (`YYYY-MM-DD`), or `NULL` if active. |
| `condition_notes` | `TEXT` | Optional return inspection notes. |
| `status` | `TEXT` *(CHECK)* | Rental status. **Allowed Values**: `'Active'`, `'Returned'`, `'Overdue'`. |

#### 💡 Possible `status` Values in `rental_logs`:
- **`Active`**: Rental currently ongoing on field.
- **`Returned`**: Equipment checked back in and rental closed.
- **`Overdue`**: Expected return date passed; unreturned.

---

### 5. `usage_logs`
Logs telematics engine hours, idle hours, and fuel consumption.

| Field Name | Type | Description |
| :--- | :--- | :--- |
| `usage_id` | `INTEGER` *(Primary Key)* | Auto-incrementing log ID. |
| `equipment_id` | `TEXT` *(Foreign Key)* | Target equipment ID. |
| `log_date` | `TEXT` | Telematics reading date (`YYYY-MM-DD`). |
| `engine_hours` | `REAL` | Total active engine operating hours logged. |
| `idle_hours` | `REAL` | Total engine idle hours logged (key metric for fuel efficiency/theft detection). |
| `fuel_used` | `REAL` | Total fuel consumed in Liters. |
| `location` | `TEXT` | GPS location tag. |

---

## 🚨 Intentional Data Anomalies (For Anomaly Detection Testing)

The sample dataset includes **3 intentional anomalies** specifically placed for the Anomaly Detection team to test rule engines and ML classifiers:

### Anomaly 1: Missing Site/Operator Assignment
- **Target Item**: `EQX1007` (Cat 336 GC Excavator)
- **Table**: `equipment` & `rental_logs` (Log ID `#9`)
- **Description**: Machine status is `'Checked Out'`, but `current_site_id` is `NULL` and `rental_logs` record has `site_id = NULL` & `operator_id = NULL`.
- **Detection Logic**:
  ```sql
  SELECT * FROM equipment e 
  LEFT JOIN rental_logs rl ON e.equipment_id = rl.equipment_id AND rl.status = 'Active'
  WHERE e.status = 'Checked Out' AND (e.current_site_id IS NULL OR rl.site_id IS NULL OR rl.operator_id IS NULL);
  ```

---

### Anomaly 2: Excessive Idle Hours Ratio (Fuel Waste / Theft Alert)
- **Target Item**: `EQB1003` (Cat D6 XE Electric Drive Dozer)
- **Table**: `usage_logs` (Usage ID `#4`)
- **Description**: Machine logged **148.0 idle hours** against only **12.0 engine hours** (**12.3x ratio, 92.5% idle time**). Indicates engine left idling indefinitely or fuel theft.
- **Detection Logic**:
  ```sql
  SELECT *, (idle_hours / MAX(engine_hours, 1.0)) AS idle_ratio 
  FROM usage_logs 
  WHERE idle_hours > (engine_hours * 3.0) AND idle_hours > 20.0;
  ```

---

### Anomaly 3: Overdue Unreturned Rental
- **Target Item**: `EQC1004` (Cat TL943 Crane)
- **Table**: `rental_logs` (Log ID `#8`)
- **Description**: Machine checked out on `2025-03-01` with expected return `2025-03-20`. Still unreturned (`>40 days overdue`).
- **Detection Logic**:
  ```sql
  SELECT * FROM rental_logs 
  WHERE status = 'Overdue' OR (status = 'Active' AND expected_return_date < CURRENT_DATE);
  ```

---

## 📥 How Teammates Can Load `combined_dataset.json`

### In React / Web Frontend:
```javascript
import dataset from './data/combined_dataset.json';

const allEquipment = dataset.equipment;
const anomalies = dataset.intentional_anomalies;
const availableUnits = dataset.equipment.filter(e => e.status === 'Available');
```

### In Python / Data Science / ML (Anomaly & Forecasting):
```python
import json

with open('data/combined_dataset.json', 'r') as f:
    data = json.load(f)

equipment_df = data['equipment']
rental_logs = data['rental_logs']
usage_logs = data['usage_logs']
anomalies = data['intentional_anomalies']
```
