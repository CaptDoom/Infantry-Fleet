# M-FTAMS User Guide & Setup Manual
## Complete Installation, Configuration, and Role-Based User Manual

---

## 1. System Requirements & Prerequisites

- **Operating System**: Linux (Ubuntu 22.04 LTS+, RHEL 9+, Debian 12+) or Windows 10/11 (64-bit)
- **Node.js**: v18.18.0 LTS or v20.x+
- **Package Manager**: npm v9.x or v10.x
- **Hardware (Edge Nodes)**: Industrial Touchscreen PC / Raspberry Pi 4 (4GB RAM) with local SSD storage
- **Hardware (Central Server)**: On-premise server with 4+ CPU Cores, 8GB RAM, and Gigabit NIC

---

## 2. Installation & Quickstart

### 2.1 Clone Repository
```bash
git clone https://github.com/m-ftams/fleet-monitor.git
cd fleet-monitor
```

### 2.2 Install Dependencies Across All Packages
```bash
# Central Backend
cd backend && npm install && cd ..

# Edge Node Backend
cd edge-backend && npm install && cd ..

# Edge Simulator (Test Harness)
cd edge-simulator && npm install && cd ..

# Tactical Web Dashboard
cd frontend-dashboard && npm install && cd ..

# Sentry Gate Access Kiosk
cd frontend-kiosk && npm install && cd ..
```

---

## 3. Starting the Application Services

### 3.1 Start Central Backend (Port 8000)
```bash
cd backend
npm run dev
# Server will listen on http://localhost:8000
# Health check: http://localhost:8000/health
```

### 3.2 Start Tactical Web Dashboard (Port 5173)
```bash
cd frontend-dashboard
npm run dev
# Dashboard available at http://localhost:5173
```

### 3.3 Start Sentry Gate Access Kiosk (Port 3000)
```bash
cd frontend-kiosk
npm run dev
# Touch Kiosk interface available at http://localhost:3000
```

---

## 4. User Guide by Military Role

### 4.1 Commander Role (`COMMANDER`)
The Commander maintains high-level operational readiness and monitors tactical asset positioning:
1. **COP Dashboard (`/`)**:
   - Inspect **Total Fleet Readiness** (`1,240 Units`, `98.2% Combat Ready`).
   - Monitor the **Active Sorties Radar Display** for moving tactical markers (`ALPHA-7`, `BRAVO-9`).
   - Review **Critical Alerts** (e.g. `SYNC FAILURE: NODE-72`, `OVERDUE: CONVOY DELTA`).
2. **Tabular Fleet Telemetry**:
   - Filter active units by status (`EN ROUTE`, `DELAYED`, `STANDBY`, `MAINTENANCE`).
   - Identify distance anomalies flagged with amber warning borders.
   - Click **`Export Data ?`** to download an encrypted JSON telemetry snapshot.
3. **Sortie Reconciliation Investigation**:
   - Navigate to **Sortie Reconciliation** to inspect trips with $>10\%$ distance deviation.
   - Click **`[Investigate]`** on any flagged sortie to review route telemetry and record official commander resolution notes.

---

### 4.2 Motor Transport Officer Role (`MTO`)
The MTO is exclusively authorized to validate trip plausibility, bind assets, and issue gate-pass tokens:
1. **Stage 1: Submit / Review Requisition**:
   - Navigate to **Sortie Requisitions** (`/requisitions`).
   - Enter Destination (`LZ-ECHO 44.9N 12.3E`), Purpose (`Troop Transport`), Planned Distance (`145 km`), and Zulu departure/return ETAs.
   - Review Area Threat Level (`ELEVATED`) and Weather Conditions (`Clear`).
   - Click **`Submit Requisition`**.
2. **Stage 2: Mission Approval & Asset Binding**:
   - Navigate to **Pending Approvals** (`/mto-queue`).
   - Select a pending requisition from the left master queue (e.g. `REQ-7729-AX`).
   - Inspect the Cargo Payload table (`5.56mm M855A1`, `AT4 Anti-Armor`) and Route Condition (`AMBER`).
   - Select an available vehicle (e.g. `25A-4471`) and authorized driver (e.g. `Nb Sub Rakesh Yadav`).
   - Click **`[Initiate Approve & Bind]`**. The backend immediately generates an HMAC-SHA256 token.
3. **Stage 3: Print Gate-Pass Chit**:
   - Click **`[Print Chit]`** on any approved sortie to view the military chit with cryptographic token hash and ZXing-compatible 2D QR code.

---

### 4.3 Sentry Role (`SENTRY`)
Sentries operate the touchscreen Gate Kiosk terminal to enforce perimeter access control:
1. **Outbound Dispatch (Stage 4)**:
   - On the Kiosk (`http://localhost:3000` or `/kiosk`), select **`[New Outbound]`**.
   - Tap the central **Scan ID / Vehicle Tag** frame (or hold the RFID physical tag to the reader).
   - Verify Driver Photo/Smart Card and Vehicle Plate/RFID matches the displayed dossier.
   - Enter current Odometer (`18,420 km`) and adjust the Fuel Slider (`78%`).
   - Click **`[Authorize & Log]`** — the boom barrier relay actuates, raising the gate.
2. **Inbound Return & Reconciliation (Stage 6)**:
   - Select **`[New Inbound]`**.
   - Scan the returning vehicle tag.
   - Enter the ending Odometer reading and Fuel percentage.
   - Click **`[Authorize & Log]`** — the trip closes. If actual mileage exceeded planned distance by $>10\%$, the system automatically flags the sortie for audit.
3. **Emergency Override with Remarks**:
   - If a tag is damaged or biometric verification fails during tactical urgency, click **`[? Override & Remarks]`**.
   - Enter mandatory justification remarks and Sentry Service ID.
   - The transaction is processed and flagged in the immutable audit ledger.

---

### 4.4 System Administrator Role (`ADMIN`)
1. **Personnel & RBAC Management**:
   - Click the User avatar in the Topbar or select **Personnel & RBAC** in the Sidebar.
   - Assign roles (`COMMANDER`, `MTO`, `SENTRY`, `ADMIN`) to base personnel.
   - Revoke compromised smart card credentials.
2. **Audit Verification & Export**:
   - Navigate to **Security Audit Logs** (`/audit`).
   - Inspect SHA-256 hash chains linking every gate transaction and approval.
   - Click **`Verify Hash Chain`** to cryptographically validate zero-tamper integrity.
   - Export official compliance reports for Provost Marshal audits.
3. **Emergency Lockout**:
   - Click **`EMERGENCY LOCKOUT`** in the Sidebar bottom-left to instantly air-gap all edge nodes and lower physical gate barriers.

---

## 5. Verification & Testing Commands

To run all unit, integration, and security test suites:

```bash
# Central Backend (28 tests)
cd backend && npm test

# Edge Node Backend (10 tests)
cd edge-backend && npm test

# Edge Offline Simulator (3 fault injection scenarios)
cd edge-simulator && npm test

# Frontend Production Builds
cd frontend-dashboard && npm run build
cd frontend-kiosk && npm run build
```
