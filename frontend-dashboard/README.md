# M-FTAMS Commander & MTO Operations Console

Web dashboard providing Common Operating Picture (COP), real-time fleet mission tracking, automated alerts, MTO approval workflows, and immutable cryptographic audit trails.

## Role-Based Views
- **Station Commander (Read-Only by Design):**
  - Real-time fleet status matrix (Available, On Sortie, Reserved, Maintenance)
  - Active Sortie mission tracker with live elapsed time and ETA countdowns (no GPS dependency)
  - Hourly gate traffic distribution analytics
  - Critical & warning alerts feed
- **Movement Control Officer (MTO):**
  - Pending trip requisition approvals queue (sorted soonest departure first)
  - Pre-filtered vehicle and driver binding modal
  - Cryptographic HMAC-SHA256 gate-pass token issuance
  - Mandatory rejection reason enforcement
  - Active sortie pass revocation with bounded downlink propagation delay warnings
  - Flagged Sorties Queue (>10% distance deviation reconciliation review)
- **Unit Transport Submitter:**
  - Car diary requisition submission portal
- **Audit & Security Officer:**
  - Immutable append-only audit trail
  - On-demand cryptographic hash-chain verification tool

## Running Locally
```bash
npm install
npm run dev
# Dashboard accessible on http://localhost:3000
```
