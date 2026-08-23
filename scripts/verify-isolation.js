// ============================================================================
// M-FTAMS — Architectural Invariant & Isolation Verification Script
// Verifies:
// 1. Zero cross-imports between frontend-kiosk and frontend-dashboard
// 2. Zero MTO/ADMIN code paths in edge-backend
// ============================================================================

const fs = require('fs');
const path = require('path');

function checkDirectory(dir, forbiddenPatterns, errors) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== 'dist') {
        checkDirectory(fullPath, forbiddenPatterns, errors);
      }
    } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      for (const pattern of forbiddenPatterns) {
        if (pattern.test(content)) {
          errors.push(`[ISOLATION VIOLATION] File ${fullPath} matches forbidden pattern: ${pattern}`);
        }
      }
    }
  }
}

const errors = [];

// 1. Verify frontend-kiosk does not import frontend-dashboard
checkDirectory(
  path.join(__dirname, '../frontend-kiosk/src'),
  [/from\s+['"].*frontend-dashboard/g, /from\s+['"].*CommanderDashboard/g, /from\s+['"].*MTOQueue/g],
  errors
);

// 2. Verify frontend-dashboard does not import frontend-kiosk
checkDirectory(
  path.join(__dirname, '../frontend-dashboard/src'),
  [/from\s+['"].*frontend-kiosk/g, /from\s+['"].*OutboundFlow/g, /from\s+['"].*InboundFlow/g],
  errors
);

// 3. Verify edge-backend contains no MTO approval or admin user-management routes
checkDirectory(
  path.join(__dirname, '../edge-backend/src'),
  [/approveRequisition/g, /rejectRequisition/g, /changeUserRole/g],
  errors
);

if (errors.length > 0) {
  console.error('❌ Isolation verification failed:');
  errors.forEach(e => console.error(e));
  process.exit(1);
} else {
  console.log('✓ All architectural isolation rules and boundary invariants verified successfully.');
}
