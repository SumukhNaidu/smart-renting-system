# 🔌 Smart Rental Tracking System - REST API Documentation

This backend REST API powers the **Data & Check-In/Check-Out** module of the Smart Rental Tracking System for the Caterpillar Hackathon. 

- **Base URL**: `http://localhost:5000`
- **Data Format**: `application/json`
- **Database Backend**: SQLite (`data/rental_system.db`) via `sql.js` WASM engine.

---

## 📡 API Endpoints Summary

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/equipment` | Fetch list of all equipment with current status & site/operator details |
| `GET` | `/api/equipment/available` | Fetch list of only equipment currently marked `'Available'` |
| `GET` | `/api/equipment/:id` | Fetch single equipment details + full rental & usage history |
| `POST` | `/api/checkout` *(or `/api/check-out`)* | Check out an available machine to a job site and operator |
| `POST` | `/api/checkin` *(or `/api/check-in`)* | Check in a checked-out machine and restock to available inventory |
| `GET` | `/api/sites` | List all construction job sites |
| `GET` | `/api/operators` | List all certified and uncertified equipment operators |
| `GET` | `/api/rental-logs` | Fetch historical & active rental dispatch logs |
| `GET` | `/api/anomalies` | Fetch detected dataset anomalies (missing assignments, idle ratios, overdue) |

---

## 📖 Endpoint Details & Specifications

### 1. `GET /api/equipment`
Returns an array of all fleet equipment units alongside active site and operator assignments.

**Response `200 OK`**:
```json
[
  {
    "equipment_id": "EQX1001",
    "type": "Excavator",
    "model": "Cat 336 Heavy Hydraulic",
    "status": "Checked Out",
    "current_site_id": "S003",
    "rental_rate_per_day": 450.0,
    "site_name": "Riverfront Commercial Hub",
    "site_location": "St. Louis, MO",
    "active_operator_name": "Marcus Vance",
    "check_out_date": "2025-04-01",
    "expected_return_date": "2025-04-16"
  }
]
```

---

### 2. `GET /api/equipment/available`
Filters the fleet to return only machines with status `'Available'` for immediate check-out.

**Response `200 OK`**:
```json
[
  {
    "equipment_id": "EQX1002",
    "type": "Excavator",
    "model": "Cat 320 Medium Hydraulic",
    "status": "Available",
    "current_site_id": null,
    "rental_rate_per_day": 380.0
  }
]
```

---

### 3. `GET /api/equipment/:id`
Fetches comprehensive specifications, current location, complete rental history, and engine usage logs for a single unit.

**Parameters**:
- `:id` (path parameter) – e.g. `/api/equipment/EQX1001`

**Response `200 OK`**:
```json
{
  "equipment_id": "EQX1001",
  "type": "Excavator",
  "model": "Cat 336 Heavy Hydraulic",
  "status": "Checked Out",
  "current_site_id": "S003",
  "site_name": "Riverfront Commercial Hub",
  "site_location": "St. Louis, MO",
  "rental_history": [
    {
      "log_id": 1,
      "check_out_date": "2025-04-01",
      "expected_return_date": "2025-04-16",
      "check_in_date": null,
      "status": "Active",
      "site_name": "Riverfront Commercial Hub",
      "operator_name": "Marcus Vance"
    }
  ],
  "usage_history": [
    {
      "usage_id": 1,
      "log_date": "2025-04-15",
      "engine_hours": 10.0,
      "idle_hours": 15.0,
      "fuel_used": 145.5,
      "location": "St. Louis, MO - S003"
    }
  ]
}
```

**Error Response `404 Not Found`**:
```json
{
  "error": "Equipment with ID 'EQX9999' not found."
}
```

---

### 4. `POST /api/checkout`
Dispatches an available equipment unit to a job site and operator.

**Request Body**:
```json
{
  "equipment_id": "EQX1002",
  "site_id": "S001",
  "operator_id": "OP102",
  "check_out_date": "2026-09-01",
  "expected_return_date": "2026-09-15"
}
```

**Success Response `200 OK`**:
```json
{
  "success": true,
  "message": "EQX1002 checked out to Site S001 (Apex Mining Pit Alpha) successfully!",
  "equipment_id": "EQX1002",
  "site_id": "S001",
  "operator_id": "OP102",
  "check_out_date": "2026-09-01",
  "expected_return_date": "2026-09-15"
}
```

**Error Responses**:
- `404 Not Found`: `{ "error": "Equipment 'EQX999' not found." }`
- `400 Bad Request`: `{ "error": "Validation Error: Cannot check out 'EQX1001' because its status is currently 'Checked Out'." }`

---

### 5. `POST /api/checkin`
Processes the return of a checked-out machine, logs return conditions, and resets status to `'Available'`.

**Request Body**:
```json
{
  "equipment_id": "EQX1001",
  "check_in_date": "2026-09-01",
  "condition_notes": "Returned in excellent working order, oil levels checked",
  "engine_hours": 18.5,
  "idle_hours": 3.0,
  "fuel_used": 125.0
}
```

**Success Response `200 OK`**:
```json
{
  "success": true,
  "message": "EQX1001 checked in successfully and returned to Available fleet!",
  "equipment_id": "EQX1001",
  "check_in_date": "2026-09-01",
  "condition_notes": "Returned in excellent working order, oil levels checked"
}
```

**Error Responses**:
- `404 Not Found`: `{ "error": "Equipment 'EQX999' not found." }`
- `400 Bad Request`: `{ "error": "Validation Error: Cannot check in 'EQX1002' because it is already 'Available'." }`

---

### 6. `GET /api/sites`
Returns all registered construction job sites.

**Response `200 OK`**:
```json
[
  {
    "site_id": "S001",
    "site_name": "Apex Mining Pit Alpha",
    "location": "Peoria, IL",
    "site_manager": "John Miller"
  }
]
```

---

### 7. `GET /api/operators`
Returns all equipment operators.

**Response `200 OK`**:
```json
[
  {
    "operator_id": "OP101",
    "operator_name": "Marcus Vance",
    "contact_number": "+1-555-0143",
    "certified": 1
  }
]
```

---

### 8. `GET /api/anomalies`
Returns detected anomalies for the anomaly detection teammate demo.

**Response `200 OK`**:
```json
{
  "count": 3,
  "anomalies": [
    {
      "anomaly_id": "ANO-S-EQX1007",
      "type": "Missing Site/Operator Assignment",
      "equipment_id": "EQX1007",
      "details": "Equipment EQX1007 is marked 'Checked Out' but lacks a valid Site ID (NULL) or Operator ID (NULL).",
      "severity": "High"
    }
  ]
}
```
