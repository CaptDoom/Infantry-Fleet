// ============================================================================
// M-FTAMS — Cryptographic Engine & Hash-Chain Verification Unit Tests
// ============================================================================

import {
  canonicalizeToken,
  signHmacSha256,
  verifyConstantTime,
  verifyTokenSignature,
  canonicalizeAuditEntry,
  signAuditEntry,
  verifyAuditChain
} from '../src/pkg/crypto';

describe('Cryptographic Engine & Token Signing', () => {
  const testKey = 'test_secret_hmac_key_1234567890';

  const sampleToken = {
    token_id: '11111111-1111-1111-1111-111111111111',
    trip_id: '22222222-2222-2222-2222-222222222222',
    vehicle_id: '33333333-3333-3333-3333-333333333333',
    driver_id: '44444444-4444-4444-4444-444444444444',
    issued_at: '2026-08-23T10:00:00.000Z',
    valid_until: '2026-08-26T10:00:00.000Z',
    issued_by: '55555555-5555-5555-5555-555555555555'
  };

  test('Canonicalization produces deterministic byte string', () => {
    const canonical1 = canonicalizeToken(sampleToken);
    const canonical2 = canonicalizeToken({ ...sampleToken });
    expect(canonical1).toEqual(canonical2);
    expect(canonical1).toBe(
      '11111111-1111-1111-1111-111111111111|22222222-2222-2222-2222-222222222222|33333333-3333-3333-3333-333333333333|44444444-4444-4444-4444-444444444444|2026-08-23T10:00:00.000Z|2026-08-26T10:00:00.000Z|55555555-5555-5555-5555-555555555555'
    );
  });

  test('HMAC-SHA256 signature generates valid 64-char hex string', () => {
    const canonical = canonicalizeToken(sampleToken);
    const sig = signHmacSha256(testKey, canonical);
    expect(sig).toHaveLength(64);
    expect(typeof sig).toBe('string');
  });

  test('Constant-time comparison succeeds for identical signatures', () => {
    const canonical = canonicalizeToken(sampleToken);
    const sig1 = signHmacSha256(testKey, canonical);
    const sig2 = signHmacSha256(testKey, canonical);
    expect(verifyConstantTime(sig1, sig2)).toBe(true);
  });

  test('Constant-time comparison rejects modified or forged signatures', () => {
    const canonical = canonicalizeToken(sampleToken);
    const validSig = signHmacSha256(testKey, canonical);
    const forgedSig = validSig.substring(0, 63) + (validSig[63] === 'a' ? 'b' : 'a');
    expect(verifyConstantTime(validSig, forgedSig)).toBe(false);
  });

  test('verifyTokenSignature successfully verifies authentic token', () => {
    const sig = signHmacSha256(testKey, canonicalizeToken(sampleToken));
    expect(verifyTokenSignature(testKey, sampleToken, sig)).toBe(true);
  });

  test('verifyTokenSignature rejects token if any field is tampered with', () => {
    const sig = signHmacSha256(testKey, canonicalizeToken(sampleToken));
    const tamperedToken = { ...sampleToken, driver_id: '99999999-9999-9999-9999-999999999999' };
    expect(verifyTokenSignature(testKey, tamperedToken, sig)).toBe(false);
  });
});

describe('Audit Log Hash-Chain Integrity Verification', () => {
  const auditKey = 'audit_chain_signing_secret_998877';

  test('Builds and verifies a 3-block cryptographic hash chain', () => {
    // Block 1 (Genesis)
    const entry1 = {
      audit_id: 'a1111111-1111-1111-1111-111111111111',
      entity_type: 'system',
      entity_id: '00000000-0000-0000-0000-000000000000',
      action: 'SYSTEM_INITIALIZED',
      actor_id: null,
      details: { env: 'cantonment' },
      previous_signature: null,
      recorded_at: '2026-08-23T08:00:00.000Z'
    };
    const sig1 = signAuditEntry(auditKey, entry1);
    const block1 = { ...entry1, signature: sig1 };

    // Block 2
    const entry2 = {
      audit_id: 'a2222222-2222-2222-2222-222222222222',
      entity_type: 'requisition',
      entity_id: 'r1111111-1111-1111-1111-111111111111',
      action: 'REQUISITION_SUBMITTED',
      actor_id: 'u1111111-1111-1111-1111-111111111111',
      details: { dest: 'Leh', dist: 40 },
      previous_signature: sig1,
      recorded_at: '2026-08-23T08:05:00.000Z'
    };
    const sig2 = signAuditEntry(auditKey, entry2);
    const block2 = { ...entry2, signature: sig2 };

    // Block 3
    const entry3 = {
      audit_id: 'a3333333-3333-3333-3333-333333333333',
      entity_type: 'token',
      entity_id: 't1111111-1111-1111-1111-111111111111',
      action: 'TOKEN_ISSUED',
      actor_id: 'u2222222-2222-2222-2222-222222222222',
      details: { trip_id: 'tr1' },
      previous_signature: sig2,
      recorded_at: '2026-08-23T08:10:00.000Z'
    };
    const sig3 = signAuditEntry(auditKey, entry3);
    const block3 = { ...entry3, signature: sig3 };

    const chain = [block1, block2, block3];
    const verification = verifyAuditChain(auditKey, chain);
    expect(verification.valid).toBe(true);
    expect(verification.error).toBeUndefined();
  });

  test('Detects tamper in block payload and reports broken integrity', () => {
    const entry1 = {
      audit_id: 'a1111111-1111-1111-1111-111111111111',
      entity_type: 'system',
      entity_id: '00000000-0000-0000-0000-000000000000',
      action: 'SYSTEM_INITIALIZED',
      actor_id: null,
      details: { env: 'cantonment' },
      previous_signature: null,
      recorded_at: '2026-08-23T08:00:00.000Z'
    };
    const sig1 = signAuditEntry(auditKey, entry1);
    const block1 = { ...entry1, signature: sig1 };

    const entry2 = {
      audit_id: 'a2222222-2222-2222-2222-222222222222',
      entity_type: 'requisition',
      entity_id: 'r1111111-1111-1111-1111-111111111111',
      action: 'REQUISITION_SUBMITTED',
      actor_id: 'u1111111-1111-1111-1111-111111111111',
      details: { dest: 'Leh', dist: 40 },
      previous_signature: sig1,
      recorded_at: '2026-08-23T08:05:00.000Z'
    };
    const sig2 = signAuditEntry(auditKey, entry2);
    // Tamper with block 2 payload without valid signing key
    const tamperedBlock2 = { ...entry2, details: { dest: 'Kargil', dist: 120 }, signature: sig2 };

    const chain = [block1, tamperedBlock2];
    const verification = verifyAuditChain(auditKey, chain);
    expect(verification.valid).toBe(false);
    expect(verification.error).toContain('Signature mismatch');
  });
});
