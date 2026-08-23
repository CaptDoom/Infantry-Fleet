# M-FTAMS — Offline-First Synchronization & Conflict Resolution Protocol

**Document Class:** Technical / Unclassified Prototype
**Companion to:** System Architecture & Core Design Document
**Version:** 1.0

---

## 1. Purpose and Scope

This document specifies, at implementation precision, how data moves between the central server and each edge terminal, how conflicting writes are detected and resolved, and how the protocol degrades gracefully under clock drift, extended outages, and partial failures. It governs the **Sync Service** (central) and **Sync Client** (edge) components introduced in the Architecture document.

The protocol has exactly two directions and one conflict-resolution rule. Simplicity here is deliberate: a sync protocol that gate operations depend on for correctness must be auditable by inspection, not just by test coverage.

---

## 2. Protocol Overview

| Direction | Trigger | Payload |
|---|---|---|
| **Downlink** (server → edge) | Every 5 minutes | Compressed snapshot: active gate-pass tokens, vehicle registry, driver registry, revocation/blacklist entries |
| **Uplink** (edge → server) | Every 5 minutes, or immediately on reconnect | Batch of `PENDING` gate-transaction log entries |
| **Conflict resolution** | On overlapping edits detected during ingestion | Last-Write-Wins by hardware timestamp; conflicting rows are never deleted or silently merged — they are flagged for manual review |

Downlink and uplink are independent, asynchronous exchanges — a failed downlink does not block a pending uplink and vice versa. Each edge terminal maintains its own sync cursor; terminals never coordinate with one another.

---

## 3. Downlink Protocol (Server → Edge)

### 3.1 Trigger Conditions

- **Scheduled:** every 5 minutes per edge terminal, staggered across terminals to avoid a thundering-herd load spike on the central server.
- **On-demand:** an edge terminal may request an out-of-cycle downlink immediately upon detecting reconnection after an outage, so that a terminal coming back online after (for example) a 40-hour gap does not wait up to 5 minutes to receive revocations that occurred during the outage.

### 3.2 Payload Composition

The downlink snapshot is a compressed (gzip) bundle containing four logical sets, each versioned independently:

```json
{
  "snapshot_version": "2026-08-22T09:05:00Z#00417",
  "edge_id": "GATE-04",
  "generated_at": "2026-08-22T09:05:00.812Z",
  "tokens": [
    {
      "token_id": "uuid",
      "signature": "hmac-sha256-hex",
      "trip_id": "uuid",
      "vehicle_id": "uuid",
      "driver_id": "uuid",
      "issued_at": "iso8601",
      "valid_until": "iso8601",
      "status": "ACTIVE | CONSUMED | REVOKED"
    }
  ],
  "vehicles": [
    { "vehicle_id": "uuid", "registration": "string", "status": "AVAILABLE|RESERVED|DISPATCHED|ON_SORTIE|MAINTENANCE", "photo_hash": "sha256" }
  ],
  "drivers": [
    { "driver_id": "uuid", "name": "string", "credential_hash": "sha256", "photo_hash": "sha256", "status": "ACTIVE|SUSPENDED" }
  ],
  "revocations": [
    { "token_id": "uuid", "revoked_at": "iso8601", "reason_code": "string" }
  ]
}
```

### 3.3 Application Semantics — Atomic Replace, Not Merge

The edge terminal treats each downlink as an **atomic full replacement** of its local cache tables for tokens, vehicles, drivers, and the blacklist — not an incremental patch. This is a deliberate simplification:

- It eliminates an entire class of drift bugs that incremental-patch protocols are prone to (missed deltas, out-of-order patch application).
- It is affordable because the snapshot, even for a cantonment-scale fleet, is small enough (low tens of thousands of rows at most) to compress and transfer well within the 5-minute cycle over even degraded links.
- The replacement is wrapped in a single SQLite transaction: the edge terminal never operates against a half-applied snapshot. If the transaction cannot complete (e.g., power loss mid-write), SQLite's transactional guarantees ensure the terminal simply continues operating against its last-known-good snapshot until the next successful downlink.

### 3.4 What the Downlink Deliberately Excludes

The downlink never includes the offline transaction queue, historical audit records, or anything the edge terminal itself produced — those flow only on the uplink. This keeps the direction of authority unambiguous: the central server is authoritative for *reference data* (who/what is valid), the edge terminal is authoritative for *events it personally witnessed* (what happened at this gate).

---

## 4. Uplink Protocol (Edge → Server)

### 4.1 Trigger Conditions

- **Scheduled:** every 5 minutes, same cadence as downlink but independently timed — an edge terminal does not need to wait for a successful downlink to attempt an uplink.
- **Immediate:** the Sync Client detects TCP/TLS reachability of the central server and immediately attempts to flush the entire pending queue, rather than waiting for the next scheduled tick. This is the primary mechanism by which a 30-hour outage does not turn into a 30-hour-plus-5-minute recovery.

### 4.2 Payload Composition

```json
{
  "edge_id": "GATE-04",
  "batch_id": "uuid",
  "generated_at": "iso8601",
  "hardware_clock_at_generation": "iso8601",
  "events": [
    {
      "event_id": "uuid",
      "event_type": "OUTBOUND | INBOUND",
      "trip_id": "uuid",
      "vehicle_id": "uuid",
      "driver_id": "uuid",
      "token_id": "uuid",
      "odometer_reading": 48213,
      "fuel_level_pct": 82,
      "hardware_timestamp": "iso8601",
      "sentry_id": "uuid",
      "event_signature": "hmac-sha256-hex",
      "sync_status": "PENDING"
    }
  ]
}
```

Every event is individually signed at the moment it is written to the local queue (not at uplink time), so its authenticity does not depend on the sync process itself — a compromised or buggy Sync Client cannot forge a valid-looking event after the fact.

### 4.3 Server-Side Ingestion Sequence

On receipt of an uplink batch, the central server performs, strictly in this order:

1. **Signature validation** — every event's HMAC-SHA256 signature is verified against the edge terminal's pre-shared secret before anything else happens. A batch containing even one invalid signature is rejected in its entirety and logged as a security event; partial acceptance of a suspect batch is never performed.
2. **Idempotency check** — each `event_id` is checked against already-ingested events. Because the Sync Client retries on any ambiguous response (timeout, partial write), the server must treat re-delivery of an already-applied batch as a no-op, not a duplicate insert. Idempotency is enforced via a unique constraint on `event_id` at the database level, not merely application-level deduplication logic.
3. **Row insertion** — validated, non-duplicate events are inserted into the central `gate_transactions` table (a TimescaleDB hypertable).
4. **Reconciliation trigger** — for any `INBOUND` event that completes a sortie, the Reconciliation Service runs immediately as part of the same ingestion transaction (see the Architecture document, Stage 7).
5. **Sync-state update** — the edge terminal's `sync_status` record (last successful uplink timestamp, last acknowledged `batch_id`) is updated, which the edge terminal uses to prune its local queue of confirmed-delivered events.

### 4.4 Acknowledgment and Queue Pruning

The server returns an explicit list of accepted `event_id`s in its response. The edge terminal only removes an event from its local `PENDING` queue once it has positive confirmation of that specific `event_id`'s acceptance — never on the basis of "the HTTP call returned 200," since a 200 with a partial-acceptance body is a valid and expected response (e.g., if one event in a batch was already ingested from a prior partial sync).

---

## 5. Conflict Resolution

### 5.1 What Counts as a Conflict

Given the architecture in Section 2 of the Architecture document (each edge terminal is the sole writer of its own gate-transaction events), true write-write conflicts on the *same logical record* are rare by design. The conflict classes that do occur are:

| Conflict Class | Example | Resolution |
|---|---|---|
| **Stale-reference conflict** | A token is revoked centrally (e.g., driver reported unfit) while an edge terminal, still offline, has already consumed that token for an outbound event | LWW does not silently override the consumed event; instead the revocation and the pre-revocation consumption both persist as historical fact, and the case is auto-flagged for manual review (see 5.3) |
| **Concurrent-update conflict** | Two administrative edits to the same vehicle record occur — one at the central dashboard, one queued from an edge terminal's local override capability — before either has synced | Last-Write-Wins by hardware timestamp determines which edit becomes the *current* value; the losing edit is retained as a superseded historical row, never deleted |
| **Clock-skew-induced ordering conflict** | Two events that are causally ordered in reality (e.g., an outbound and its matching inbound) arrive with hardware timestamps that appear out of order due to drift | Detected by the skew-monitoring described in 5.4; does not change LWW's data outcome but is surfaced as a data-quality flag |

### 5.2 Last-Write-Wins (LWW) Mechanism

- Every mutable record synced through this protocol carries a `hardware_timestamp` set by the originating device's local clock at the moment of the write — never a server-assigned or client-wall-clock timestamp that could be more easily manipulated post hoc from a UI layer.
- When the central server ingests two writes to the same logical record with different `hardware_timestamp` values, the write with the later timestamp becomes the record's current value.
- **The losing write is never deleted.** It is retained as a superseded row in an append-only history table (`{table}_history`), preserving the full invariant from the Architecture document that nothing is edited or deleted in place. LWW determines *which value is authoritative going forward*, not *which fact is discarded*.

### 5.3 Manual Review Flagging

Any conflict resolution that touches a security-relevant record (tokens, revocations, RBAC assignments) — as opposed to a routine data-quality conflict — is automatically routed to the Alert Service as a `SYNC_CONFLICT` alert visible on the Commander Dashboard and MTO Panel. This is a deliberate policy choice: **LWW resolves the data conflict so the system keeps functioning, but it never resolves the operational question of whether a security-relevant divergence deserves human attention.** The two concerns are handled separately.

### 5.4 Clock-Drift Mitigation

Because LWW's correctness depends entirely on hardware timestamps being trustworthy relative to one another, clock drift between edge devices is treated as a first-class operational risk, not an edge case:

1. **Periodic NTP synchronization** — every edge terminal synchronizes its hardware clock via NTP whenever it has connectivity (piggybacked on the same window as the sync protocol's uplink/downlink, not a separate schedule to manage).
2. **Skew monitoring** — each uplink batch includes `hardware_clock_at_generation` (Section 4.2). The central server compares this against its own clock (assumed authoritative and NTP-disciplined) and computes the delta for every batch.
3. **Tolerance threshold and escalation** — a delta within the configured tolerance (a strict, documented number of seconds, set during deployment configuration — not left as an undocumented magic constant in code) is logged silently as routine telemetry. A delta exceeding tolerance triggers an alert to the Alert Service *and* causes that terminal's subsequent LWW comparisons to be flagged with a `CLOCK_SKEW_SUSPECTED` annotation until the drift is corrected, so reviewers examining a conflict know to weight the timestamp evidence accordingly rather than trusting it blindly.
4. **No automatic clock correction mid-session** — the edge terminal's system clock is never silently stepped backward during active operation (which could otherwise corrupt in-flight event ordering); clock correction via NTP is applied using slew (gradual adjustment), and any correction large enough to require a step is deferred to terminal restart.

### 5.5 Revocation Propagation Latency

Because revocations only take effect at an edge terminal on its next successful downlink, there exists an inherent window (bounded by the 5-minute cycle in normal operation, or up to 72 hours in a worst-case sustained outage) during which a revoked token could still be presented at an offline gate. This is a known, documented, accepted risk rather than a defect, mitigated by:

- The **sentry override-with-remarks procedure**: a sentry can proceed against a token that fails an edge-case check, but must enter a mandatory remark, and the override itself is logged as a distinct, permanently flagged audit event — it is never indistinguishable from a routine pass.
- Bounding worst-case exposure at the 72-hour offline design limit itself, which is why 72 hours is treated as a hard operational ceiling (see hardware/power provisioning in the Implementation document) rather than an aspirational target.

---

## 6. Failure Modes and Recovery

| Failure | System Behavior |
|---|---|
| Edge terminal loses power mid-sync | SQLite transaction guarantees mean the in-progress downlink or queue-prune is rolled back cleanly; on restart the terminal resumes from its last committed state and retries sync on its normal schedule |
| Central server briefly unreachable during scheduled uplink | Sync Client retries with exponential backoff (bounded) up to the next scheduled tick; queue is never lost, only delayed |
| Central server database is unavailable but the API process is up | Sync Service returns a definitive failure (not a false success) so edge terminals do not prematurely prune their queues |
| Uplink batch partially fails signature validation | Entire batch rejected (see 4.3.1); server logs a security event with the offending `edge_id` for investigation, since a signature failure is either a bug or an attempted forgery — both warrant the same halt-and-alert response |
| Extended outage exceeding 72 hours | Outside the documented design envelope; the edge terminal continues serving gate decisions against its last valid snapshot (tokens may expire per their own `valid_until`, at which point the terminal correctly denies them even with zero connectivity — this is not a sync failure, it is the token expiry mechanism working as designed) |

---

## 7. Explicit Non-Goals of This Protocol

To prevent scope creep from being read back into this specification:

- This protocol does not attempt real-time (sub-5-minute) synchronization; that would reintroduce a network dependency on the gate-decision critical path, violating the offline-first invariant.
- This protocol does not perform automatic, unattended resolution of security-relevant conflicts (Section 5.3) — human review is mandatory by design, not a placeholder for a future automation.
- This protocol does not federate data between multiple cantonments; multi-site federation is explicitly out of scope for the current phase per the Project Document's scope boundary.
