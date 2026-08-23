-- ============================================================================
-- M-FTAMS — Central Database Schema Reversal (001_initial_schema.down.sql)
-- Target: PostgreSQL 15+ with TimescaleDB extension
-- ============================================================================

DROP TABLE IF EXISTS edge_sync_state CASCADE;
DROP TABLE IF EXISTS alerts CASCADE;
DROP TABLE IF EXISTS audit_log CASCADE;
DROP TABLE IF EXISTS gate_transactions CASCADE;
DROP TABLE IF EXISTS trips CASCADE;
DROP TABLE IF EXISTS gate_pass_tokens CASCADE;
DROP TABLE IF EXISTS requisitions CASCADE;
DROP TABLE IF EXISTS drivers CASCADE;
DROP TABLE IF EXISTS vehicles_history CASCADE;
DROP TABLE IF EXISTS vehicles CASCADE;
DROP TABLE IF EXISTS role_change_log CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS gates CASCADE;
DROP TABLE IF EXISTS units CASCADE;

DROP TYPE IF EXISTS edge_status CASCADE;
DROP TYPE IF EXISTS alert_severity CASCADE;
DROP TYPE IF EXISTS alert_type CASCADE;
DROP TYPE IF EXISTS gate_event_type CASCADE;
DROP TYPE IF EXISTS token_status CASCADE;
DROP TYPE IF EXISTS trip_status CASCADE;
DROP TYPE IF EXISTS requisition_status CASCADE;
DROP TYPE IF EXISTS driver_status CASCADE;
DROP TYPE IF EXISTS vehicle_status CASCADE;
DROP TYPE IF EXISTS user_status CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;
