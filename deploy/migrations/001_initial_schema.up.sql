-- ============================================================================
-- M-FTAMS — Central Database Schema Migration (001_initial_schema.up.sql)
-- Target: PostgreSQL 15+ with TimescaleDB extension
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "timescaledb" CASCADE;

-- ----------------------------------------------------------------------------
-- ENUM TYPES
-- ----------------------------------------------------------------------------

CREATE TYPE user_role AS ENUM (
    'ADMIN',
    'MTO',
    'COMMANDER',
    'SENTRY',
    'DRIVER'
);

CREATE TYPE user_status AS ENUM (
    'ACTIVE',
    'SUSPENDED'
);

CREATE TYPE vehicle_status AS ENUM (
    'AVAILABLE',
    'RESERVED',
    'DISPATCHED',
    'ON_SORTIE',
    'MAINTENANCE'
);

CREATE TYPE driver_status AS ENUM (
    'ACTIVE',
    'SUSPENDED'
);

CREATE TYPE requisition_status AS ENUM (
    'SUBMITTED',
    'APPROVED',
    'REJECTED'
);

CREATE TYPE trip_status AS ENUM (
    'DISPATCHED',
    'ON_SORTIE',
    'COMPLETED',
    'COMPLETED_FLAGGED'
);

CREATE TYPE token_status AS ENUM (
    'ACTIVE',
    'CONSUMED',
    'REVOKED',
    'EXPIRED'
);

CREATE TYPE gate_event_type AS ENUM (
    'OUTBOUND',
    'INBOUND'
);

CREATE TYPE alert_type AS ENUM (
    'OVERDUE_VEHICLE',
    'SYNC_FAILURE',
    'EDGE_OUTAGE',
    'AUDIT_ALERT',
    'SYNC_CONFLICT',
    'CLOCK_SKEW_SUSPECTED'
);

CREATE TYPE alert_severity AS ENUM (
    'INFO',
    'WARNING',
    'CRITICAL'
);

CREATE TYPE edge_status AS ENUM (
    'ONLINE',
    'DEGRADED',
    'OFFLINE'
);

-- ----------------------------------------------------------------------------
-- 1. UNITS & GATES (Organizational Infrastructure)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS units (
    unit_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    unit_name VARCHAR(128) UNIQUE NOT NULL,
    parent_formation VARCHAR(128) NOT NULL,
    cantonment_zone VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS gates (
    gate_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gate_identifier VARCHAR(32) UNIQUE NOT NULL, -- e.g. 'MAIN', 'NORTH', 'SOUTH'
    location_description VARCHAR(256) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 2. USERS & ROLE AUDIT LOG
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(64) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL, -- bcrypt/argon2id
    role user_role NOT NULL,
    full_name VARCHAR(128) NOT NULL,
    assigned_gate_id UUID NULL REFERENCES gates(gate_id) ON DELETE RESTRICT,
    status user_status NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_login_at TIMESTAMPTZ NULL
);

-- Append-only log of all role modifications
CREATE TABLE IF NOT EXISTS role_change_log (
    log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    changed_by UUID NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    previous_role user_role NOT NULL,
    new_role user_role NOT NULL,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    signature VARCHAR(64) NOT NULL -- HMAC-SHA256 hex
);

-- ----------------------------------------------------------------------------
-- 3. VEHICLES & DRIVERS (Master Registry)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS vehicles (
    vehicle_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    registration_number VARCHAR(32) UNIQUE NOT NULL,
    vehicle_type VARCHAR(64) NOT NULL,
    status vehicle_status NOT NULL DEFAULT 'AVAILABLE',
    photo_hash VARCHAR(64) NOT NULL, -- SHA-256 of reference photo for edge verification
    current_odometer INTEGER NOT NULL DEFAULT 0,
    rfid_tag_id VARCHAR(64) UNIQUE NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Append-only vehicle history for Last-Write-Wins (LWW) conflict audit
CREATE TABLE IF NOT EXISTS vehicles_history (
    history_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id UUID NOT NULL REFERENCES vehicles(vehicle_id) ON DELETE RESTRICT,
    registration_number VARCHAR(32) NOT NULL,
    vehicle_type VARCHAR(64) NOT NULL,
    status vehicle_status NOT NULL,
    photo_hash VARCHAR(64) NOT NULL,
    current_odometer INTEGER NOT NULL,
    hardware_timestamp TIMESTAMPTZ NOT NULL,
    superseded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS drivers (
    driver_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_number VARCHAR(32) UNIQUE NOT NULL,
    full_name VARCHAR(128) NOT NULL,
    credential_hash VARCHAR(64) NOT NULL, -- Biometric template / smart-card credential hash
    photo_hash VARCHAR(64) NOT NULL, -- SHA-256 of photo
    smart_card_id VARCHAR(64) UNIQUE NULL,
    status driver_status NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 4. REQUISITIONS, TOKENS, TRIPS (Sortie Lifecycle)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS requisitions (
    requisition_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    unit_id UUID NOT NULL REFERENCES units(unit_id) ON DELETE RESTRICT,
    destination VARCHAR(256) NOT NULL,
    purpose TEXT NOT NULL,
    planned_distance_km NUMERIC(8,2) NOT NULL,
    requested_departure TIMESTAMPTZ NOT NULL,
    expected_return TIMESTAMPTZ NOT NULL,
    status requisition_status NOT NULL DEFAULT 'SUBMITTED',
    reviewed_by UUID NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    review_reason TEXT NULL, -- Mandatory if status = 'REJECTED'
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    reviewed_at TIMESTAMPTZ NULL
);

CREATE TABLE IF NOT EXISTS gate_pass_tokens (
    token_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID NOT NULL UNIQUE, -- Assigned during approval
    vehicle_id UUID NOT NULL REFERENCES vehicles(vehicle_id) ON DELETE RESTRICT,
    driver_id UUID NOT NULL REFERENCES drivers(driver_id) ON DELETE RESTRICT,
    issued_by UUID NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    valid_until TIMESTAMPTZ NOT NULL,
    status token_status NOT NULL DEFAULT 'ACTIVE',
    signature VARCHAR(64) NOT NULL, -- HMAC-SHA256 hex
    revoked_by UUID NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    revoked_at TIMESTAMPTZ NULL,
    revocation_reason VARCHAR(256) NULL
);

CREATE TABLE IF NOT EXISTS trips (
    trip_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    requisition_id UUID NOT NULL UNIQUE REFERENCES requisitions(requisition_id) ON DELETE RESTRICT,
    vehicle_id UUID NOT NULL REFERENCES vehicles(vehicle_id) ON DELETE RESTRICT,
    driver_id UUID NOT NULL REFERENCES drivers(driver_id) ON DELETE RESTRICT,
    token_id UUID NOT NULL UNIQUE REFERENCES gate_pass_tokens(token_id) ON DELETE RESTRICT,
    status trip_status NOT NULL DEFAULT 'DISPATCHED',
    outbound_odometer INTEGER NULL,
    inbound_odometer INTEGER NULL,
    actual_distance_km NUMERIC(8,2) NULL,
    deviation_pct NUMERIC(5,2) NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ NULL
);

-- ----------------------------------------------------------------------------
-- 5. GATE TRANSACTIONS (TimescaleDB Hypertable, Append-Only)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS gate_transactions (
    event_id UUID NOT NULL,
    edge_id VARCHAR(32) NOT NULL,
    event_type gate_event_type NOT NULL,
    trip_id UUID NOT NULL,
    vehicle_id UUID NOT NULL,
    driver_id UUID NOT NULL,
    token_id UUID NOT NULL,
    odometer_reading INTEGER NOT NULL,
    fuel_level_pct SMALLINT NOT NULL CHECK (fuel_level_pct BETWEEN 0 AND 100),
    sentry_id UUID NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    event_time TIMESTAMPTZ NOT NULL, -- Hardware timestamp from edge terminal (Partition Key)
    ingested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    override_flag BOOLEAN NOT NULL DEFAULT false,
    override_remarks TEXT NULL,
    signature VARCHAR(64) NOT NULL, -- HMAC-SHA256 hex from edge terminal
    CONSTRAINT pk_gate_transactions PRIMARY KEY (event_id, event_time)
);

-- Convert to TimescaleDB hypertable partitioned by event_time
SELECT create_hypertable('gate_transactions', 'event_time', if_not_exists => TRUE);

-- Create unique index on event_id for DB-level sync idempotency
CREATE UNIQUE INDEX IF NOT EXISTS idx_gate_transactions_event_id ON gate_transactions (event_id);

-- ----------------------------------------------------------------------------
-- 6. AUDIT LOG (Cryptographic Hash-Chained, Append-Only)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS audit_log (
    audit_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(64) NOT NULL,
    entity_id UUID NOT NULL,
    action VARCHAR(64) NOT NULL,
    actor_id UUID NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    details JSONB NOT NULL,
    previous_signature VARCHAR(64) NULL, -- Chain reference (null only for genesis record)
    signature VARCHAR(64) NOT NULL, -- HMAC-SHA256 hex
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_recorded_at ON audit_log (recorded_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log (entity_type, entity_id);

-- ----------------------------------------------------------------------------
-- 7. ALERTS & EDGE SYNC STATE
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS alerts (
    alert_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alert_type alert_type NOT NULL,
    related_entity_id UUID NULL,
    severity alert_severity NOT NULL,
    message TEXT NOT NULL,
    acknowledged_by UUID NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    acknowledged_at TIMESTAMPTZ NULL,
    raised_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_alerts_raised_at ON alerts (raised_at);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts (severity);

CREATE TABLE IF NOT EXISTS edge_sync_state (
    edge_id VARCHAR(32) PRIMARY KEY,
    gate_id UUID NOT NULL REFERENCES gates(gate_id) ON DELETE RESTRICT,
    last_downlink_at TIMESTAMPTZ NULL,
    last_uplink_at TIMESTAMPTZ NULL,
    last_batch_id UUID NULL,
    clock_skew_seconds INTEGER NULL,
    status edge_status NOT NULL DEFAULT 'OFFLINE'
);

-- ----------------------------------------------------------------------------
-- INDEXES FOR PERFORMANCE (<100ms typical queries)
-- ----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles (status);
CREATE INDEX IF NOT EXISTS idx_requisitions_status ON requisitions (status);
CREATE INDEX IF NOT EXISTS idx_trips_status ON trips (status);
CREATE INDEX IF NOT EXISTS idx_gate_pass_tokens_status ON gate_pass_tokens (status);
CREATE INDEX IF NOT EXISTS idx_gate_pass_tokens_trip ON gate_pass_tokens (trip_id);
