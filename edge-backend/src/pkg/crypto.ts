// ============================================================================
// M-FTAMS Edge — Cryptographic Module (HMAC-SHA256 & Constant-Time Verify)
// ============================================================================

import * as crypto from 'crypto';

/**
 * Canonicalizes token fields for constant-time offline verification at the edge.
 */
export function canonicalizeToken(token: {
  token_id: string;
  trip_id: string;
  vehicle_id: string;
  driver_id: string;
  issued_at: string;
  valid_until: string;
  issued_by: string;
}): string {
  return [
    token.token_id,
    token.trip_id,
    token.vehicle_id,
    token.driver_id,
    new Date(token.issued_at).toISOString(),
    new Date(token.valid_until).toISOString(),
    token.issued_by
  ].join('|');
}

/**
 * Signs message using HMAC-SHA256 with the edge pre-shared secret.
 */
export function signHmacSha256(key: string, message: string): string {
  return crypto.createHmac('sha256', key).update(message, 'utf8').digest('hex');
}

/**
 * Constant-time comparison to prevent side-channel timing attacks.
 */
export function verifyConstantTime(expectedSignatureHex: string, actualSignatureHex: string): boolean {
  try {
    const expectedBuf = Buffer.from(expectedSignatureHex, 'hex');
    const actualBuf = Buffer.from(actualSignatureHex, 'hex');

    if (expectedBuf.length !== actualBuf.length || expectedBuf.length !== 32) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuf, actualBuf);
  } catch {
    return false;
  }
}

/**
 * Canonicalizes a gate transaction event at the moment of local write.
 */
export function canonicalizeGateEvent(event: {
  event_id: string;
  edge_id: string;
  event_type: string;
  trip_id: string;
  vehicle_id: string;
  driver_id: string;
  token_id: string;
  odometer_reading: number;
  fuel_level_pct: number;
  sentry_id: string;
  hardware_timestamp: string;
}): string {
  return [
    event.event_id,
    event.edge_id,
    event.event_type,
    event.trip_id,
    event.vehicle_id,
    event.driver_id,
    event.token_id,
    event.odometer_reading.toString(),
    event.fuel_level_pct.toString(),
    event.sentry_id,
    new Date(event.hardware_timestamp).toISOString()
  ].join('|');
}
