# M-FTAMS — Software Development Lifecycle, Testing & Deployment Guide

**Document Class:** Technical / Unclassified Prototype
**Companion to:** System Architecture & Core Design Document
**Version:** 1.0

---

## 1. Monorepo Structure

The codebase is organized as a single monorepo so backend, dashboard, kiosk, and deployment configuration evolve together and are built/tested as one versioned unit.

```
/m-ftams/
|-- /backend/                      Go/NestJS central-server API + Dockerfile
|   |-- /cmd/                      Entry point (main.go / main.ts)
|   |-- /internal/
|   |   |-- /auth/                 Auth service: JWT issuance, session mgmt
|   |   |-- /trip/                 Trip service: requisition lifecycle
|   |   |-- /vehicle/              Vehicle service: registry & status
|   |   |-- /gate/                 Gate service: token issuance/revocation
|   |   |-- /sync/                 Sync service: downlink/uplink handling
|   |   |-- /reconciliation/       Reconciliation service
|   |   |-- /alert/                Alert service
|   |   |-- /audit/                Audit service: signing, chain verification
|   |   `-- /models/               Shared domain models & repositories
|   `-- /pkg/                      Signing, hashing, shared utilities
|-- /edge-backend/                 Lightweight Go/NestJS edge service + Dockerfile
|   |-- /internal/
|   |   |-- /cache/                Local Cache Manager
|   |   |-- /gatehandler/          Scan/verify/record/release logic
|   |   `-- /syncclient/           Downlink/uplink client, offline queue
|   `-- /data/                     SQLite file mount point
|-- /frontend-dashboard/           Commander & MTO dashboard (React) + Dockerfile
|   |-- /src/components/
|   |-- /src/pages/
|   `-- /src/state/                Zustand/Redux store
|-- /frontend-kiosk/                Sentry gate kiosk (React) + Dockerfile
|   |-- /src/components/           Kiosk-only component tree (never imports dashboard modules)
|   `-- /src/state/
|-- /edge-simulator/               Script to simulate multiple edge terminals for testing
|-- /deploy/
|   |-- docker-compose.yml         Central server stack
|   |-- docker-compose.edge.yml    Per-gate edge stack
|   |-- /nginx/                    Reverse proxy + TLS config
|   `-- /migrations/               Versioned, reversible schema migrations
`-- README.md                      Setup & run instructions
```

**Structural rules:**
- `frontend-kiosk` and `frontend-dashboard` are independent `package.json` trees; neither depends on the other's source, enforced by CI lint rule (Section 5).
- `edge-backend` is a deliberately smaller build than `backend` — it does not include Auth-service user-management code, MTO approval logic, or ADMIN configuration endpoints, since none of that authority exists at the edge (see Security document, Section 4.3).
- `/deploy/migrations` holds every schema change as a numbered, reversible migration file; there is no code path for ad-hoc manual SQL against production (Section 5.6).

---

## 2. Containerization Strategy

### 2.1 Central Server Stack (`docker-compose.yml`)

```yaml
services:
  postgres:
    image: timescale/timescaledb:latest-pg15
    volumes: ["pg-data:/var/lib/postgresql/data"]
    environment:
      POSTGRES_DB: mftams
      POSTGRES_USER: mftams_app
      POSTGRES_PASSWORD_FILE: /run/secrets/pg_password
    secrets: [pg_password]

  redis:
    image: redis:7-alpine
    volumes: ["redis-data:/data"]

  backend:
    build: ./backend
    depends_on: [postgres, redis]
    ports: ["8080:8080"]
    environment:
      DATABASE_URL: postgres://mftams_app@postgres:5432/mftams
      REDIS_URL: redis://redis:6379
      HMAC_SIGNING_KEY_FILE: /run/secrets/hmac_key
    secrets: [hmac_key]

  dashboard:
    build: ./frontend-dashboard
    depends_on: [backend]
    ports: ["3000:3000"]

  nginx:
    image: nginx:alpine
    depends_on: [backend, dashboard]
    ports: ["443:443", "80:80"]
    volumes: ["./deploy/nginx:/etc/nginx/conf.d:ro", "./deploy/tls:/etc/nginx/tls:ro"]

secrets:
  pg_password: { file: ./secrets/pg_password.txt }
  hmac_key: { file: ./secrets/hmac_key.txt }

volumes:
  pg-data:
  redis-data:
```

### 2.2 Edge Terminal Stack (`docker-compose.edge.yml`)

```yaml
services:
  edge-backend:
    build: ./edge-backend
    environment:
      CENTRAL_URL: https://mftams-central.cantonment.mil:8080
      SYNC_INTERVAL: "300"
      EDGE_ID: "GATE-04"
      SECRET_KEY_FILE: /run/secrets/edge_secret
    volumes: ["./edge-data:/app/data"]   # SQLite persistence, survives container restart
    secrets: [edge_secret]

  edge-kiosk:
    build: ./frontend-kiosk
    depends_on: [edge-backend]
    ports: ["3001:3001"]

secrets:
  edge_secret: { file: ./secrets/edge_secret_gate04.txt }
```

**Key deployment distinctions between the two stacks:**
- The central stack includes PostgreSQL/TimescaleDB and Redis; the edge stack has no separate database container — SQLite is embedded directly within `edge-backend` and persisted via a bind-mounted volume.
- Each edge stack is deployed with a unique `EDGE_ID` and its own secret file; edge stacks are never templated with a shared secret across gates.
- The edge stack has no Nginx/TLS-termination container of its own for kiosk-local traffic (loopback only), but its outbound sync connection to the central server is TLS 1.3 client-authenticated, per the Security document.

### 2.3 Deployment Sequencing

Per the Architecture document's principle of independent tier failure, the two stacks are deployed and can be restarted independently:

1. Central stack is deployed and health-checked first.
2. Edge stacks are deployed per gate, each performing an initial full downlink on first successful connection to seed its local cache before going live for gate operations.
3. An edge stack that has never successfully completed an initial downlink refuses to authorize any gate handshake (fail-closed, not fail-open) — it will not release a barrier against an empty, unseeded cache.

---

## 3. Testing Strategy

| Test Type | Coverage / Tooling | Priority Order |
|---|---|---|
| **Unit tests** | Backend services (Go `testing` package / Jest for NestJS); signing, validation, and reconciliation logic covered first, since these are the highest-consequence, hardest-to-visually-QA code paths | 1st |
| **Integration tests** | API + database interactions; sync protocol tested against a simulated edge client using `/edge-simulator` | 2nd |
| **Offline simulation** | The `/edge-simulator` script drives multiple virtual gate terminals through induced outages, reconnects, and clock-skew scenarios, validating the behaviors specified in the Synchronization Protocol document (Sections 5.4, 6) | 3rd |
| **End-to-end (E2E) tests** | Full sortie lifecycle exercised through the actual UI: requisition → approval → outbound → inbound → reconciliation, covering all eight stages from the Architecture document | 4th |
| **Load / performance tests** | Validate the <200ms API (95th percentile) and offline-authentication latency targets under concurrent gate load (50 concurrent gate operations, 500 concurrent API users — see Tech Stack document, Section 3.3) | 5th |
| **Security testing** | Token forgery attempts, replay attacks, RBAC boundary tests (verifying every matrix cell in the Security document, Section 4.2, including negative tests confirming denied actions are actually denied); periodic penetration testing before rollout | 6th, and recurring |

**Testing sequencing rationale:** unit tests for signing/validation logic run first because a defect there compromises every downstream test's validity — an E2E test that "passes" against a broken signature-verification routine proves nothing.

### 3.1 Offline Simulation Detail

The edge-simulator is not a mocking layer; it runs the actual `edge-backend` binary against a real (test-instance) SQLite file, with a network-fault-injection harness controlling connectivity to a test central server. Scenarios explicitly covered:

- Sustained outage up to and beyond the 72-hour design ceiling.
- Reconnect-and-immediate-uplink-flush behavior (Synchronization Protocol, Section 4.1).
- Simulated clock drift exceeding the configured tolerance, verifying the `CLOCK_SKEW_SUSPECTED` flagging path.
- Power-loss simulation mid-transaction (killing the process during a local write), verifying SQLite transactional recovery on restart.
- Revocation propagation delay: a token revoked centrally during an edge outage, then presented at the edge before the next downlink, verifying the override-with-remarks path is available and correctly logged.

### 3.2 Performance Targets Under Test

| Metric | Target | Test Method |
|---|---|---|
| Gate authentication latency (offline) | < 500 ms | Load test against `edge-backend` with local cache pre-seeded at realistic scale, network interface disabled |
| API response time (95th percentile) | < 200 ms | Load test against `backend` at 500 concurrent simulated users |
| Concurrent gate operations | 50 per gate | Load test against a single `edge-backend` instance |
| Database query performance | < 100 ms typical | Query profiling against a TimescaleDB instance seeded with representative multi-month gate-transaction volume |

---

## 4. Risk Management Matrix

| Risk | Impact | Mitigation |
|---|---|---|
| **Clock drift between edge devices** affecting LWW conflict resolution | Incorrect authoritative-value determination during sync conflicts | Periodic NTP sync when online; hardware-timestamp deltas monitored per uplink batch and flagged if skew exceeds configured tolerance (Synchronization Protocol, Section 5.4) |
| **Revoked token remains cached at an offline edge** | A token that should no longer be valid could still be presented and accepted | Revocations propagate on the next 5-minute sync cycle; sentries retain an override-with-remarks procedure for edge cases, itself logged and permanently flagged for review (Synchronization Protocol, Section 5.5) |
| **Edge hardware failure in the field** | Gate goes out of service; potential data loss if local cache/queue is not recoverable | Stateless edge design — replacement hardware re-syncs the full active cache from the central server on first connection; the `pending_events` queue is the only field-unique local state, and its durability is protected by `PRAGMA synchronous = FULL` writes |
| **Low user adoption / training gaps** | Manual workarounds re-emerge, undermining the audit-trail guarantee | Kiosk UI kept deliberately minimal; phased pilot-then-rollout (Section 5 of this document) with dedicated training materials (see Operations & User Manuals document) |
| **Data tampering at rest or in transit** | Falsified gate records, undetected unauthorized vehicle use | HMAC-SHA256 signing of tokens and logs, TLS 1.3 in transit, append-only audit table with hash-chain integrity verification (Security document, Section 3.3) |
| **Central server hardware/storage failure** | Loss of system-of-record data | Daily PostgreSQL backups with WAL archiving (30-day retention); documented RTO < 4 hours, RPO < 24 hours |
| **Sync protocol bug causing double-application of events** | Duplicate gate-transaction records, incorrect reconciliation | Idempotency enforced via unique database constraint on `event_id`, not application-logic-only deduplication (Synchronization Protocol, Section 4.3.2) |
| **Insider misuse via legitimate role credentials** | Unauthorized approvals, unauthorized gate overrides | RBAC least-privilege scoping plus fully attributed, immutable audit trail; misuse is detectable and attributable after the fact even where not preventable in real time |

---

## 5. Development Methodology

The project follows an **iterative, spec-driven Agile approach**: each phase begins with a written specification (data model, API contract, UI flow) reviewed before implementation starts, then proceeds through short development iterations, ending each phase with a working, demonstrable slice. This keeps the offline-first and security requirements — which are easy to get subtly wrong — explicit and reviewable before code is written, rather than discovered during integration.

### 5.1 Coding Standards

- Consistent formatting enforced by tooling: `gofmt`/`golangci-lint` for Go, ESLint + Prettier for React/TypeScript.
- Modular service boundaries (Auth, Trip, Vehicle, Gate, Sync, Alert, Audit) with clear ownership of each domain, matching the structure in Section 1.
- All business logic heavily commented where it encodes a military-specific rule — the 10% distance-deviation audit threshold, the 72-hour offline ceiling, and the token time-boxing window are the three most load-bearing constants in the system and are documented at their point of definition in code, not only in this document.
- SOLID principles applied to backend services; frontend components are small, composable, and role-scoped — kiosk components never import dashboard-only code (Section 1).

### 5.2 CI/CD Practices

- Every merge triggers automated linting, unit tests, and a build of all container images.
- A staging environment mirrors the on-premise topology (central stack + at least one edge stack) for realistic testing — staging is never central-stack-only, since sync-protocol regressions are invisible without a live edge counterpart.
- Deployments are performed via versioned Docker images and `docker-compose`, with a documented rollback path (previous image tag + previous migration state).
- Database schema changes ship as reviewed, reversible migrations — never manual, ad-hoc SQL against production.
- Secret-scanning runs on every commit to prevent HMAC keys or pre-shared secrets from entering source control (Security document, Section 3.4).

### 5.3 Documentation Practices

- API contracts documented alongside the code (OpenAPI/Swagger) and kept in sync with implementation — the contracts in the Database Schemas & API Contracts document are the authoritative starting point, versioned alongside code changes.
- A living README per service (`/backend/README.md`, `/edge-backend/README.md`, etc.) covering setup, environment variables, and local run instructions.
- Operator-facing documentation (Sentry quick-reference, MTO approval guide — see the Operations & User Manuals document) is kept separate from developer docs, since the audiences and required depth differ substantially.
- Architecture decisions are recorded briefly at the point they are made (lightweight ADR entries), so later maintainers understand *why*, not just *what*.

---

## 6. Implementation Roadmap (Reference)

| Phase | Timeline | Focus | Key Activities |
|---|---|---|---|
| 1 | Weeks 1–4 | Foundation | Database schema & migrations; core API (Auth, Vehicles, Users); read-only dashboard skeleton |
| 2 | Weeks 5–8 | Core workflow | Requisition & approval workflow; gate-pass token generation and signing; edge local caching |
| 3 | Weeks 9–12 | Gate operations | Kiosk UI (touch-optimized); outbound/inbound handshake logic; simulated RFID/biometric integration |
| 4 | Weeks 13–16 | Synchronization | Bi-directional sync protocol; conflict resolution; reconciliation service |
| 5 | Weeks 17–18 | Security & audit | Audit-trail implementation; cryptographic signing for all logs; RBAC enforcement |
| 6 | Weeks 19–20 | Testing & deployment | Integration testing with edge simulators; performance/load testing; containerization; UAT |
| 7 | Weeks 21–24 | Training & rollout | Operator training materials; pilot at one gate; feedback iteration; full rollout |

**Rollout sequencing principle:** the central stack and a single pilot gate go live before any further gate onboarding, so that sync-protocol behavior under real (not simulated) network conditions is observed and any issue is contained to one gate before scaling out.
