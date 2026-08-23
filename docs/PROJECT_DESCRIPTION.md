# Military Fleet Telemetry & Access Management System (M-FTAMS)
## System Overview & Architecture Specification

---

## 1. Executive Summary

Military formations operate hundreds of tactical and logistics vehicles across dispersed cantonments, forward operating bases (FOBs), and border sectors. Traditional paper-based vehicle logging (*"Car Diaries"*, physical gate registers, and manual trip chits) suffers from critical operational vulnerabilities:
- **Mileage Fraud & Unauthorized Sorties**: Odometer rollbacks, unlogged personal detours, and ghost trips.
- **Fuel Siphoning**: Unaccounted fuel burn during unapproved diversions.
- **Sentry Bottlenecks**: Manual paper checks cause severe convoy ingress/egress delays.
- **Zero Real-Time Visibility**: Unit commanders lack a real-time Common Operating Picture (COP) of vehicles outside the perimeter.
- **Audit Insecurity**: Paper registers are easily altered, lost, or backdated.

**M-FTAMS (Military Fleet Telemetry & Access Management System)** is an enterprise-grade, air-gapped, zero-cloud, offline-capable fleet tracking, access control, and reconciliation platform designed strictly for defense cantonments and high-security installations.

---

## 2. Core Architectural Principles

### 2.1 Zero-Cloud & Air-Gapped Operation
Per defense cybersecurity directives, M-FTAMS **never depends on third-party cloud infrastructure or external SaaS endpoints in the critical gate decision path**. 
- The **Central Server** runs strictly on on-premise servers within the Cantonment HQ Data Center.
- **Edge Gate Nodes** run locally on industrial touch-terminals and SBCs (Single Board Computers) at every physical gate.

### 2.2 Offline-First Edge Resiliency (<500ms Invariant)
Gate ingress and egress decisions are **guaranteed to execute in under 500 milliseconds**, even when the fiber uplink between the gate and HQ is physically severed:
- Edge nodes maintain a locally cached, read-optimized SQLite mirror of all active authorized gate-pass tokens, vehicle RFID tags, and driver smart cards.
- Gate access decisions never make synchronous network calls.
- When offline, Edge Nodes locally record and sign ingress/egress transactions. Once network connectivity is restored, transactions automatically sync to the Central Server via an idempotent batch protocol.

### 2.3 Cryptographic Integrity (HMAC-SHA256 & Hash Chains)
- **Gate-Pass Tokens**: Digitally signed using HMAC-SHA256 keys issued by the Motor Transport Officer (MTO). Tokens contain tamper-evident bindings between `TokenID`, `VehicleID`, `DriverID`, `Destination`, and `ExpirationZulu`.
- **Immutable Audit Ledger**: Every system action (requisitions, approvals, gate scans, overrides, and rejections) is appended to a cryptographically linked SHA-256 hash chain ($H_n = \text{SHA256}(H_{n-1} \parallel \text{Payload}_n)$), making retroactive tampering impossible.

### 2.4 Stratum-1 Time-Discipline
All nodes synchronize against an internal GPS/PPS-disciplined Stratum-1 NTP server. Any clock drift exceeding **$\pm 30$ seconds** automatically triggers a `CLOCK_SKEW_SUSPECTED` alert to prevent replay attacks and backdated ledger injection.

---

## 3. System Topology & Modules

```
 +--------------------------------------------------------------------------+
 ¦                     CANTONMENT CENTRAL SERVER (HQ)                       ¦
 ¦  +--------------------------+  +--------------------------------------+  ¦
 ¦  ¦  Node.js / Express API   ¦  ¦ PostgreSQL / SQLite Master Datastore ¦  ¦
 ¦  ¦  - RBAC Middleware       ¦  ¦ - 1,240+ Fleet Asset Registry        ¦  ¦
 ¦  ¦  - HMAC Token Minter     ¦  ¦ - Cryptographic Hash Chain Audit Log ¦  ¦
 ¦  ¦  - Sync Downlink/Uplink  ¦  ¦ - 10% Anomaly Reconciliation Engine ¦  ¦
 ¦  +-------------?------------+  +--------------------------------------+  ¦
 +----------------+---------------------------------------------------------+
                  ¦ Idempotent JSON Sync Protocol (mTLS / Internal LAN)
 +----------------?---------------------------------------------------------+
 ¦               EDGE SENTRY GATE NODES (Gate 01 - Gate 08)                 ¦
 ¦  +--------------------------+  +--------------------------------------+  ¦
 ¦  ¦  Edge Backend Daemon     ¦  ¦ Local SQLite Cache & Event Queue     ¦  ¦
 ¦  ¦  - <500ms Tag Resolver   ¦  ¦ - Active 72h Token Snapshots         ¦  ¦
 ¦  ¦  - Hardware Relay Driver ¦  ¦ - Offline Local Event Outbox         ¦  ¦
 ¦  +-------------?------------+  +--------------------------------------+  ¦
 +----------------+---------------------------------------------------------+
                  ¦ Touchscreen UI & Scanner Bus (USB / Wiegand / Modbus)
 +----------------?---------------------------------------------------------+
 ¦                        USER INTERFACE LAYER                              ¦
 ¦  1. Tactical Web Dashboard (Port 5173): Commander COP, MTO, Admin        ¦
 ¦  2. Sentry Gate Access Kiosk (Port 3000): Touch-screen Scan & Barrier    ¦
 +--------------------------------------------------------------------------+
```

---

## 4. Key Components Breakdown

| Component | Path | Technology | Responsibilities |
|---|---|---|---|
| **Central Backend** | `/backend` | Node.js, Express, TypeScript, Crypto | Authentication, RBAC, Requisition approvals, HMAC-SHA256 token minting, Reconciliation anomaly engine, Hash-chain audit exporter. |
| **Tactical Dashboard** | `/frontend-dashboard` | React, Vite, Tailwind CSS, Lucide | Commander COP with Live Radar tracking, Stage 1 Sortie Requisitions, Stage 2 MTO Asset Binding, Reconciliation lifecycle tables, Cmd+K Global Palette. |
| **Sentry Gate Kiosk** | `/frontend-kiosk` | React, Vite, Tailwind CSS, Lucide | Rapid touchscreen interface for Sentries. Simulates 13.56MHz RFID scans, 2D QR token decode, Odometer/Fuel entry, and Boom-Barrier actuation. |
| **Edge Backend** | `/edge-backend` | Node.js, Express, SQLite3 | Sub-500ms offline token validation, local event spooling, GPIO/Modbus relay control, atomic cache synchronization. |
| **Edge Simulator** | `/edge-simulator` | Node.js, Jest | Multi-gate network partition simulator, 72h offline stress testing, clock drift injection, and automatic reconnect replay verification. |

---

## 5. Security & RBAC Enforcement Matrix

| Action / Capability | COMMANDER | MTO (Transport Officer) | SENTRY | ADMIN |
|---|---|---|---|---|
| View Fleet Readiness & Live Radar | Full Access | Full Access | No | Full Access |
| Submit Sortie Requisition (Stage 1) | No | Yes | No | Yes |
| Approve / Bind Requisition (Stage 2) | No | **Yes (Exclusive)** | No | No |
| Reject Requisition with Reason | No | **Yes (Exclusive)** | No | No |
| Scan & Dispatch Outbound (Stage 4) | No | No | **Yes (Exclusive)** | Yes |
| Log Inbound Return & Odometer (Stage 6) | No | No | **Yes (Exclusive)** | Yes |
| Sentry Override with Remarks | No | No | **Yes (Logged)** | No |
| Investigate Reconciliation Anomaly (>10%) | **Yes** | **Yes** | No | Yes |
| User Role Modification & Security Audit | No | No | No | **Yes** |
