# M-FTAMS — System Architecture & Core Design Document

**Document Class:** Technical / Unclassified Prototype
**System:** Military Fleet Transportation & Access Management System
**Version:** 1.0
**Environment:** DDIL (Denied / Disconnected / Intermittent / Limited)

---

## 1. Purpose and Design Philosophy

M-FTAMS exists to replace a manual, paper-based "Car Diary" gate register with a closed-loop digital system that remains fully operational when the network is not. Every architectural decision in this document is subordinate to three non-negotiable constraints:

1. **A gate decision must never wait on a network call.** The edge terminal is authoritative for authentication and access decisions at the moment of the event.
2. **No record may ever be silently altered.** Every state transition is captured as a new, signed, append-only entry.
3. **Nothing is trusted by virtue of network location.** A device inside the cantonment LAN is not automatically trusted; it must present valid, time-boxed, cryptographically verifiable credentials for every action.

This document defines the system's three-tier architecture, its foundational design principles, and the complete eight-stage sortie lifecycle that the architecture exists to serve.

---

## 2. Three-Tier Architecture

### 2.1 Architectural Overview

M-FTAMS is organized into three tiers: **Presentation**, **Application**, and **Data**. The Application tier is further split into two distinct runtime contexts — the **Central Server** and the **Edge Terminal** — which run different code, hold different data authority, and fail independently of one another.

```
┌─────────────────────────────────────────────────────────────────────┐
│ PRESENTATION TIER                                                     │
│  Commander Dashboard   |   MTO Panel   |   Sentry Gate Kiosk          │
│  (React 18, role-scoped, served over HTTPS/TLS 1.3)                   │
└───────────────┬───────────────────┬────────────────┬─────────────────┘
                │ HTTPS/REST        │ HTTPS/REST      │ Local HTTP (loopback)
                ▼                   ▼                  ▼
┌─────────────────────────────────┐   ┌───────────────────────────────┐
│ APPLICATION TIER — CENTRAL       │   │ APPLICATION TIER — EDGE       │
│ ┌───────────────────────────────┐│   │┌──────────────────────────────┐│
│ │ CENTRAL SERVER (Go / NestJS)  ││   ││ EDGE TERMINAL (Go / NestJS,   ││
│ │  • Auth Service               ││   ││  lightweight build)           ││
│ │  • Trip Service               ││   ││  • Local Cache Manager        ││
│ │  • Sync Service               ││   ││  • Gate Handler               ││
│ │  • Reconciliation Service     ││◄──┼─►│  • Sync Client                ││
│ │  • Vehicle Service            ││ 5m││  • Offline Event Queue        ││
│ │  • Gate Service               ││sync│└──────────────────────────────┘│
│ │  • Alert Service              ││   │                                 │
│ │  • Audit Service              ││   │                                 │
│ └───────────────────────────────┘│   │                                 │
└───────────────┬───────────────────┘   └───────────────┬─────────────────┘
                │                                        │
                ▼                                        ▼
┌─────────────────────────────────┐   ┌───────────────────────────────┐
│ DATA TIER — CENTRAL               │   │ DATA TIER — EDGE               │
│  PostgreSQL 15+ w/ TimescaleDB    │   │  SQLite 3 (embedded, file-     │
│  Redis 7 (session cache, rate     │   │  based, 72-hour rolling cache) │
│  limiting)                        │   │                                 │
└───────────────────────────────────┘   └───────────────────────────────┘
```

### 2.2 Presentation Tier

**Composition:** Three distinct React 18 single-page applications, each compiled and deployed as an independent bundle, sharing a common component library but never sharing role-scoped logic.

| Application | Consumers | Deployment Target | Connectivity Assumption |
|---|---|---|---|
| Commander Dashboard | COMMANDER | Central server (Nginx-served) | Requires connectivity; read-mostly |
| MTO Panel | MTO, ADMIN | Central server (Nginx-served) | Requires connectivity; read/write |
| Sentry Gate Kiosk | SENTRY | Edge terminal (locally served) | Must function fully offline |

**Design rule:** The Kiosk bundle never imports dashboard-only modules and vice versa. This is enforced at the build level (separate Vite entry points, separate `package.json` dependency trees within the monorepo) so that a compromised or defective dashboard build cannot affect gate operations, and so that the Kiosk bundle stays minimal enough to load instantly on constrained edge hardware.

**Kiosk-specific constraints:**
- Runs in full-screen/kiosk mode with OS-level lockdown (no window chrome, no ability to switch away from the app).
- Communicates only with its co-located edge backend over loopback (`localhost`) — it has no direct network dependency on the central server.
- Renders exclusively against local state pushed from the edge backend's local cache; it never blocks on a remote call to render a gate decision.

### 2.3 Application Tier

#### 2.3.1 Central Server

The central server is the system's single source of truth once data has synced. It is implemented in Go (Gin or Fiber) or Node.js (NestJS) — the two are functionally interchangeable at the API contract level, and the choice is an implementation-team decision documented in Section 5 of the Tech Stack document. It exposes eight logical services, each owning a distinct domain:

| Service | Responsibility |
|---|---|
| **Auth Service** | User authentication, JWT issuance/refresh, session invalidation |
| **Trip Service** | Requisition lifecycle: creation, validation, status transitions |
| **Vehicle Service** | Vehicle registry, status (AVAILABLE / RESERVED / DISPATCHED / ON_SORTIE), maintenance flags |
| **Gate Service** | Gate-pass token issuance, token revocation/blacklist management |
| **Sync Service** | Downlink snapshot generation, uplink batch ingestion, sync-state bookkeeping |
| **Reconciliation Service** | Post-trip distance/fuel comparison, deviation flagging |
| **Alert Service** | Overdue-vehicle detection, sync-failure alerts, edge-outage alerts |
| **Audit Service** | Append-only log writes, signature generation and periodic integrity verification |

Each service owns its own data-access layer and does not reach into another service's tables directly; cross-service interaction happens through in-process function calls (monolith-per-tier, not microservices) to keep the on-premise deployment footprint small and avoid introducing a service mesh dependency that would itself require network reliability the environment cannot guarantee.

#### 2.3.2 Edge Terminal

The edge terminal is a physically separate, gate-local deployment running a deliberately minimal subset of server logic:

| Component | Responsibility |
|---|---|
| **Local Cache Manager** | Maintains the SQLite-backed 72-hour rolling cache of tokens, vehicles, drivers, and the blacklist; applies downlink snapshots atomically |
| **Gate Handler** | Executes the scan → verify → record → release sequence entirely against local cache; never issues a blocking remote call |
| **Sync Client** | Initiates uplink/downlink exchanges on the 5-minute schedule or immediately on reconnect detection |
| **Offline Event Queue** | Durable, ordered queue of gate-transaction events awaiting uplink; survives process restarts and power loss (fsync'd to disk on write) |

**Critical architectural property:** the edge terminal's local SQLite database is the *operational* source of truth for gate decisions during the 72-hour offline window. The central server is the *eventual* source of truth once sync completes. The system is explicitly designed to tolerate this window of divergence rather than treat it as an error condition — see Section 3.2 (Eventual Consistency) below.

### 2.4 Data Tier

| Store | Location | Technology | Purpose |
|---|---|---|---|
| Central relational store | Central server room | PostgreSQL 15+ with TimescaleDB extension | ACID-compliant system of record; TimescaleDB hypertables for gate-transaction time-series analytics |
| Central cache | Central server room | Redis 7 | API session cache, rate limiting, ephemeral state |
| Edge local store | Per-gate edge terminal | SQLite 3 (embedded) | Zero-configuration, file-based, single-writer local cache; holds the 72-hour token/vehicle/driver snapshot and the pending offline transaction queue |

TimescaleDB is used specifically because gate-transaction volume is naturally time-series in shape (an append-only stream of timestamped events), and its hypertable partitioning gives efficient range queries ("all gate events for Vehicle X in the last 30 days") without hand-rolled partitioning logic in application code.

---

## 3. Foundational Design Principles

### 3.1 Offline-First

Offline-first is not a fallback mode; it is the primary operating assumption. The edge terminal is designed as if it will *never* have connectivity, with sync treated as an optimization that happens to be available most of the time. Concretely:

- All gate-decision logic (token lookup, biometric match, barrier release) executes against local SQLite reads only.
- The Sync Client runs as a background process that never sits on the critical path of a gate decision.
- The UI never presents a spinner-while-we-check-the-server state for a gate action; the answer is always available locally within the sub-500ms latency target (see Non-Functional Requirements in the Tech Stack document).

### 3.2 Eventual Consistency

Because the edge terminal and central server can diverge for up to 72 hours, M-FTAMS accepts eventual consistency as a deliberate trade-off against the alternative (strong consistency, which would require blocking gate operations on network availability — unacceptable given the DDIL environment).

Consistency is restored through:
- **Append-only, bi-directional sync.** Neither side ever deletes or overwrites the other's data during sync; new information is merged, not replaced.
- **Conflict-free by design where possible.** Most data (gate transaction logs) is naturally conflict-free because each edge terminal is the sole writer of its own events — there is no scenario where two terminals write the same logical record.
- **Explicit conflict arbitration where not.** The narrow class of genuinely conflicting writes (e.g., a token revoked centrally while already consumed at an edge that hadn't yet synced) is resolved by Last-Write-Wins on hardware timestamp, with every such resolution flagged for human review rather than silently discarded. Full detail is in the companion **Offline-First Synchronization & Conflict Resolution Protocol** document.

### 3.3 Zero-Trust Security

Zero-trust in M-FTAMS means specifically:

- **No implicit trust from network position.** Being physically connected to the cantonment LAN, or being an edge terminal with a valid IP, grants no privilege by itself.
- **Every gate pass is a signed, time-boxed token**, not a database row queried on demand — a token proves its own validity offline without a network round-trip to confirm.
- **Every action is authenticated, authorized, and logged** at the point of execution, not assumed valid because a prior step in the workflow succeeded.
- **Role-based authorization is enforced server-side (and edge-side, for the edge's narrow authority) at the API layer**, never left to client-side UI restrictions alone. See the companion **Security, Cryptography & Access Control Specification** for the full RBAC matrix.

### 3.4 On-Premise Only, Zero Public Cloud Dependency

- All services — central server, database, cache, reverse proxy, edge backends — run in Docker containers inside the cantonment's private network.
- There is no runtime dependency on any public-internet-hosted service: no third-party auth provider, no cloud object storage, no external API for RFID/biometric processing, no telemetry SaaS.
- The only external-facing requirement is a private LAN or leased-line link between each gate and the central server; this link is explicitly assumed to be intermittent, not assumed to be internet-routed, and no inbound/outbound public-internet route is required for normal operation.
- This constraint is architectural, not merely a deployment preference: it shapes technology choices throughout (e.g., self-hosted PostgreSQL rather than a managed cloud database, custom JWT/HMAC signing rather than a third-party identity provider, on-box biometric matching rather than a cloud vision API).

---

## 4. The Eight-Stage Sortie Lifecycle

A **sortie** is the complete lifecycle of a single authorized vehicle movement, from the moment a unit requests it to the moment its outcome is reconciled and archived. Every sortie passes through exactly eight stages, in strict order; no stage may be skipped, and no stage's record may be edited once written — only superseded by a new, later-stage record.

### Stage 1 — Requisition

A unit submits a request through the web portal specifying: destination, purpose, planned distance, and expected return time (ETA). This is the system's only manual data-entry point; everything downstream is either automated or a verification action, deliberately minimizing the surface area for transcription error or falsification.

### Stage 2 — Approval

The Movement Control Officer (MTO) reviews the requisition. The system independently checks vehicle and driver availability before the request even reaches the MTO's queue, so the MTO is never asked to approve a request against an already-committed vehicle. On approval:

- A **signed gate-pass token** is generated (HMAC-SHA256), cryptographically bound to one specific trip, one vehicle, and one driver.
- The token carries a validity window (time-boxed, consistent with the 72-hour offline design target).
- The vehicle's status moves to `RESERVED`.

On rejection, the requisition is closed with a reason code and no token is issued; this, too, is a permanent audit-trail entry.

### Stage 3 — Dispatch & Binding

A driver is formally assigned to the approved trip. At this point the binding of **{trip, vehicle, driver, token}** becomes fixed and immutable — none of the four can be substituted without voiding the token and restarting from Stage 2. Vehicle status moves to `DISPATCHED`.

### Stage 4 — Outbound Gate Handshake

Executed entirely at the edge, entirely offline-capable:

1. **Scan** — RFID/QR tag read; edge terminal matches it against the locally cached token set.
2. **Verify** — Driver confirms identity via fingerprint or smart card; sentry performs a visual cross-check against the on-file photo.
3. **Record** — Sentry logs the current odometer reading and fuel level.
4. **Release** — If all checks pass, the barrier opens, vehicle status becomes `ON_SORTIE`, and an immutable `OUTBOUND` event is appended to the local log for later sync.

Any failed check at this stage halts the handshake; no partial or provisional gate-pass is ever granted.

### Stage 5 — Mission Tracking

While the vehicle is out, the central dashboard displays it as `ON_SORTIE` with a live countdown against its stated return ETA. This stage is explicitly **not** live GPS/telematics tracking — that capability is out of scope for the current phase (see Section 1.3 of the Project Document). Tracking here means status and ETA visibility only. If the ETA lapses without an inbound event, an overdue alert fires automatically to the Alert Service.

### Stage 6 — Inbound Gate Handshake

Structurally identical to Stage 4 (scan → verify → record), performed on return. The sentry logs the return odometer and fuel level. The system computes:

```
actual_distance = return_odometer − outbound_odometer
```

### Stage 7 — Reconciliation

The Reconciliation Service compares actual distance and fuel usage against the planned figures submitted at Stage 1.

- **The 10% distance-deviation audit threshold:** if `actual_distance` exceeds the originally planned distance by more than 10%, the trip is automatically flagged with an `AUDIT_ALERT` and routed for manual review. This threshold exists to surface unauthorized detours, odometer tampering, or genuine operational exceptions worth recording — without generating so much noise from routine rounding/estimation variance that reviewers start ignoring alerts.
- On reconciliation (whether clean or flagged), vehicle status returns to `AVAILABLE`, and the trip record is marked `COMPLETED` (or `COMPLETED_FLAGGED` if the threshold was breached).

### Stage 8 — Archival & Audit

Every record generated across Stages 1–7 — requisition, approval decision, token issuance, both gate-handshake events, the reconciliation outcome, and any alerts raised — is written to the immutable, HMAC-SHA256-signed audit trail described in the Security specification. Nothing produced during the sortie lifecycle is ever deleted or mutated after the fact; the audit trail is the permanent, inspectable record of what happened, decided by whom, and when.

---

## 5. Cross-Cutting Architectural Invariants

These invariants apply across all eight stages and both application-tier contexts, and any implementation change must preserve them:

1. **No gate decision blocks on network I/O.** If this invariant is ever violated by a future change, the offline-first guarantee is broken regardless of what the documentation says.
2. **No audit record is ever updated or deleted in place.** State changes are represented as new rows referencing prior state, never as `UPDATE`/`DELETE` against historical rows.
3. **A token's validity is self-contained.** An edge terminal must be able to determine a token's authenticity and binding using only data already in its local cache plus the token's own signature — never by querying the central server synchronously.
4. **Role scope is enforced at the API boundary**, independent of what any given UI happens to render or hide.
5. **Every cross-tier data flow (downlink snapshot, uplink batch) is versioned and idempotent** — replaying a sync batch must not double-apply its effects. This is elaborated in the Synchronization Protocol document.
