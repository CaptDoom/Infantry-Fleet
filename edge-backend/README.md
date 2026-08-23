# M-FTAMS Edge Backend Service

Lightweight edge daemon designed for perimeter gate terminals in DDIL environments.

## Invariants & Design Constraints
1. **Zero MTO/ADMIN Code Paths:**  
   Build-time exclusion of user management, MTO approval, or system-wide configuration logic.
2. **<500ms Decision Latency:**  
   Local embedded SQLite lookup without any blocking network calls.
3. **Fail-Closed on Unseeded Startup:**  
   Refuses to release barriers if initial downlink snapshot has not completed.
4. **Durable Writes:**  
   All local event writes execute with `PRAGMA synchronous = FULL` in transactions.

## Local Endpoints (`/gate`)
- `POST /scan`: Scans vehicle RFID/barcode tag against local cache
- `POST /verify`: Verifies driver credential hash and smart-card match
- `POST /handshake`: Records outbound/inbound transaction, signs event with edge secret, and raises barrier signal
- `GET /status`: Terminal operational state, offline queue count, and sync status
- `POST /sync`: Triggers immediate bidirectional sync exchange

## Running Locally
```bash
npm install
npm test
npm start
```
