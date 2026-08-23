# M-FTAMS Sentry Gate Kiosk UI

Touch-optimized, offline-first gate access application for sentries on perimeter duty.

## Key Features
- **Localhost Loopback Only:** Communicates strictly with `http://localhost:3001` (co-located edge backend daemon).
- **Single-Transaction Lock:** State machine enforces sequential processing per vehicle.
- **Mandatory Photo Cross-Check:** Side-by-side comparison of driver credential photo and vehicle reference photo against cryptographic hash references.
- **Dual Flow:**
  - **Outbound Handshake:** Tag Scan -> Photo Cross-Check -> Outbound Odometer & Fuel Recording -> Boom Barrier Release.
  - **Inbound Handshake:** Return Scan -> Stored Outbound Odometer Sanity Comparison -> Inbound Odometer & Fuel Recording -> Barrier Release.
- **Sentry Override-with-Remarks:** Modal for exceptional clearances with mandatory justification text.

## Running Locally
```bash
npm install
npm run dev
```
