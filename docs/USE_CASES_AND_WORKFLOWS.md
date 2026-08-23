# M-FTAMS Use Cases & Operational Workflows
## Complete Specification of Sortie Lifecycle & Air-Gapped Edge Scenarios

---

## 1. End-to-End Sortie Lifecycle Overview

```
 +--------------+     +--------------+     +--------------+     +--------------+
 ¦   STAGE 1    ¦     ¦   STAGE 2    ¦     ¦   STAGE 3    ¦     ¦   STAGE 4    ¦
 ¦ Requisition  ¦----?¦ MTO Approval ¦----?¦ Token Mint   ¦----?¦ Outbound     ¦
 ¦ Form Submit  ¦     ¦ & Asset Bind ¦     ¦ & Chit Print ¦     ¦ Sentry Scan  ¦
 +--------------+     +--------------+     +--------------+     +--------------+
                                                                       ¦
 +--------------+     +--------------+     +--------------+            ¦
 ¦   STAGE 8/9  ¦     ¦   STAGE 7    ¦     ¦   STAGE 6    ¦            ?
 ¦ Audit Hash   ¦?----¦ >10% Anomaly ¦?----¦ Inbound Gate ¦     +--------------+
 ¦ Verification ¦     ¦ Reconcile    ¦     ¦ Handshake    ¦?----¦   STAGE 5    ¦
 +--------------+     +--------------+     +--------------+     ¦ Sortie En    ¦
                                                                ¦ Route Telemetry
                                                                +--------------+
```

---

## 2. Detailed Use Case Specifications

### USE CASE 1: Standard Sortie Requisition (Stage 1)
- **Primary Actor**: Requesting Unit Duty Officer (e.g. 4 RAJPUT, Alpha Coy)
- **Pre-Conditions**: Unit requires vehicle movement outside the cantonment wire for tactical or logistics purposes.
- **Main Success Scenario**:
  1. Officer navigates to **Sortie Requisitions** (`/requisitions`).
  2. Officer enters Destination (`LZ-ECHO 44.9N 12.3E`), Purpose (`Ammunition Resupply`), Planned Distance (`145 km`), and Zulu Departure / Return ETAs.
  3. Officer inputs Tactical Notes (`Route ALPHA compromised. Recommend alternate via canyon pass.`).
  4. System verifies that the requested destination coordinates and planned distance are plausible.
  5. Officer submits the requisition. Status is logged as `PENDING`.
- **System Invariant**: Requisitions cannot be self-approved; only the Motor Transport Officer (MTO) holds authorization authority.

---

### USE CASE 2: MTO Approval & Cryptographic Asset Binding (Stage 2 & 3)
- **Primary Actor**: Motor Transport Officer (`MTO`)
- **Pre-Conditions**: One or more requisitions are in `PENDING` state.
- **Main Success Scenario**:
  1. MTO opens **Pending Approvals** (`/mto-queue`).
  2. MTO selects requisition `REQ-7729-AX`.
  3. MTO inspects Cargo Manifest (`5.56mm M855A1 x10,000 rds`, `AT4 x12`), Total Weight (`3,450 lbs`), and Route Condition (`AMBER`).
  4. MTO binds available vehicle `25A-4471` (Ashok Leyland 4x4) and qualified driver `Nb Sub Rakesh Yadav` (Card ID `SC-2291`).
  5. MTO clicks **`Initiate Approve & Bind`**.
  6. Central Server computes HMAC-SHA256 signature across `TokenID + VehicleID + DriverID + Destination + ValidTo` and transitions sortie to `APPROVED`.
  7. System generates printable Gate-Pass Chit containing the 2D QR Code.
- **Alternative Flow (Rejection)**:
  - If vehicle is unfit or route is closed, MTO clicks **`Reject Requisition`** and supplies mandatory reason. Sortie transitions to `REJECTED`, releasing any reserved vehicle.

---

### USE CASE 3: Sub-500ms Outbound Gate Scan & Barrier Control (Stage 4)
- **Primary Actor**: Sentry Duty Officer at Gate Terminal
- **Pre-Conditions**: Vehicle and driver arrive at Gate 04 with an approved sortie token.
- **Main Success Scenario**:
  1. Sentry selects **`[New Outbound]`** on the Kiosk terminal.
  2. Vehicle rolls onto inductive loop; RFID reader captures tag `RFID-A17E9C` (or Sentry scans QR on paper chit).
  3. Edge node queries local SQLite cache:
     - Verifies token signature is cryptographically valid.
     - Confirms vehicle and driver IDs match active sortie.
     - Checks timestamp is within the 72-hour validity window.
  4. Decision resolves in **$<500\text{ms}$**. Kiosk displays verified Driver Photo and Vehicle Plate.
  5. Sentry enters current Odometer (`18,420 km`) and confirms Fuel (`78%`).
  6. Sentry clicks **`[Authorize & Log]`**.
  7. Edge node fires Modbus/GPIO relay, raising physical boom barrier.
  8. Outbound event is queued in local outbox with exact hardware timestamp and sortie transitions to `DISPATCHED`.

---

### USE CASE 4: Live Fleet Readiness & Overdue Detection (Stage 5)
- **Primary Actor**: Base Commander (`COMMANDER`)
- **Main Success Scenario**:
  1. Commander views Common Operating Picture (COP) on **Fleet Readiness Overview** (`/`).
  2. Active Sorties radar map updates in real time, showing unit coordinates, bearing (`042° NNE`), and target ETAs.
  3. If a vehicle exceeds its planned Zulu return ETA by $>15\text{ minutes}$, the system generates an immediate critical alert (`OVERDUE: CONVOY DELTA`).
  4. Commander reviews vehicle telemetry, driver comms POC, and last known ping location to initiate tactical recovery if needed.

---

### USE CASE 5: Inbound Gate Handshake & 10% Deviation Rule (Stage 6 & 7)
- **Primary Actor**: Sentry Duty Officer & Reconciliation Engine
- **Pre-Conditions**: Vehicle returns to Cantonment Gate after completing mission.
- **Main Success Scenario**:
  1. Sentry selects **`[New Inbound]`** on the Kiosk.
  2. Sentry scans RFID / Smart Card.
  3. Sentry inputs return Odometer reading (`18,465.6 km`) and Fuel level (`60%`).
  4. System calculates Actual Distance Traveled:
     $$\Delta \text{Dist} = \text{Odo}_{\text{inbound}} - \text{Odo}_{\text{outbound}} = 18,465.6 - 18,420.0 = 45.6\text{ km}$$
  5. System compares actual distance against Planned Distance ($40.0\text{ km}$):
     $$\text{Deviation} = \frac{45.6 - 40.0}{40.0} = +14.0\%$$
  6. Because deviation exceeds the strict **$10\%$ military threshold**, the sortie transitions to `COMPLETED_FLAGGED` and raises an `AUDIT_ALERT`.
  7. Sentry clicks **`[Authorize & Log]`**; barrier raises to admit vehicle.

---

### USE CASE 6: Sortie Anomaly Investigation & Resolution
- **Primary Actor**: Commander / MTO
- **Pre-Conditions**: Sortie flagged with $>10\%$ distance deviation in the Reconciliation queue.
- **Main Success Scenario**:
  1. Officer navigates to **Sortie Reconciliation** (`/reconciliation` or `/flagged`).
  2. Officer selects flagged trip `TRP-8821-X` ($+14.0\%$ deviation) from the **Reconciliation Deviations** panel.
  3. Officer clicks **`[Investigate]`** to open the Investigation Modal.
  4. Officer reviews driver debrief: *"Bridge collapse on Primary Route required 5.6km diversion through mountain pass."*
  5. Officer enters finding notes and clicks **`Sign & Resolve Audit`**.
  6. The justification is permanently committed to the immutable audit ledger.

---

### USE CASE 7: 72-Hour Sustained Offline Outage & Resynchronization
- **Scenario**: Enemy jamming or physical fiber line severance isolates Gate 04 from Cantonment HQ.
- **Execution Flow**:
  1. Edge node detects network uplink loss and switches seamlessly to **Autonomous Offline Mode**.
  2. Sentries continue scanning arriving and departing vehicles against the local 72-hour SQLite mirror with zero latency degradation.
  3. Ingress/egress transactions are signed with the Edge node private key and spooled locally.
  4. 72 hours later, fiber connection is restored.
  5. Edge node initiates an idempotent `POST /sync/uplink` transaction batch.
  6. Central Server validates every event signature, updates global vehicle locations, and flags any accumulated mileage deviations without data loss or duplicate records.

---

### USE CASE 8: Provost Marshal Cryptographic Audit Trail Verification
- **Primary Actor**: Military Provost Marshal / Lead Auditor
- **Main Success Scenario**:
  1. Auditor navigates to **Security Audit Logs** (`/audit`).
  2. System displays the full immutable ledger with SHA-256 block hashes ($H_0, H_1, \dots, H_n$).
  3. Auditor clicks **`Verify Hash Chain`**.
  4. Backend re-computes every cryptographic link sequentially across the entire event history.
  5. Confirmation badge displays: `HASH CHAIN INTEGRITY: 100% VERIFIED (0 TAMPER DETECTED)`.
  6. Auditor clicks **`Export Certified Ledger`** to generate an encrypted official report for Provost Marshal records.

---

### USE CASE 9: Emergency Lockdown & Perimeter Hardening
- **Primary Actor**: Commander / Sentry Post Commander
- **Scenario**: Hostile perimeter breach or active base defense alert.
- **Execution Flow**:
  1. Commander clicks **`EMERGENCY LOCKOUT`** in the Command Sidebar.
  2. Edge daemon immediately actuates all hardware relays, lowering all physical boom barriers.
  3. Edge nodes lock out manual sentry overrides and sound perimeter sirens.
  4. High-priority audit record `EMERGENCY_LOCKOUT_ACTUATED` is broadcast and sealed into the hash chain.
