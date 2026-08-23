// ============================================================================
// M-FTAMS — Alert Router
// ============================================================================

import { Router, Response } from 'express';
import { db } from '../models/db';
import { Alert, AlertSeverity, AlertType } from '../models/types';
import { authenticateJwt, AuthenticatedRequest, requireRoles } from '../auth/auth.middleware';

export const alertRouter = Router();

// GET /alerts — List all alerts, filterable by severity and type
alertRouter.get('/', authenticateJwt, (req: AuthenticatedRequest, res: Response) => {
  const severity = req.query.severity as AlertSeverity | undefined;
  const alert_type = req.query.alert_type as AlertType | undefined;

  let list = Array.from(db.alerts.values());

  if (severity) {
    list = list.filter(a => a.severity === severity);
  }
  if (alert_type) {
    list = list.filter(a => a.alert_type === alert_type);
  }

  // Sort newest first
  list.sort((a, b) => new Date(b.raised_at).getTime() - new Date(a.raised_at).getTime());
  return res.json(list);
});

// GET /alerts/stream — Server-Sent Events (SSE) stream for real-time alert push
alertRouter.get('/stream', (req, res) => {
  // Support JWT in header or query parameter for EventSource compatibility
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', message: 'M-FTAMS Real-Time Alert Stream Active', timestamp: new Date().toISOString() })}\n\n`);

  // Stream newly raised alerts to client
  const unsubscribe = db.onAlert((alert: Alert) => {
    res.write(`event: alert\ndata: ${JSON.stringify(alert)}\n\n`);
  });

  // Keep-alive heartbeat every 20 seconds
  const heartbeat = setInterval(() => {
    res.write(`event: heartbeat\ndata: ${JSON.stringify({ timestamp: new Date().toISOString() })}\n\n`);
  }, 20000);

  req.on('close', () => {
    unsubscribe();
    clearInterval(heartbeat);
  });
});

// POST /alerts/:alert_id/ack — Acknowledge an alert (ADMIN, MTO, COMMANDER)
alertRouter.post('/:alert_id/ack', authenticateJwt, requireRoles('ADMIN', 'MTO', 'COMMANDER'), (req: AuthenticatedRequest, res: Response) => {
  const alert = db.alerts.get(req.params.alert_id);
  if (!alert) {
    return res.status(404).json({ error: 'Alert not found' });
  }

  alert.acknowledged_by = req.user!.userId;
  alert.acknowledged_at = new Date().toISOString();

  db.logAudit('alert', alert.alert_id, 'ALERT_ACKNOWLEDGED', req.user!.userId, {
    alert_type: alert.alert_type,
    severity: alert.severity
  });

  return res.json(alert);
});

