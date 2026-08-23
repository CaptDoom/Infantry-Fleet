# M-FTAMS — Database Schemas & API Contracts Blueprint

**Document Class:** Technical / Unclassified Prototype
**Companion to:** System Architecture & Core Design Document, Security Specification
**Version:** 1.0

---

## 1. Purpose and Scope

This document defines the physical database schemas for both the central PostgreSQL/TimescaleDB store and the embedded edge SQLite store, and the complete API surface (in OpenAPI/Swagger style) exposed by the central server's services. Field types, constraints, and endpoint contracts here are specified at implementation precision, sufficient for a backend team to begin building against without further design decisions on data shape.

---

## 2. Central Database Schema — PostgreSQL 15+ with TimescaleDB

### 2.1 Design Conventions

- All primary keys are `UUID` (generated via `gen_random_uuid()` or application-side UUIDv4), never auto-incrementing integers — this avoids leaking sequential information and simplifies eventual multi-cantonment federation should that ever move in scope.
- All tables include `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`.
- No table used for historical/audit purposes supports `UPDATE` or `DELETE` at the application layer; this is enforced both by omitting those code paths and, where practical, by database-level `REVOKE UPDATE, DELETE` grants on the application role for those specific tables.
- Foreign keys use `ON DELETE RESTRICT` throughout — the system never cascades a delete, consistent with the append-only design philosophy.

### 2.2 `users`

| Column | Type | Constraints |
|---|---|---|
| `user_id` | UUID | PRIMARY KEY |
| `username` | VARCHAR(64) | UNIQUE, NOT NULL |
| `password_hash` | VARCHAR(255) | NOT NULL (bcrypt/argon2id, never reversible encryption) |
| `role` | ENUM('ADMIN','MTO','COMMANDER','SENTRY','DRIVER') | NOT NULL |
| `full_name` | VARCHAR(128) | NOT NULL |
| `assigned_gate_id` | UUID | NULLABLE, FK → `gates.gate_id` (relevant for SENTRY role) |
| `status` | ENUM('ACTIVE','SUSPENDED') | NOT NULL DEFAULT 'ACTIVE' |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT now() |
| `last_login_at` | TIMESTAMPTZ | NULLABLE |

### 2.3 `role_change_log` (append-only)

| Column | Type | Constraints |
|---|---|---|
| `log_id` | UUID | PRIMARY KEY |
| `user_id` | UUID | NOT NULL, FK → `users.user_id` |
| `changed_by` | UUID | NOT NULL, FK → `users.user_id` |
| `previous_role` | ENUM(...) | NOT NULL |
| `new_role` | ENUM(...) | NOT NULL |
| `changed_at` | TIMESTAMPTZ | NOT NULL DEFAULT now() |
| `signature` | VARCHAR(64) | NOT NULL (HMAC-SHA256 hex) |

### 2.4 `vehicles`

| Column | Type | Constraints |
|---|---|---|
| `vehicle_id` | UUID | PRIMARY KEY |
| `registration_number` | VARCHAR(32) | UNIQUE, NOT NULL |
| `vehicle_type` | VARCHAR(64) | NOT NULL |
| `status` | ENUM('AVAILABLE','RESERVED','DISPATCHED','ON_SORTIE','MAINTENANCE') | NOT NULL DEFAULT 'AVAILABLE' |
| `photo_hash` | VARCHAR(64) | NOTNULL (SHA-256 of on-file reference photo, used for edge cross-check) |
| `current_odometer` | INTEGER | NOT NULL DEFAULT 0 |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT now() |
| `updated_at` | TIMESTAMPTZ | NOT NULL DEFAULT now() |

### 2.5 `drivers`

| Column | Type | Constraints |
|---|---|---|
| `driver_id` | UUID | PRIMARY KEY |
| `service_number` | VARCHAR(32) | UNIQUE, NOT NULL |
| `full_name` | VARCHAR(128) | NOT NULL |
| `credential_hash` | VARCHAR(64) | NOT NULL (biometric template hash / smart-card credential hash) |
| `photo_hash` | VARCHAR(64) | NOT NULL |
| `status` | ENUM('ACTIVE','SUSPENDED') | NOT NULL DEFAULT 'ACTIVE' |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT now() |

### 2.6 `requisitions`

| Column | Type | Constraints |
|---|---|---|
| `requisition_id` | UUID | PRIMARY KEY |
| `unit_id` | UUID | NOT NULL, FK → `units.unit_id` |
| `destination` | VARCHAR(256) | NOT NULL |
| `purpose` | TEXT | NOT NULL |
| `planned_distance_km` | NUMERIC(8,2) | NOT NULL |
| `requested_departure` | TIMESTAMPTZ | NOT NULL |
| `expected_return` | TIMESTAMPTZ | NOT NULL |
| `status` | ENUM('SUBMITTED','APPROVED','REJECTED') | NOT NULL DEFAULT 'SUBMITTED' |
| `reviewed_by` | UUID | NULLABLE, FK → `users.user_id` (MTO) |
| `review_reason` | TEXT | NULLABLE (mandatory if `status='REJECTED'`, enforced at application layer) |
| `submitted_at` | TIMESTAMPTZ | NOT NULL DEFAULT now() |
| `reviewed_at` | TIMESTAMPTZ | NULLABLE |

### 2.7 `trips`

| Column | Type | Constraints |
|---|---|---|
| `trip_id` | UUID | PRIMARY KEY |
| `requisition_id` | UUID | NOT NULL, UNIQUE, FK → `requisitions.requisition_id` |
| `vehicle_id` | UUID | NOT NULL, FK → `vehicles.vehicle_id` |
| `driver_id` | UUID | NOT NULL, FK → `drivers.driver_id` |
| `token_id` | UUID | NOT NULL, UNIQUE, FK → `gate_pass_tokens.token_id` |
| `status` | ENUM('DISPATCHED','ON_SORTIE','COMPLETED','COMPLETED_FLAGGED') | NOT NULL DEFAULT 'DISPATCHED' |
| `outbound_odometer` | INTEGER | NULLABLE |
| `inbound_odometer` | INTEGER | NULLABLE |
| `actual_distance_km` | NUMERIC(8,2) | NULLABLE (computed at reconciliation) |
| `deviation_pct` | NUMERIC(5,2) | NULLABLE |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT now() |
| `completed_at` | TIMESTAMPTZ | NULLABLE |

### 2.8 `gate_pass_tokens`

| Column | Type | Constraints |
|---|---|---|
| `token_id` | UUID | PRIMARY KEY |
| `trip_id` | UUID | NOT NULL, UNIQUE |
| `vehicle_id` | UUID | NOT NULL |
| `driver_id` | UUID | NOT NULL |
| `issued_by` | UUID | NOT NULL, FK → `users.user_id` (MTO) |
| `issued_at` | TIMESTAMPTZ | NOT NULL DEFAULT now() |
| `valid_until` | TIMESTAMPTZ | NOT NULL |
| `status` | ENUM('ACTIVE','CONSUMED','REVOKED','EXPIRED') | NOT NULL DEFAULT 'ACTIVE' |
| `signature` | VARCHAR(64) | NOT NULL (HMAC-SHA256 hex) |
| `revoked_by` | UUID | NULLABLE, FK → `users.user_id` |
| `revoked_at` | TIMESTAMPTZ | NULLABLE |
| `revocation_reason` | VARCHAR(256) | NULLABLE |

### 2.9 `gate_transactions` (TimescaleDB hypertable, append-only)

Partitioned on `event_time` for efficient time-range analytics.

| Column | Type | Constraints |
|---|---|---|
| `event_id` | UUID | PRIMARY KEY |
| `edge_id` | VARCHAR(32) | NOT NULL |
| `event_type` | ENUM('OUTBOUND','INBOUND') | NOT NULL |
| `trip_id` | UUID | NOT NULL |
| `vehicle_id` | UUID | NOT NULL |
| `driver_id` | UUID | NOT NULL |
| `token_id` | UUID | NOT NULL |
| `odometer_reading` | INTEGER | NOT NULL |
| `fuel_level_pct` | SMALLINT | NOT NULL CHECK (fuel_level_pct BETWEEN 0 AND 100) |
| `sentry_id` | UUID | NOT NULL, FK → `users.user_id` |
| `event_time` | TIMESTAMPTZ | NOT NULL (hardware timestamp from edge, partition key) |
| `ingested_at` | TIMESTAMPTZ | NOT NULL DEFAULT now() |
| `override_flag` | BOOLEAN | NOT NULL DEFAULT false |
| `override_remarks` | TEXT | NULLABLE (mandatory if `override_flag=true`) |
| `signature` | VARCHAR(64) | NOT NULL |

```sql
SELECT create_hypertable('gate_transactions', 'event_time');
```

### 2.10 `audit_log` (append-only, hash-chained)

| Column | Type | Constraints |
|---|---|---|
| `audit_id` | UUID | PRIMARY KEY |
| `entity_type` | VARCHAR(64) | NOT NULL (e.g. 'requisition', 'token', 'gate_transaction', 'user') |
| `entity_id` | UUID | NOT NULL |
| `action` | VARCHAR(64) | NOT NULL (e.g. 'CREATED','APPROVED','REJECTED','REVOKED','SYNC_CONFLICT_RESOLVED') |
| `actor_id` | UUID | NULLABLE, FK → `users.user_id` (nullable for system-generated entries) |
| `details` | JSONB | NOT NULL |
| `previous_signature` | VARCHAR(64) | NULLABLE (chain reference; null only for the very first entry in the table) |
| `signature` | VARCHAR(64) | NOT NULL |
| `recorded_at` | TIMESTAMPTZ | NOT NULL DEFAULT now() |

### 2.11 `alerts`

| Column | Type | Constraints |
|---|---|---|
| `alert_id` | UUID | PRIMARY KEY |
| `alert_type` | ENUM('OVERDUE_VEHICLE','SYNC_FAILURE','EDGE_OUTAGE','AUDIT_ALERT','SYNC_CONFLICT','CLOCK_SKEW_SUSPECTED') | NOT NULL |
| `related_entity_id` | UUID | NULLABLE |
| `severity` | ENUM('INFO','WARNING','CRITICAL') | NOT NULL |
| `message` | TEXT | NOT NULL |
| `acknowledged_by` | UUID | NULLABLE, FK → `users.user_id` |
| `acknowledged_at` | TIMESTAMPTZ | NULLABLE |
| `raised_at` | TIMESTAMPTZ | NOT NULL DEFAULT now() |

### 2.12 `edge_sync_state`

| Column | Type | Constraints |
|---|---|---|
| `edge_id` | VARCHAR(32) | PRIMARY KEY |
| `gate_id` | UUID | NOT NULL, FK → `gates.gate_id` |
| `last_downlink_at` | TIMESTAMPTZ | NULLABLE |
| `last_uplink_at` | TIMESTAMPTZ | NULLABLE |
| `last_batch_id` | UUID | NULLABLE |
| `clock_skew_seconds` | INTEGER | NULLABLE |
| `status` | ENUM('ONLINE','DEGRADED','OFFLINE') | NOT NULL DEFAULT 'OFFLINE' |

---

## 3. Edge Database Schema — SQLite 3 (Embedded)

The edge schema is intentionally minimal — it mirrors only the subset of central data needed for gate operation, plus the local outbound queue.

### 3.1 `cached_tokens`

| Column | Type | Notes |
|---|---|---|
| `token_id` | TEXT | PRIMARY KEY |
| `trip_id` | TEXT | NOT NULL |
| `vehicle_id` | TEXT | NOT NULL |
| `driver_id` | TEXT | NOT NULL |
| `issued_at` | TEXT | ISO-8601 |
| `valid_until` | TEXT | ISO-8601 |
| `status` | TEXT | 'ACTIVE'\|'CONSUMED'\|'REVOKED' |
| `signature` | TEXT | NOT NULL |
| `snapshot_version` | TEXT | NOT NULL — identifies which downlink snapshot populated this row |

### 3.2 `cached_vehicles`

| Column | Type | Notes |
|---|---|---|
| `vehicle_id` | TEXT | PRIMARY KEY |
| `registration_number` | TEXT | NOT NULL |
| `status` | TEXT | mirrors central enum |
| `photo_hash` | TEXT | NOT NULL |

### 3.3 `cached_drivers`

| Column | Type | Notes |
|---|---|---|
| `driver_id` | TEXT | PRIMARY KEY |
| `credential_hash` | TEXT | NOT NULL |
| `photo_hash` | TEXT | NOT NULL |
| `status` | TEXT | 'ACTIVE'\|'SUSPENDED' |

### 3.4 `cached_blacklist`

| Column | Type | Notes |
|---|---|---|
| `token_id` | TEXT | PRIMARY KEY |
| `revoked_at` | TEXT | ISO-8601 |
| `reason_code` | TEXT | NOT NULL |

### 3.5 `pending_events` (offline transaction queue)

| Column | Type | Notes |
|---|---|---|
| `event_id` | TEXT | PRIMARY KEY |
| `event_type` | TEXT | 'OUTBOUND'\|'INBOUND' |
| `trip_id` | TEXT | NOT NULL |
| `vehicle_id` | TEXT | NOT NULL |
| `driver_id` | TEXT | NOT NULL |
| `token_id` | TEXT | NOT NULL |
| `odometer_reading` | INTEGER | NOT NULL |
| `fuel_level_pct` | INTEGER | NOT NULL |
| `sentry_id` | TEXT | NOT NULL |
| `hardware_timestamp` | TEXT | ISO-8601, set at write time |
| `override_flag` | INTEGER | 0 or 1 |
| `override_remarks` | TEXT | NULLABLE |
| `signature` | TEXT | NOT NULL, computed at write time |
| `sync_status` | TEXT | 'PENDING'\|'ACKNOWLEDGED' |
| `created_at` | TEXT | ISO-8601, local write time |

All writes to `pending_events` are wrapped in a transaction with `PRAGMA synchronous = FULL` to guarantee durability against power loss — a deliberate performance-vs-durability trade favoring durability, consistent with the system's audit-integrity guarantees.

---

## 4. API Contracts (OpenAPI/Swagger Style)

Base path: `/api/v1`. All endpoints require a valid Bearer JWT except `/auth/login`. All responses are JSON. All mutating endpoints require TLS 1.3 and are subject to the RBAC matrix in the Security document.

### 4.1 Authentication Service

```yaml
/auth/login:
  post:
    summary: Authenticate and obtain a session JWT
    requestBody:
      content:
        application/json:
          schema:
            type: object
            required: [username, password]
            properties:
              username: { type: string }
              password: { type: string, format: password }
    responses:
      '200':
        description: Authenticated
        content:
          application/json:
            schema:
              type: object
              properties:
                access_token: { type: string }
                refresh_token: { type: string }
                expires_in: { type: integer, example: 900 }
                role: { type: string, enum: [ADMIN, MTO, COMMANDER, SENTRY, DRIVER] }
      '401':
        description: Invalid credentials

/auth/refresh:
  post:
    summary: Exchange a valid refresh token for a new access token
    requestBody:
      content:
        application/json:
          schema:
            type: object
            required: [refresh_token]
            properties:
              refresh_token: { type: string }
    responses:
      '200': { description: New access token issued }
      '401': { description: Refresh token invalid or expired }

/auth/logout:
  post:
    summary: Invalidate the current session
    responses:
      '204': { description: Session invalidated }
```

### 4.2 Requisition Service

```yaml
/requisitions:
  post:
    summary: Submit a new trip requisition
    security: [{ bearerAuth: [] }]
    requestBody:
      content:
        application/json:
          schema:
            type: object
            required: [destination, purpose, planned_distance_km, requested_departure, expected_return]
            properties:
              destination: { type: string }
              purpose: { type: string }
              planned_distance_km: { type: number, format: float }
              requested_departure: { type: string, format: date-time }
              expected_return: { type: string, format: date-time }
    responses:
      '201': { description: Requisition created, status=SUBMITTED }
      '400': { description: Validation error }

  get:
    summary: List requisitions (scoped by role — MTO sees pending queue, ADMIN sees all, unit sees own)
    parameters:
      - { name: status, in: query, schema: { type: string, enum: [SUBMITTED, APPROVED, REJECTED] } }
    responses:
      '200': { description: List of requisitions }

/requisitions/{requisition_id}:
  get:
    summary: Retrieve a single requisition
    responses:
      '200': { description: Requisition detail }
      '404': { description: Not found }
```

### 4.3 Approval Service

```yaml
/requisitions/{requisition_id}/approve:
  post:
    summary: Approve a requisition and issue a gate-pass token (MTO only)
    security: [{ bearerAuth: [] }]
    requestBody:
      content:
        application/json:
          schema:
            type: object
            required: [vehicle_id, driver_id]
            properties:
              vehicle_id: { type: string, format: uuid }
              driver_id: { type: string, format: uuid }
    responses:
      '200':
        description: Approved; token issued
        content:
          application/json:
            schema:
              type: object
              properties:
                trip_id: { type: string, format: uuid }
                token_id: { type: string, format: uuid }
                valid_until: { type: string, format: date-time }
      '403': { description: Caller is not authorized as MTO }
      '409': { description: Vehicle or driver no longer available }

/requisitions/{requisition_id}/reject:
  post:
    summary: Reject a requisition (MTO only)
    security: [{ bearerAuth: [] }]
    requestBody:
      content:
        application/json:
          schema:
            type: object
            required: [reason]
            properties:
              reason: { type: string }
    responses:
      '200': { description: Rejected }
      '403': { description: Caller is not authorized as MTO }
```

### 4.4 Gate Handshake Service (Edge-Local API, consumed by the Kiosk UI)

```yaml
/gate/scan:
  post:
    summary: Look up a token by scanned tag ID against the local edge cache
    security: [{ bearerAuth: [] }]
    requestBody:
      content:
        application/json:
          schema:
            type: object
            required: [tag_id]
            properties:
              tag_id: { type: string }
    responses:
      '200':
        description: Token found and currently valid
        content:
          application/json:
            schema:
              type: object
              properties:
                token_id: { type: string, format: uuid }
                trip_id: { type: string, format: uuid }
                vehicle_id: { type: string, format: uuid }
                driver_id: { type: string, format: uuid }
                status: { type: string, enum: [ACTIVE, CONSUMED, REVOKED, EXPIRED] }
      '404': { description: No matching token in local cache }

/gate/verify:
  post:
    summary: Submit biometric/smart-card verification result for the bound driver
    security: [{ bearerAuth: [] }]
    requestBody:
      content:
        application/json:
          schema:
            type: object
            required: [token_id, driver_id, verification_method, result]
            properties:
              token_id: { type: string, format: uuid }
              driver_id: { type: string, format: uuid }
              verification_method: { type: string, enum: [FINGERPRINT, SMART_CARD] }
              result: { type: boolean }
    responses:
      '200': { description: Verification recorded }
      '400': { description: Driver/token mismatch }

/gate/handshake:
  post:
    summary: Record a completed outbound or inbound handshake (writes to pending_events)
    security: [{ bearerAuth: [] }]
    requestBody:
      content:
        application/json:
          schema:
            type: object
            required: [token_id, event_type, odometer_reading, fuel_level_pct, sentry_id]
            properties:
              token_id: { type: string, format: uuid }
              event_type: { type: string, enum: [OUTBOUND, INBOUND] }
              odometer_reading: { type: integer }
              fuel_level_pct: { type: integer, minimum: 0, maximum: 100 }
              sentry_id: { type: string, format: uuid }
              override_flag: { type: boolean, default: false }
              override_remarks: { type: string }
    responses:
      '201': { description: Event queued locally, signed, pending sync }
      '409': { description: Token already consumed / invalid state for requested event_type }
```

### 4.5 Synchronization Service

```yaml
/sync/downlink:
  get:
    summary: Retrieve the latest reference-data snapshot for this edge terminal
    security: [{ mutualTLS: [], bearerAuth: [] }]
    parameters:
      - { name: edge_id, in: query, required: true, schema: { type: string } }
      - { name: since_version, in: query, required: false, schema: { type: string } }
    responses:
      '200':
        description: Full snapshot (see Synchronization Protocol document, Section 3.2)
      '304': { description: No newer snapshot than since_version }

/sync/uplink:
  post:
    summary: Submit a batch of pending gate-transaction events
    security: [{ mutualTLS: [], bearerAuth: [] }]
    requestBody:
      content:
        application/json:
          schema:
            type: object
            required: [edge_id, batch_id, events]
            properties:
              edge_id: { type: string }
              batch_id: { type: string, format: uuid }
              hardware_clock_at_generation: { type: string, format: date-time }
              events: { type: array, items: { type: object } }
    responses:
      '200':
        description: Batch processed (partial acceptance possible)
        content:
          application/json:
            schema:
              type: object
              properties:
                accepted_event_ids: { type: array, items: { type: string, format: uuid } }
                rejected_event_ids: { type: array, items: { type: string, format: uuid } }
      '400': { description: Malformed batch }
      '401': { description: Signature validation failed for one or more events; entire batch rejected }
```

### 4.6 Dashboard / Reporting Endpoints (Read-Only, COMMANDER-Accessible)

```yaml
/fleet/status:
  get:
    summary: Real-time status of all vehicles
    responses:
      '200': { description: Array of vehicle status objects }

/fleet/active-sorties:
  get:
    summary: All trips currently ON_SORTIE, with ETA countdowns
    responses:
      '200': { description: Array of active sortie objects }

/alerts:
  get:
    summary: List alerts, filterable by type and severity
    parameters:
      - { name: severity, in: query, schema: { type: string, enum: [INFO, WARNING, CRITICAL] } }
    responses:
      '200': { description: Array of alert objects }

/audit:
  get:
    summary: Query the audit trail (read-only, full history)
    parameters:
      - { name: entity_type, in: query, schema: { type: string } }
      - { name: entity_id, in: query, schema: { type: string, format: uuid } }
      - { name: from, in: query, schema: { type: string, format: date-time } }
      - { name: to, in: query, schema: { type: string, format: date-time } }
    responses:
      '200': { description: Array of audit_log entries }
```
