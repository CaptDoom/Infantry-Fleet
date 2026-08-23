# M-FTAMS — Operations & User Manuals

**Document Class:** Operator-Facing / Unclassified Prototype
**Companion to:** System Architecture & Core Design Document, Security Specification
**Version:** 1.0

---

## Part A — Sentry Gate Kiosk Quick-Reference Guide

### A.1 Purpose

This guide instructs SENTRY personnel on operating the M-FTAMS Gate Kiosk to process outbound and inbound vehicle movements. It assumes no prior computer experience beyond basic touchscreen familiarity, and is designed to be usable under time pressure, including during shift changes and high-traffic periods.

### A.2 Before Your Shift

1. Confirm the kiosk display is on and showing the **Gate Status** home screen (gate identifier, current time, and a green "Ready" indicator in the top corner).
2. If the screen shows a red "Not Synced" or "Offline — Last Sync [time]" banner instead of green, this is **not** a fault requiring you to stop work — the system is designed to keep operating fully offline. Note the banner in your shift log and continue normal operations; report it to your MTO only if it has shown "Offline" for longer than 24 hours.
3. Confirm the RFID/QR reader and fingerprint scanner are powered on (indicator light steady, not blinking).

### A.3 Processing an Outbound Vehicle (Vehicle Leaving)

**Step 1 — Scan**
Tap **"New Outbound"** on the home screen. Ask the driver to present the vehicle's RFID tag or QR gate-pass at the reader. Hold steady until the kiosk beeps and displays the trip details (destination, vehicle registration, assigned driver name, and a photo of both on file).

- If the kiosk displays **"Token Not Found"**: the tag is not in the local cache. Do not wave the vehicle through. Direct the driver to the MTO Panel to confirm the trip was properly approved and synced.
- If the kiosk displays **"Token Expired"** or **"Token Revoked"**: do not release the barrier. Follow the Override Procedure (A.6) only if you have an independent reason to believe the block is an administrative error — otherwise hold the vehicle and contact your MTO.

**Step 2 — Verify**
Ask the driver to place a finger on the fingerprint scanner, or present their smart card. Compare the photo shown on the kiosk screen to the driver in front of you as a visual cross-check — this step is mandatory even when the biometric match succeeds, since it catches a card or credential used by someone other than its owner.

- Green check + matching photo → proceed to Step 3.
- Red X, or a photo that does not match the person in front of you → do **not** proceed. Follow the Override Procedure (A.6) only if instructed by your MTO; otherwise deny passage and log the incident.

**Step 3 — Record**
Enter the current **odometer reading** exactly as shown on the vehicle's dashboard, and select the approximate **fuel level** (the kiosk shows a simple 0–100% slider — use the vehicle's fuel gauge as your reference). Double-check the odometer digits before confirming; this number is the baseline against which the return trip will be measured, and a transcription error here will incorrectly flag the return as a distance-deviation exception.

**Step 4 — Release**
Tap **"Confirm & Release."** The barrier will open automatically once the kiosk shows "Outbound Recorded." The vehicle status updates to **ON_SORTIE** on the central dashboard (this update reaches the dashboard at the next sync cycle if you are currently offline — this is expected and does not affect the validity of what you just recorded).

### A.4 Processing an Inbound Vehicle (Vehicle Returning)

Repeat Steps 1–3 from Section A.3 (scan, verify, record) using the **"New Inbound"** button. The kiosk will show the vehicle's outbound odometer reading alongside the field for the new reading, so you can sanity-check that the new number is plausible (i.e., not lower than the outbound reading). Tap **"Confirm & Release"** to complete the handshake; the system automatically computes the trip's actual distance and runs its reconciliation check — you do not need to do this calculation yourself.

### A.5 Common Situations

| Situation | What To Do |
|---|---|
| Kiosk screen frozen or unresponsive | Do not power-cycle mid-transaction if a barrier is in motion. Wait 10 seconds; if still frozen, use the physical manual barrier release per your gate's standing orders and log a manual entry, then report the kiosk fault immediately. |
| Two vehicles arrive simultaneously | Process one full handshake at a time — the kiosk is single-transaction by design and will not allow a second scan to begin until the current one is confirmed or cancelled. |
| Driver's biometric fails repeatedly (e.g., an injured hand) | Use the smart-card verification method as the alternate factor; do not skip verification entirely. |
| You are unsure whether a Vehicle Status shown is current | Remember the kiosk shows locally cached data, which may be current data that just hasn't reached the central dashboard yet — this is normal offline behavior, not an error, unless the "Last Sync" time is unusually old. |

### A.6 Override-With-Remarks Procedure

Use this only for genuine operational exceptions, never as a routine bypass:

1. Tap **"Override"** on the failed-check screen.
2. Enter a mandatory remark explaining the exception (e.g., "Card reader damaged, verified against unit CO by radio").
3. Confirm your own Sentry ID via your personal login, not the shift-generic terminal login, if your gate uses individual sentry logins.
4. The override is recorded as a distinct, permanently flagged entry — it is never indistinguishable from a routine pass, and it will be reviewed by your MTO/Commander. Using this procedure is not a disciplinary event by itself; failing to log a genuine exception, or using it to bypass a check without genuine cause, is what creates a problem on review.

### A.7 End of Shift

- Confirm all in-progress handshakes are completed or explicitly logged as incomplete with a remark — never leave the kiosk mid-transaction at shift change.
- Brief the incoming sentry on any open items: vehicles still out past ETA, any overrides used, any equipment issues.

---

## Part B — Movement Control Officer (MTO) Approval Manual

### B.1 Purpose

This manual covers the MTO's core responsibility: reviewing submitted trip requisitions and issuing (or declining to issue) cryptographically signed gate-pass tokens. The MTO is the sole human decision point between a unit's request and a vehicle being authorized to leave the cantonment — the entire chain of downstream automation depends on this review being genuinely substantive, not a rubber stamp.

### B.2 Accessing Your Approval Queue

1. Log into the MTO Panel with your credentials.
2. Your **Pending Approvals** queue lists every requisition with status `SUBMITTED`, sorted by requested departure time (soonest first).
3. Each entry shows: requesting unit, destination, purpose, planned distance, requested departure, and expected return — exactly what the unit entered, with no system-side embellishment.

### B.3 Reviewing a Requisition

Before approving, verify:

- **Purpose and destination are consistent with the unit's known activity.** The system does not and cannot judge whether a stated purpose is legitimate — that judgment is yours.
- **Planned distance and timing are plausible** for the stated destination. An implausible figure is worth a clarifying query back to the unit before approval, not a rejection by default.
- **Vehicle and driver availability** — the system has already filtered out any vehicle/driver combination that is not currently available, so if you reach the point of selecting a vehicle and driver, both shown as available are genuinely free; you do not need to separately verify status.

### B.4 Approving a Requisition

1. Open the requisition and tap **"Approve."**
2. Select a **vehicle** from the available list, then select a **driver** from the available list. The system will not let you select a vehicle or driver already committed to another active trip.
3. Confirm. The system will:
   - Generate a signed gate-pass token bound to this specific trip, vehicle, and driver combination.
   - Set the token's validity window automatically (you do not set this manually).
   - Move the vehicle's status to `RESERVED`.
4. The requisition now shows status `APPROVED` with the token ID displayed for your reference. **This binding cannot be changed after approval** — if the wrong vehicle or driver was selected, do not attempt to "fix" it by re-approving; instead revoke the token (Section B.6) and have the unit submit a fresh requisition, or escalate per your unit's standing procedure if urgency does not permit a fresh submission.

### B.5 Rejecting a Requisition

1. Open the requisition and tap **"Reject."**
2. **A reason is mandatory** — the system will not submit a rejection without one. Be specific enough that the requesting unit understands what to correct if they wish to resubmit (e.g., "Distance implausible for stated destination — please confirm route" rather than simply "Denied").
3. Confirm. The requisition closes as `REJECTED`; no token is issued; this decision, with your reason, is permanently recorded in the audit trail exactly as an approval would be.

### B.6 Revoking an Already-Issued Token

Used when circumstances change after approval (e.g., the driver becomes unavailable, the mission is cancelled, a security concern arises):

1. Locate the trip under **Active Trips** (not the original requisition, which has already closed).
2. Tap **"Revoke Token"** and enter a reason.
3. The revocation is immediate in the central system and will reach every relevant edge terminal on its next sync cycle (within 5 minutes under normal connectivity, or upon that edge terminal's next reconnect if it is currently offline — see the Synchronization Protocol document for the underlying mechanism and its bounded worst-case delay).
4. **Important:** if you have reason to believe the vehicle may be at or near a gate imminently, and you cannot confirm the relevant edge terminal has current connectivity, notify that gate's SENTRY directly (radio/phone) as a parallel, immediate measure — do not rely on the sync cycle alone for time-critical revocations.

### B.7 Reviewing Reconciliation and Audit Flags

- Trips that complete with a distance deviation exceeding 10% appear in your **Flagged Trips** queue automatically.
- Review the flagged trip's outbound/inbound odometer readings and the stated planned distance. Common legitimate explanations include route changes en route (which should have been radioed in per unit procedure) or a transcription error by the sentry at one of the two handshakes.
- Your review outcome (cleared, or escalated to Commander) is itself logged; you are not expected to silently resolve every flag without a recorded decision.

### B.8 What the MTO Role Cannot Do

For your own clarity and to avoid attempting actions the system will correctly reject:

- You cannot create or modify user accounts, vehicle records, or driver records — that is ADMIN authority.
- You cannot view or modify audit-trail entries directly; you can only view your own approval/rejection history as part of the read-only audit report.
- You cannot override a SENTRY's gate-level decision remotely — the override-with-remarks procedure (Part A, Section A.6) is a gate-local action; your role in that scenario is advisory (by radio/phone) and reviewing the resulting log entry after the fact, not executing the override yourself.
