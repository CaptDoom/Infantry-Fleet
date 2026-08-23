# M-FTAMS Central Backend Service

The central backend is a modular monolith providing API endpoints, authentication, requisition approvals, cryptographic token issuance, synchronization, post-trip reconciliation, system alerts, and hash-chained audit trails.

## Endpoints Summary

### Authentication (`/api/v1/auth`)
- `POST /login`: Authenticates username/password (bcrypt) -> returns access JWT (15m) & refresh token (7d)
- `POST /refresh`: Issues new access token
- `POST /logout`: Invalidates active session
- `GET /users`: List users (ADMIN only)
- `PATCH /users/:user_id/role`: Change user role with HMAC signed `role_change_log` entry (ADMIN only)

### Requisitions (`/api/v1/requisitions`)
- `POST /`: Submit new trip requisition (`SUBMITTED`)
- `GET /`: List requisitions (filterable by `?status=`)
- `GET /:id`: Retrieve single requisition

### Approvals (`/api/v1/requisitions`)
- `POST /:id/approve`: Approve requisition, bind available vehicle & active driver, issue HMAC-SHA256 token (MTO only)
- `POST /:id/reject`: Reject requisition with mandatory reason (MTO only)

### Synchronization (`/sync`)
- `GET /downlink`: Generates snapshot of active tokens, vehicles, drivers, revocations (supports gzip)
- `POST /uplink`: Ingests batch of edge gate events, verifies HMAC signatures, checks idempotency on `event_id`, triggers post-trip reconciliation, and monitors clock drift (>30s)

### Fleet & Dashboard (`/api/v1/fleet`)
- `GET /status`: Live status matrix of all vehicles
- `GET /active-sorties`: Trips currently `ON_SORTIE` with elapsed time & ETA countdowns
- `GET /stats`: Overall fleet counts and alerts summary

### Audit & Security (`/api/v1/audit`)
- `GET /`: Query append-only audit trail
- `GET /verify`: Cryptographically walks entire hash chain from genesis to tip, verifying all HMAC signatures and block linkages

## Running Locally
```bash
npm install
npm test
npm start
```
