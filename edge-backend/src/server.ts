// ============================================================================
// M-FTAMS Edge — Server Entry Point
// ============================================================================

import { app } from './app';
import { syncClient } from './syncclient/sync.client';

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`[M-FTAMS Edge Node] Running on http://localhost:${PORT}`);
  console.log(`[M-FTAMS Edge Node] Gate Kiosk API available at http://localhost:${PORT}/gate/scan`);

  // Start background sync scheduler (every 5 min)
  syncClient.startScheduler();
});
