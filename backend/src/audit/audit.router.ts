// ============================================================================
// M-FTAMS — Audit Log Router & Cryptographic Chain Verification Endpoint
// ============================================================================

import { Router, Response } from 'express';
import { db } from '../models/db';
import { authenticateJwt, AuthenticatedRequest, requireRoles } from '../auth/auth.middleware';
import { verifyAuditChain } from '../pkg/crypto';

export const auditRouter = Router();

// GET /audit — Query audit trail (COMMANDER, ADMIN, MTO read-only)
auditRouter.get('/', authenticateJwt, requireRoles('COMMANDER', 'ADMIN', 'MTO'), (req: AuthenticatedRequest, res: Response) => {
  const { entity_type, entity_id, from, to } = req.query as {
    entity_type?: string;
    entity_id?: string;
    from?: string;
    to?: string;
  };

  let list = [...db.auditLogs];

  if (entity_type) {
    list = list.filter(a => a.entity_type.toLowerCase() === entity_type.toLowerCase());
  }
  if (entity_id) {
    list = list.filter(a => a.entity_id === entity_id);
  }
  if (from) {
    const fromTime = new Date(from).getTime();
    list = list.filter(a => new Date(a.recorded_at).getTime() >= fromTime);
  }
  if (to) {
    const toTime = new Date(to).getTime();
    list = list.filter(a => new Date(a.recorded_at).getTime() <= toTime);
  }

  // Newest first for UI rendering
  list.sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime());
  return res.json(list);
});

// GET /audit/verify — Cryptographically walks the entire hash-chain from genesis to tip
auditRouter.get('/verify', authenticateJwt, requireRoles('COMMANDER', 'ADMIN', 'MTO'), (req: AuthenticatedRequest, res: Response) => {
  const verification = verifyAuditChain(db.getHmacKey(), db.auditLogs);

  return res.json({
    chain_valid: verification.valid,
    total_entries_verified: db.auditLogs.length,
    tamper_detected: !verification.valid,
    error: verification.error || null,
    verified_at: new Date().toISOString()
  });
});

// GET /audit/export — Formatted audit report export with chain integrity certificate
auditRouter.get('/export', authenticateJwt, requireRoles('COMMANDER', 'ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const verification = verifyAuditChain(db.getHmacKey(), db.auditLogs);

  const report = {
    report_title: 'M-FTAMS Cantonment Cryptographic Audit Ledger',
    generated_at: new Date().toISOString(),
    generated_by: req.user!.username,
    integrity_certificate: {
      chain_valid: verification.valid,
      entries_verified: db.auditLogs.length,
      tamper_detected: !verification.valid,
      genesis_signature: db.auditLogs.length > 0 ? db.auditLogs[0].signature : null,
      tip_signature: db.auditLogs.length > 0 ? db.auditLogs[db.auditLogs.length - 1].signature : null
    },
    total_events: db.auditLogs.length,
    records: db.auditLogs
  };

  return res.json(report);
});

