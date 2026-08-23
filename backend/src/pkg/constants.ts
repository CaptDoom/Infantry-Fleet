// ============================================================================
// M-FTAMS — Load-Bearing Architectural Constants & Military Rules
// ============================================================================

/**
 * LOAD-BEARING CONSTANT 1: 10% Distance Deviation Threshold
 * 
 * Military transport sorties operate on pre-cleared, authorized routes.
 * A returned vehicle whose actual odometer distance (inbound - outbound)
 * exceeds the planned distance by more than 10.0% represents an unauthorized
 * detour, route divergence, or odometer anomaly.
 * 
 * When this threshold is breached during Stage 7 (Reconciliation):
 * 1. The trip status MUST transition to 'COMPLETED_FLAGGED'.
 * 2. An 'AUDIT_ALERT' with severity 'WARNING' or 'CRITICAL' is automatically raised.
 * 3. The sortie is routed to the MTO Flagged Sorties Queue for formal review.
 * 
 * This threshold is non-negotiable and strictly enforced across all units.
 */
export const DISTANCE_DEVIATION_THRESHOLD_PCT = 10.0;

/**
 * LOAD-BEARING CONSTANT 2: 72-Hour Offline Operating Ceiling
 * 
 * M-FTAMS is designed for DDIL (Denied, Disconnected, Intermittent, Limited)
 * military cantonment environments. Edge terminals cache active tokens,
 * driver credentials, and vehicle statuses up to 72 hours locally.
 * 
 * If network isolation exceeds 72 hours:
 * 1. The edge terminal continues operating strictly against its local snapshot.
 * 2. Gate passes whose `valid_until` timestamp has expired will correctly fail
 *    closed (denied passage) unless an explicit Sentry Override-with-Remarks
 *    is executed.
 * 3. This ensures tokens cannot remain valid indefinitely without central renewal.
 */
export const OFFLINE_CEILING_HOURS = 72;

/**
 * LOAD-BEARING CONSTANT 3: Gate-Pass Token Time-Boxing Window
 * 
 * Every gate-pass token issued upon MTO approval has a fixed, strict validity
 * window (default 72 hours from issuance or ETA + buffer).
 * Edge terminals determine validity offline by checking:
 *   now() <= token.valid_until && HMAC_valid(token) && status != CONSUMED
 * No token is ever issued with unbounded or indefinite validity.
 */
export const TOKEN_VALIDITY_WINDOW_HOURS = 72;

/**
 * LOAD-BEARING CONSTANT 4: Clock Skew Tolerance (Seconds)
 * 
 * In a distributed, offline-capable military setup, Last-Write-Wins (LWW)
 * conflict resolution relies on device hardware timestamps.
 * 
 * If the delta between an edge terminal's reported `hardware_clock_at_generation`
 * and the central server's NTP-disciplined clock exceeds this tolerance:
 * 1. A 'CLOCK_SKEW_SUSPECTED' alert is immediately raised to the Alert Service.
 * 2. The edge terminal's sync state is flagged for investigation.
 * 3. The terminal's clock must NOT be stepped backward mid-session.
 */
export const CLOCK_SKEW_TOLERANCE_SECONDS = 30;

/**
 * Default Sync Cadence (5 Minutes = 300 Seconds)
 */
export const DEFAULT_SYNC_INTERVAL_SECONDS = 300;
