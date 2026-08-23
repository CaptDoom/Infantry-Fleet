# M-FTAMS — Security, Cryptography & Access Control Specification

**Document Class:** Technical / Unclassified Prototype
**Companion to:** System Architecture & Core Design Document
**Version:** 1.0

---

## 1. Purpose and Scope

This document specifies the end-to-end trust model, the exact cryptographic constructions used for token and log integrity, the full Role-Based Access Control (RBAC) matrix, and the network transport security requirements for M-FTAMS. It is written at a level of detail sufficient for implementation and for independent security review, but it deliberately does not include actual deployment secrets, key material, or vendor-specific hardware security module (HSM) configuration — those belong in a restricted-distribution operations runbook, not this document.

---

## 2. End-to-End Trust Model

### 2.1 Trust Boundaries

M-FTAMS defines five distinct trust boundaries, each requiring its own authentication and authorization check — no boundary crossing is ever authorized purely by having passed a prior boundary:

1. **User → Presentation tier** (login, session establishment)
2. **Presentation tier → Central Server API** (every request re-validates the session/JWT)
3. **Central Server → Edge Terminal** (mutual authentication via edge pre-shared secret during sync)
4. **Physical actor (driver) → Edge Terminal** (biometric/smart-card verification, independent of any network session)
5. **Edge Terminal → Central Server, at ingestion** (every synced event independently signature-verified, not trusted merely because it arrived from a known `edge_id`)

### 2.2 Zero-Trust Implementation Principles

- **No network-position trust.** An edge terminal on the cantonment LAN presenting a valid TLS client certificate is authenticated as *that terminal*; it is not thereby authorized to act as any other terminal, nor granted elevated privilege because it is "inside the perimeter."
- **No standing trust in a prior decision.** A gate-pass token being present and correctly scanned does not, by itself, authorize gate passage — it must also pass driver verification (Section 2.1, boundary 4) independently. A compromised or stolen token is insufficient on its own because the physical/biometric check is a separate, mandatory factor.
- **Every privileged action is authenticated, authorized, and logged at the point of execution.** There is no action in the system — administrative, approval, or gate-level — that is permitted to proceed on the basis of "the caller looked authorized in a prior request."
- **Least privilege by role.** Every role (Section 4) is scoped to the minimum set of actions required for its function; no role has implicit administrative fallback.

### 2.3 Threat Model Summary

Threat modeling is performed on the requisition → approval → gate flow *before* implementation, per the development methodology (see the SDLC document). The principal threats explicitly designed against are:

| Threat | Primary Mitigation |
|---|---|
| Token forgery (fabricating a valid-looking gate-pass) | HMAC-SHA256 signing with a secret never exposed to any client (Section 3) |
| Token replay (reusing a previously consumed token) | Token `status` transitions to `CONSUMED` on first successful use; edge terminal rejects a second presentation of the same `token_id` |
| Audit-log tampering (altering a past record to hide an event) | Append-only storage with per-entry HMAC signatures and periodic integrity verification (Section 3.3) |
| Privilege escalation via UI manipulation | RBAC enforced server-side at the API layer, never inferred from client state (Section 4) |
| Man-in-the-middle interception on the cantonment LAN | TLS 1.3 mandatory for all traffic (Section 5) |
| Compromised edge terminal impersonating another gate | Per-terminal unique `EDGE_ID` and pre-shared secret; central server validates the signing key matches the claimed `edge_id` on every ingested batch |
| Insider misuse of legitimate credentials | RBAC least-privilege scoping plus immutable audit trail makes misuse detectable and attributable after the fact, even when not preventable in the moment |

---

## 3. Cryptographic Signing Specification

### 3.1 Algorithm Choice

M-FTAMS uses **HMAC-SHA256** for two distinct classes of signed artifact: gate-pass tokens and audit-log entries. HMAC (rather than asymmetric signing) is chosen deliberately for this phase because:

- It is computationally cheap enough to verify at sub-500ms latency on constrained edge hardware with no dedicated cryptographic accelerator.
- The verification party (the edge terminal, for tokens) is fully trusted with the shared secret already, since it is the same party responsible for physically enforcing the gate decision — asymmetric signing would add key-management complexity without a corresponding trust-boundary benefit at this phase.
- `crypto/hmac` and `crypto/sha256` are both Go standard-library primitives, requiring no third-party cryptography dependency.

### 3.2 Gate-Pass Token Signing

**Token structure (conceptual, prior to serialization):**

```
token_id        : UUID, generated server-side at issuance
trip_id         : UUID, foreign key to the approved requisition
vehicle_id      : UUID, bound at Stage 2 (Approval)
driver_id       : UUID, bound at Stage 3 (Dispatch)
issued_at       : ISO-8601 timestamp
valid_until     : ISO-8601 timestamp (time-boxed validity window)
issuer_id       : UUID of the approving MTO
```

**Signing procedure:**

1. The above fields are serialized into a canonical, deterministic byte representation (fixed field order, no whitespace variance — canonicalization is mandatory because HMAC verification is exact-byte-match; any serialization ambiguity would make otherwise-valid tokens fail verification).
2. `signature = HMAC-SHA256(key = central_signing_key, message = canonical_bytes)`.
3. The token is distributed to edge terminals via the downlink snapshot (Section 3 of the Synchronization Protocol document) carrying both its plaintext fields and its `signature`.

**Verification procedure (performed at the edge, offline):**

1. Recompute `HMAC-SHA256(key = shared_signing_key, message = canonical_bytes)` from the token's plaintext fields as received.
2. Compare to the received `signature` using a constant-time comparison (never a standard `==`/string-equality check, to avoid timing side-channel leakage of the correct signature).
3. Reject the token if the comparison fails, if `valid_until` has passed, or if the token's `status` in local cache is `CONSUMED` or `REVOKED`.

**Key management principle:** the signing key used to *issue* tokens exists only on the central server. Edge terminals hold only what is necessary to *verify* — for the HMAC scheme in this phase that is functionally the same shared key, which is why the pre-shared per-edge secret (used for the sync channel, Section 3.4) and the token-verification key are provisioned and rotated together under the same operational control, treated as equally sensitive material, and never logged, embedded in client-side bundles, or transmitted outside the signed downlink payload itself.

### 3.3 Audit-Trail Entry Signing

Every audit-trail entry — gate events, administrative actions, approval/rejection decisions, sync-conflict resolutions — is individually signed at the moment of creation using the same HMAC-SHA256 construction, over a canonical representation of that entry's full content plus a reference to the **previous entry's signature** for that logical stream (a hash-chain pattern). This means:

- Altering any historical entry's content invalidates not just its own signature but every subsequent entry's chain reference, making tampering detectable even if an attacker gains write access to the underlying database and recomputes a single row's signature — they would also need to recompute every downstream signature in the chain, which is infeasible without the signing key.
- **Periodic integrity verification** (per the SDLC document's maintenance schedule) walks the entire chain and confirms every signature and chain reference, surfacing any discrepancy as a critical security alert.
- Audit entries are never updated or deleted; a correction to a prior entry is represented as a new, chained entry referencing the one it corrects, preserving both the original and the correction permanently.

### 3.4 Edge Pre-Shared Secrets

Each edge terminal is provisioned with a unique `EDGE_ID` and a unique pre-shared secret, established out-of-band during physical deployment (not transmitted over the network at first boot). This secret is used to:

- Authenticate the edge terminal's identity during the sync handshake (mutual authentication alongside TLS, Section 5).
- Sign uplinked gate-transaction events (Section 4.2 of the Synchronization Protocol document), so the central server can attribute and verify every event to a specific, known terminal.

Secrets are held in a secrets manager or injected as environment variables at deploy time; they are never committed to source control, and this is enforced by the CI/CD pipeline (secret-scanning on every commit — see the SDLC document).

---

## 4. Role-Based Access Control (RBAC)

### 4.1 Role Definitions

| Role | Description |
|---|---|
| **ADMIN** | Full system configuration authority: user/role management, vehicle and driver registry maintenance, data export, system-wide configuration |
| **MTO** (Movement Control Officer) | Reviews and approves/rejects trip requisitions; issues gate-pass tokens on approval |
| **COMMANDER** | Read-only visibility into fleet status, active sorties, alerts, and audit reports; no write authority anywhere in the system |
| **SENTRY** | Operates the gate kiosk: scans tags, performs identity verification, records odometer/fuel readings, executes the override-with-remarks procedure when applicable |
| **DRIVER** | Views assigned trips; presents credentials at the gate. Has no console/dashboard access — DRIVER's only system interaction is physical, at the kiosk, as the subject of a SENTRY-operated verification |

### 4.2 Permissions Matrix

Legend: **C** = Create, **R** = Read, **U** = Update, **X** = Execute/Action, **—** = No access

| Capability | ADMIN | MTO | COMMANDER | SENTRY | DRIVER |
|---|:---:|:---:|:---:|:---:|:---:|
| Manage user accounts & role assignments | C/R/U | — | — | — | — |
| Manage vehicle registry | C/R/U | R | R | R (own gate's active vehicles) | — |
| Manage driver registry | C/R/U | R | R | R (own gate's active drivers) | R (own record) |
| Submit trip requisition | — | — | — | — | — *(submitted by the requesting unit's authorized submitter, typically configured under ADMIN-delegated unit accounts; MTO/COMMANDER/SENTRY/DRIVER roles do not submit requisitions in their own right)* |
| Approve / reject requisition | — | X | — | — | — |
| Issue gate-pass token | — | X (system-generated on MTO approval) | — | — | — |
| Revoke gate-pass token | C/U | X | — | — | — |
| View own assigned trip | — | — | — | — | R |
| Execute outbound/inbound gate handshake | — | — | — | X | — *(subject of the check, not the operator)* |
| Execute sentry override-with-remarks | — | — | — | X | — |
| View real-time fleet status dashboard | R | R | R | R (own gate context only) | — |
| View active-sortie / overdue alerts | R | R | R | R (own gate context only) | — |
| View audit trail / reports | R | R (own approvals) | R (full, read-only) | — | — |
| Export system data | X | — | — | — | — |
| Configure system-wide settings (thresholds, sync intervals, etc.) | X | — | — | — | — |
| Manage edge terminal provisioning (`EDGE_ID`, secrets) | X | — | — | — | — |

### 4.3 Enforcement Principles

- **Server-side enforcement is mandatory and exclusive.** The React dashboards, panel, and kiosk UIs hide controls a role cannot use, purely for usability — but every corresponding API endpoint independently re-validates the caller's role from their authenticated session/JWT claims. A UI restriction is never treated as a security control.
- **Edge-side role scope is narrower and hardcoded to function, not configurable per deployment.** The kiosk only ever operates as SENTRY-facing; there is no code path by which a kiosk build could exercise MTO- or ADMIN-level API calls, because it holds no credentials or client configuration capable of authenticating as those roles.
- **COMMANDER is architecturally read-only.** This is enforced at the API layer by simply not exposing any mutating endpoint to a COMMANDER-scoped token — not by a permission check that could be misconfigured, but by the absence of a corresponding route registration for that role's authentication middleware.
- **Role changes are themselves audited.** Any change to a user's role assignment is written to the audit trail as an ADMIN action, attributed and timestamped like any other privileged event.

---

## 5. Network Transport Security

### 5.1 TLS Requirements

- **TLS 1.3 is mandatory** for all traffic within the cantonment private network: dashboard/panel/kiosk-to-server API calls, sync exchanges between central server and edge terminals, and any inter-service traffic that crosses a container network boundary.
- Earlier TLS versions (1.2 and below) are disabled at the Nginx reverse-proxy configuration; there is no negotiated fallback.
- Certificates are issued and managed by an internal, cantonment-operated certificate authority — no dependency on a public CA, consistent with the on-premise, zero-cloud-dependency principle.

### 5.2 No Public Internet Exposure

- All traffic remains within the private LAN or leased-line links connecting gates to the central server.
- No inbound or outbound public-internet route is required, or permitted, for normal operation — this is a network-configuration requirement, not merely an application-layer assumption, and is expected to be enforced at the firewall/network layer independent of the application.

### 5.3 Mutual Authentication for Sync

Beyond standard TLS server authentication, each edge terminal's sync connection is mutually authenticated: the edge terminal presents its unique pre-shared secret (Section 3.4) as part of the handshake, and the central server validates that the claimed `EDGE_ID` matches the secret presented before accepting any sync payload from that connection. This prevents a device merely possessing network access to the sync port from impersonating a legitimate edge terminal.

### 5.4 Secrets Handling in Transit and at Rest

- Signing keys and pre-shared secrets are never transmitted in plaintext, never included in client-side (browser or kiosk-UI) bundles, and never written to application logs.
- All secret material at rest is held via a secrets manager or environment-injected configuration, consistent with the CI/CD practices in the SDLC document — never committed to source control, never baked into a container image layer.
