// ============================================================================
// M-FTAMS — Central Server Entry Point
// ============================================================================

import { app } from './app';

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`[M-FTAMS Central Server] Running on http://localhost:${PORT}`);
  console.log(`[M-FTAMS Central Server] API base path: http://localhost:${PORT}/api/v1`);
  console.log(`[M-FTAMS Central Server] Sync endpoint: http://localhost:${PORT}/sync`);
});
