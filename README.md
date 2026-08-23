# M-FTAMS — Military Fleet Transportation & Access Management System

Production-grade, offline-first, zero-trust fleet dispatch and gate-access control system for military cantonment operations. Replaces the paper "Car Diary" with a closed-loop digital workflow spanning all eight stages of the sortie lifecycle.

---

## Architecture Overview

```
PRESENTATION TIER
  Commander Dashboard  |  MTO Panel  |  Sentry Gate Kiosk
  (React 18, role-scoped, HTTPS/TLS 1.3)    (React 18, offline-first, localhost only)
        │ HTTPS/REST             │ HTTPS/REST           │ Local HTTP (loopback)
        ▼                        ▼                      ▼
APPLICATION TIER — CENTRAL                 APPLICATION TIER — EDGE
  Central Server (Node.js/Express)          Edge Terminal (Node.js/Express)
   • Auth Service                            • Local Cache Manager
   • Trip Service            ◄── 5min ──►   • Gate Handler
   • Sync Service              sync          • Sync Client
   • Reconciliation Service                  • Offline Event Queue
   • Vehicle / Driver / Gate / Alert / Audit
        │                                           │
        ▼                                           ▼
DATA TIER — CENTRAL                         DATA TIER — EDGE
  PostgreSQL 15+ w/ TimescaleDB              SQLite 3 (embedded, 72h rolling cache)
  Redis 7 (session cache, rate limiting)
```

## Monorepo Structure

```
/m-ftams/
├── backend/                    Central server API (8 services, modular monolith)
├── edge-backend/               Lightweight edge terminal (no MTO/ADMIN code paths)
├── frontend-dashboard/         Commander & MTO dashboard (React 18 + Vite + Tailwind)
├── frontend-kiosk/             Sentry gate kiosk (React 18, offline-first, one-at-a-time lock)
├── edge-simulator/             Multi-terminal simulator for offline/sync testing
├── deploy/
│   ├── docker-compose.yml      Central server stack
│   ├── docker-compose.edge.yml Per-gate edge stack
│   ├── migrations/             Versioned PostgreSQL/TimescaleDB schema
│   ├── nginx/                  TLS 1.3 reverse proxy config
│   └── secrets/                Out-of-band provisioned secrets
└── README.md
```

## The Eight-Stage Sortie Lifecycle

| # | Stage | System Behavior |
|---|-------|----------------|
| 1 | **Requisition** | Unit submits destination, purpose, planned distance, ETA via web portal |
| 2 | **Approval** | MTO reviews (system pre-filters available vehicle/driver). On approve: HMAC-SHA256 signed gate-pass token issued, vehicle → `RESERVED` |
| 3 | **Dispatch & Binding** | `{trip, vehicle, driver, token}` binding fixed and immutable. Vehicle → `DISPATCHED` |
| 4 | **Outbound Gate Handshake** | Edge terminal: Scan RFID → Verify biometric/smart-card + photo cross-check → Record odometer + fuel → Release barrier. Vehicle → `ON_SORTIE` |
| 5 | **Mission Tracking** | Dashboard shows ON_SORTIE with live ETA countdown. Overdue alerts auto-triggered |
| 6 | **Inbound Gate Handshake** | Structurally identical to Stage 4. Computes `actual_distance = return_odometer − outbound_odometer` |
| 7 | **Reconciliation** | Compares actual vs planned distance. **10% threshold**: exceeding it auto-raises `AUDIT_ALERT`, vehicle → `AVAILABLE`, trip → `COMPLETED` or `COMPLETED_FLAGGED` |
| 8 | **Archival & Audit** | Every record written to HMAC-SHA256 hash-chained, append-only audit trail. Nothing ever deleted or mutated |

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Backend API | Node.js + Express (TypeScript) |
| Auth | JWT (15min access + 7d refresh) + HMAC-SHA256 |
| Frontend | React 18 + Vite + TailwindCSS |
| Styling | Military dark theme (IBM Plex Mono/Sans) |
| Central DB | PostgreSQL 15+ with TimescaleDB |
| Edge DB | SQLite 3 (embedded) |
| Cache | Redis 7 |
| Containerization | Docker + Docker Compose |
| Reverse Proxy | Nginx (TLS 1.3 enforced) |
| Crypto | Node.js `crypto` stdlib (HMAC-SHA256, constant-time compare) |

## Load-Bearing Constants

```typescript
// 10% Distance Deviation Threshold
// Sorties exceeding this trigger COMPLETED_FLAGGED + AUDIT_ALERT
DISTANCE_DEVIATION_THRESHOLD_PCT = 10.0;

// 72-Hour Offline Operating Ceiling
// Edge terminals cache tokens/vehicles/drivers up to 72 hours
OFFLINE_CEILING_HOURS = 72;

// Gate-Pass Token Time-Boxing Window
// Tokens expire after this window; edges reject expired tokens offline
TOKEN_VALIDITY_WINDOW_HOURS = 72;

// Clock Skew Tolerance (Seconds)
// Exceeding triggers CLOCK_SKEW_SUSPECTED alert
CLOCK_SKEW_TOLERANCE_SECONDS = 30;
```

## Non-Negotiable Invariants

1. **No gate decision blocks on network I/O** — edge terminal decides locally using only local SQLite reads
2. **No record is ever edited/deleted** — append-only, signed rows referencing prior state
3. **Token validity is self-contained** — HMAC-SHA256 verified offline, no sync call needed
4. **RBAC enforced server-side only** — at every API endpoint, never inferred from UI state
5. **Every sync batch is idempotent** — replay never double-applies events

## Quick Start

### Development (All Services)

```bash
# 1. Start Central Server (in-memory DB for dev)
cd backend && npm install && npm run dev
# Runs on http://localhost:8080

# 2. Start Edge Backend
cd edge-backend && npm install && npm run dev
# Runs on http://localhost:3001

# 3. Start Kiosk Frontend
cd frontend-kiosk && npm install && npm run dev
# Runs on http://localhost:3000

# 4. Start Dashboard Frontend
cd frontend-dashboard && npm install && npm run dev
# Runs on http://localhost:5173
```

### Default Users (Password: `password123`)

| Username | Role | Description |
|----------|------|-------------|
| `admin` | ADMIN | System administration |
| `mto` | MTO | Movement Control Officer — approves requisitions, issues tokens |
| `commander` | COMMANDER | Station Commander — read-only fleet visibility |
| `sentry_main` | SENTRY | Gate duty officer (assigned to Main Gate) |
| `driver_rakesh` | DRIVER | Military driver |

### Docker Compose

```bash
# Central stack (Postgres + Redis + Backend + Dashboard + Nginx)
cd deploy && docker compose up -d

# Edge stack (per-gate, unique EDGE_ID + secret)
docker compose -f docker-compose.edge.yml up -d
```

## API Endpoints

### Authentication
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/auth/login` | Login → JWT access + refresh tokens |
| POST | `/api/v1/auth/refresh` | Exchange refresh token for new access token |
| POST | `/api/v1/auth/logout` | Invalidate session |

### Requisitions
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/requisitions` | Any | Submit trip requisition |
| GET | `/api/v1/requisitions` | Any | List requisitions (filterable by status) |
| POST | `/api/v1/requisitions/:id/approve` | MTO | Approve + bind vehicle/driver + issue token |
| POST | `/api/v1/requisitions/:id/reject` | MTO | Reject with mandatory reason |

### Fleet & Gates
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/fleet/status` | Any | Vehicle status board |
| GET | `/api/v1/fleet/active-sorties` | Any | Active sorties with ETA countdown |
| GET | `/api/v1/fleet/stats` | Any | Dashboard summary counts |
| POST | `/api/v1/tokens/:id/revoke` | MTO/ADMIN | Revoke gate-pass token |

### Sync Protocol
| Method | Path | Description |
|--------|------|-------------|
| GET | `/sync/downlink?edge_id=GATE-04` | Generate reference data snapshot for edge |
| POST | `/sync/uplink` | Ingest signed edge event batch (idempotent) |

### Audit & Alerts
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/audit` | CMD/ADMIN/MTO | Query audit trail (filterable) |
| GET | `/api/v1/audit/verify` | CMD/ADMIN/MTO | Verify cryptographic hash-chain integrity |
| GET | `/api/v1/alerts` | Any | List alerts (filterable by severity) |
| POST | `/api/v1/alerts/:id/ack` | CMD/MTO/ADMIN | Acknowledge alert |

### Edge Terminal (Localhost Only)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/gate/scan` | Scan RFID tag against local cache |
| POST | `/gate/verify` | Driver biometric/smart-card verification |
| POST | `/gate/handshake` | Record event + release barrier |
| POST | `/gate/sync` | Force sync cycle |
| POST | `/gate/seed` | Direct snapshot seeding |

## RBAC Permissions Matrix

| Capability | ADMIN | MTO | COMMANDER | SENTRY | DRIVER |
|------------|:-----:|:---:|:---------:|:------:|:------:|
| Manage users & roles | ✅ | ❌ | ❌ | ❌ | ❌ |
| Manage vehicle/driver registry | ✅ | R | R | R (own gate) | — |
| Approve/reject requisitions | — | ✅ | ❌ | ❌ | ❌ |
| Issue/revoke gate-pass tokens | ✅ | ✅ | ❌ | ❌ | ❌ |
| Execute gate handshake | ❌ | ❌ | ❌ | ✅ | ❌ |
| Execute override-with-remarks | ❌ | ❌ | ❌ | ✅ | ❌ |
| View fleet status dashboard | R | R | R | R (own gate) | — |
| View audit trail/reports | R | R (own) | R (full) | ❌ | ❌ |

## Testing

```bash
# Unit tests — signing, reconciliation, token verification
cd backend && npm test          # 22 tests

# Edge tests — offline latency, cache, handshake
cd edge-backend && npm test     # 7 tests

# Simulator tests — outage, reconnect, clock drift
cd edge-simulator && npm test   # 3 tests

# Frontend builds
cd frontend-kiosk && npm run build
cd frontend-dashboard && npm run build
```

**Total: 32 tests, all passing.**

## Security Architecture

- **Zero-trust**: No privilege from network position. Every action authenticated + authorized + logged.
- **HMAC-SHA256 signing**: Gate-pass tokens and audit entries signed with central/edge secrets.
- **Constant-time comparison**: `crypto.timingSafeEqual` prevents timing side-channel leakage.
- **Hash-chained audit**: Each audit entry's signature incorporates the previous entry's signature. Tampering invalidates the entire downstream chain.
- **TLS 1.3 only**: Nginx config disables TLS 1.2 and below.
- **Docker secrets**: `pg_password` and `hmac_key` via Docker secrets, never plain environment variables.
- **Fail-closed**: Unseeded edge terminals refuse all gate operations.

## Deployment

See `deploy/docker-compose.yml` (central stack) and `deploy/docker-compose.edge.yml` (per-gate stack).

**Deployment Sequence:**
1. Central stack deployed and health-checked first
2. Each edge stack deployed per gate; performs initial full downlink on first connection
3. **Fail-closed**: edge stack that has never completed initial downlink refuses all gate operations

## License

Military use — restricted distribution.
