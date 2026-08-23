// ============================================================================
// M-FTAMS — Synchronization Router (/sync/downlink & /sync/uplink)
// ============================================================================

import { Router, Request, Response } from 'express';
import * as zlib from 'zlib';
import { syncService } from './sync.service';

export const syncRouter = Router();

// GET /sync/downlink — Retrieve reference data snapshot for edge terminal
syncRouter.get('/downlink', (req: Request, res: Response) => {
  const edge_id = req.query.edge_id as string;
  const since_version = req.query.since_version as string | undefined;

  if (!edge_id) {
    return res.status(400).json({ error: 'edge_id query parameter is required' });
  }

  const snapshot = syncService.generateDownlinkSnapshot(edge_id);

  if (since_version && since_version === snapshot.snapshot_version) {
    return res.status(304).end();
  }

  const jsonStr = JSON.stringify(snapshot);

  // Check if edge requested gzip compression
  const acceptEncoding = req.headers['accept-encoding'] || '';
  if (acceptEncoding.includes('gzip')) {
    zlib.gzip(jsonStr, (err, buffer) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to compress snapshot' });
      }
      res.setHeader('Content-Encoding', 'gzip');
      res.setHeader('Content-Type', 'application/json');
      return res.send(buffer);
    });
  } else {
    return res.json(snapshot);
  }
});

// POST /sync/uplink — Submit batch of pending gate transactions from edge terminal
syncRouter.post('/uplink', (req: Request, res: Response) => {
  const { edge_id, batch_id, hardware_clock_at_generation, events } = req.body;

  if (!edge_id || !batch_id || !events || !Array.isArray(events)) {
    return res.status(400).json({ error: 'Malformed uplink batch: edge_id, batch_id, and events array are required' });
  }

  const result = syncService.ingestUplinkBatch({
    edge_id,
    batch_id,
    generated_at: new Date().toISOString(),
    hardware_clock_at_generation: hardware_clock_at_generation || new Date().toISOString(),
    events
  });

  return res.status(result.status_code).json({
    accepted_event_ids: result.accepted_event_ids,
    rejected_event_ids: result.rejected_event_ids,
    error: result.error
  });
});
