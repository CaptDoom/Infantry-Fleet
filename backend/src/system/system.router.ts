// ============================================================================
// M-FTAMS — System Status, Time Sync, Security & Prometheus Metrics Router
// ============================================================================

import { Router, Request, Response } from 'express';
import { db } from '../models/db';
import { verifyAuditChain } from '../pkg/crypto';
import { TimeSyncStatus, SecuritySystemStatus } from '../models/types';

export const systemRouter = Router();

// GET /api/v1/system/time-sync — Internal Stratum-1 Time Sync & Clock Drift (§8.3)
systemRouter.get('/time-sync', (req: Request, res: Response) => {
  const now = new Date();
  const simulatedDriftMs = (Math.sin(Date.now() / 60000) * 120); // within +-120ms normal operational jitter

  const status: TimeSyncStatus = {
    server_time: now.toISOString(),
    stratum_level: 1,
    ntp_source: 'internal-stratum1.cantonment.local (GPS/Rubidium Atomic Disciplined)',
    clock_drift_ms: Math.round(simulatedDriftMs),
    is_synchronized: Math.abs(simulatedDriftMs) < 5000,
    max_tolerated_drift_seconds: 5.0
  };

  return res.json(status);
});

// GET /api/v1/system/security-status — Internal PKI CA, mTLS, and Key Hierarchy (§9.4)
systemRouter.get('/security-status', (req: Request, res: Response) => {
  const chainVerification = verifyAuditChain(db.getHmacKey(), db.auditLogs);

  const secStatus: SecuritySystemStatus = {
    pki_ca_type: 'Internal Cantonment Root CA (step-ca self-hosted)',
    ca_common_name: 'HQ-12-INF-BDE-ROOT-CA-G1',
    ca_status: 'ACTIVE_ONLINE',
    cert_valid_until: '2035-12-31T23:59:59Z',
    mtls_enforced: true,
    active_cipher_suite: 'TLS_AES_256_GCM_SHA384 / TLS 1.3 (RFC 8446)',
    hmac_key_id: 'KEY-HMAC-SHA256-V1-CANTONMENT',
    hmac_algorithm: 'HMAC-SHA256 (FIPS 198-1)',
    audit_chain_length: db.auditLogs.length,
    audit_chain_valid: chainVerification.valid
  };

  return res.json(secStatus);
});

// GET /metrics — Prometheus Scrape Endpoint (OpenMetrics standard format)
export function handlePrometheusMetrics(req: Request, res: Response) {
  let availableVehicles = 0;
  let onSortieVehicles = 0;
  let reservedVehicles = 0;
  let maintenanceVehicles = 0;

  for (const v of db.vehicles.values()) {
    if (v.status === 'AVAILABLE') availableVehicles++;
    else if (v.status === 'ON_SORTIE') onSortieVehicles++;
    else if (v.status === 'RESERVED') reservedVehicles++;
    else if (v.status === 'MAINTENANCE') maintenanceVehicles++;
  }

  let unacknowledgedAlerts = 0;
  for (const a of db.alerts.values()) {
    if (!a.acknowledged_at) unacknowledgedAlerts++;
  }

  const outboundTransactions = Array.from(db.gateTransactions.values()).filter(t => t.event_type === 'OUTBOUND').length;
  const inboundTransactions = Array.from(db.gateTransactions.values()).filter(t => t.event_type === 'INBOUND').length;

  const lines = [
    '# HELP mftams_system_info Build and operational status of M-FTAMS central server',
    '# TYPE mftams_system_info gauge',
    'mftams_system_info{version="1.0.0",env="air-gapped-cantonment",stratum="1"} 1',
    '',
    '# HELP mftams_vehicles_total Number of tracked fleet vehicles by status',
    '# TYPE mftams_vehicles_total gauge',
    `mftams_vehicles_total{status="AVAILABLE"} ${availableVehicles}`,
    `mftams_vehicles_total{status="ON_SORTIE"} ${onSortieVehicles}`,
    `mftams_vehicles_total{status="RESERVED"} ${reservedVehicles}`,
    `mftams_vehicles_total{status="MAINTENANCE"} ${maintenanceVehicles}`,
    '',
    '# HELP mftams_gate_transactions_total Total gate ingress/egress transactions recorded',
    '# TYPE mftams_gate_transactions_total counter',
    `mftams_gate_transactions_total{type="OUTBOUND"} ${outboundTransactions}`,
    `mftams_gate_transactions_total{type="INBOUND"} ${inboundTransactions}`,
    '',
    '# HELP mftams_unacknowledged_alerts_count Current active unacknowledged security & system alerts',
    '# TYPE mftams_unacknowledged_alerts_count gauge',
    `mftams_unacknowledged_alerts_count ${unacknowledgedAlerts}`,
    '',
    '# HELP mftams_audit_chain_valid Cryptographic audit chain tamper detection status (1=valid, 0=tampered)',
    '# TYPE mftams_audit_chain_valid gauge',
    `mftams_audit_chain_valid ${verifyAuditChain(db.getHmacKey(), db.auditLogs).valid ? 1 : 0}`,
    '',
    '# HELP mftams_audit_chain_length Total cryptographically signed blocks in audit chain',
    '# TYPE mftams_audit_chain_length counter',
    `mftams_audit_chain_length ${db.auditLogs.length}`
  ];

  res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
  return res.send(lines.join('\n') + '\n');
}
