// ============================================================================
// M-FTAMS — Cryptographic Engine (HMAC-SHA256, Constant-Time Compare, Hash-Chain)
// ============================================================================

import * as crypto from 'crypto';

/**
 * Canonicalizes token fields into a deterministic, exact byte representation.
 * Fixed field order: token_id|trip_id|vehicle_id|driver_id|issued_at|valid_until|issued_by
 * No whitespace variance.
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
 * Signs a canonical message using HMAC-SHA256 and the central/shared secret key.
 * Returns lowercase hex string (64 chars).
 */
export function signHmacSha256(key: string, message: string): string {
  return crypto.createHmac('sha256', key).update(message, 'utf8').digest('hex');
}

/**
 * Performs constant-time verification to prevent timing side-channel leakage.
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
 * Verifies a token against a signing key using constant-time comparison.
 */
export function verifyTokenSignature(
  key: string,
  token: {
    token_id: string;
    trip_id: string;
    vehicle_id: string;
    driver_id: string;
    issued_at: string;
    valid_until: string;
    issued_by: string;
  },
  signatureHex: string
): boolean {
  const canonicalBytes = canonicalizeToken(token);
  const expectedSig = signHmacSha256(key, canonicalBytes);
  return verifyConstantTime(expectedSig, signatureHex);
}

/**
 * Canonicalizes an edge event for signature verification.
 * Fixed order: event_id|edge_id|event_type|trip_id|vehicle_id|driver_id|token_id|odometer_reading|fuel_level_pct|sentry_id|hardware_timestamp
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

/**
 * Canonicalizes an audit log entry for hash-chain cryptographic integrity.
 * Incorporates previous_signature to create a tamper-evident blockchain-like chain.
 */
export function canonicalizeAuditEntry(entry: {
  audit_id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  actor_id: string | null;
  details: Record<string, any> | string;
  previous_signature: string | null;
  recorded_at: string;
}): string {
  const detailsStr = typeof entry.details === 'string' ? entry.details : JSON.stringify(entry.details);
  return [
    entry.audit_id,
    entry.entity_type,
    entry.entity_id,
    entry.action,
    entry.actor_id || 'SYSTEM',
    detailsStr,
    entry.previous_signature || 'GENESIS',
    new Date(entry.recorded_at).toISOString()
  ].join('|');
}

/**
 * Signs an audit entry including previous signature reference.
 */
export function signAuditEntry(
  key: string,
  entry: {
    audit_id: string;
    entity_type: string;
    entity_id: string;
    action: string;
    actor_id: string | null;
    details: Record<string, any> | string;
    previous_signature: string | null;
    recorded_at: string;
  }
): string {
  const canonicalBytes = canonicalizeAuditEntry(entry);
  return signHmacSha256(key, canonicalBytes);
}

/**
 * Full-chain integrity verification walker.
 * Walks an array of audit entries from genesis (oldest) to latest tip.
 * Confirms:
 *   1. Every entry's HMAC matches its canonical payload.
 *   2. Every non-genesis entry's previous_signature matches the prior entry's signature.
 */
export function verifyAuditChain(
  key: string,
  entries: Array<{
    audit_id: string;
    entity_type: string;
    entity_id: string;
    action: string;
    actor_id: string | null;
    details: Record<string, any> | string;
    previous_signature: string | null;
    signature: string;
    recorded_at: string;
  }>
): { valid: boolean; error?: string; brokenIndex?: number } {
  if (entries.length === 0) {
    return { valid: true };
  }

  // Sort chronological ascending (oldest first)
  const sorted = [...entries].sort(
    (a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
  );

  let expectedPrevSig: string | null = null;

  for (let i = 0; i < sorted.length; i++) {
    const entry = sorted[i];

    // Check chain link
    if (i === 0) {
      if (entry.previous_signature !== null && entry.previous_signature !== 'GENESIS') {
        // Allowed if chain continues from prior slice
      }
    } else {
      if (entry.previous_signature !== expectedPrevSig) {
        return {
          valid: false,
          error: `Chain broken at index ${i} (audit_id=${entry.audit_id}): previous_signature '${entry.previous_signature}' does not match expected '${expectedPrevSig}'`,
          brokenIndex: i
        };
      }
    }

    // Check entry signature
    const computedSig = signAuditEntry(key, entry);
    if (!verifyConstantTime(computedSig, entry.signature)) {
      return {
        valid: false,
        error: `Signature mismatch at index ${i} (audit_id=${entry.audit_id}). Data has been tampered with!`,
        brokenIndex: i
      };
    }

    expectedPrevSig = entry.signature;
  }

  return { valid: true };
}

/**
 * Computes SHA-256 hash of photo/credential strings.
 */
export function sha256Hash(content: string): string {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}
