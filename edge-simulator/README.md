# M-FTAMS Edge Multi-Terminal Simulator & Fault Injection Harness

CLI test harness driving virtual gate terminals against the central server under simulated DDIL conditions.

## Fault Injection Scenarios Covered
1. **72h+ Sustained Network Outage:**  
   Simulates full disconnection; validates local cache durability and token time-boxing expiry.
2. **Link Recovery & Immediate Queue Flush:**  
   Simulates reconnection; validates immediate batch generation and uplink delivery without waiting for the 5-minute schedule.
3. **Induced Hardware Clock Drift (>30s):**  
   Simulates clock skew delta beyond configured tolerance; validates `CLOCK_SKEW_SUSPECTED` alert trigger and LWW flagging.
4. **Power Loss / Transaction Rollback:**  
   Simulates mid-write process termination; validates SQLite transactional recovery without partial or corrupt records.

## Running Tests
```bash
npm install
npm test
```
