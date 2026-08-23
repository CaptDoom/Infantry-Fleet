# M-FTAMS — Master Documentation Package (v1.0)

Military Fleet Transportation & Access Management System — Production-Grade Documentation Suite

## Contents

| # | Document | Covers |
|---|---|---|
| 1 | [System Architecture & Core Design Document](01_System_Architecture_Core_Design.md) | Three-tier architecture, foundational principles (offline-first, eventual consistency, zero-trust, on-premise), full 8-stage sortie lifecycle |
| 2 | [Offline-First Synchronization & Conflict Resolution Protocol](02_Sync_Conflict_Resolution_Protocol.md) | Downlink/uplink protocol, payload formats, LWW conflict resolution, clock-drift mitigation, failure modes |
| 3 | [Security, Cryptography & Access Control Specification](03_Security_Cryptography_AccessControl.md) | Zero-trust model, HMAC-SHA256 token/audit signing, full RBAC permissions matrix, TLS 1.3 transport requirements |
| 4 | [Database Schemas & API Contracts Blueprint](04_Database_Schemas_API_Contracts.md) | Central PostgreSQL/TimescaleDB schema, edge SQLite schema, full OpenAPI-style endpoint definitions |
| 5 | [SDLC, Testing & Deployment Guide](05_SDLC_Testing_Deployment.md) | Monorepo layout, Docker Compose stacks, testing strategy, risk matrix, roadmap |
| 6 | [Operations & User Manuals](06_Operations_User_Manuals.md) | Sentry Gate Kiosk quick-reference guide; MTO Approval Manual |

## How These Documents Relate

Documents 1–5 form the engineering specification, each building on the prior: Document 1 establishes the architecture and lifecycle that Documents 2–4 implement in detail (sync protocol, security model, data/API layer), and Document 5 governs how that implementation is built, tested, and deployed. Document 6 translates the resulting system into operator-facing instructions for the two roles with the most safety- and audit-critical hands-on responsibilities.

All six documents are internally consistent with, and elaborate on, the source Project Description, Architecture & Implementation Document (v1.0) and the companion "How It Works" briefing deck.
