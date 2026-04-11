// src/lib/hashId.js — Bijective ID hash
// MUST stay in sync with encodeId() in app.js (frontend)

const ID_M1 = 0x9B4EA3C1;
const ID_M2 = 0x5A3F9C2E;
const MUL   = 0x9e3779b9;
const INV   = 0x144cbc89; // modular inverse of MUL mod 2^32

/** Encode a positive integer to an 8-char lowercase hex string */
export function encodeId(n) {
  let x = (n >>> 0);
  x = ((x ^ ID_M1) >>> 0);
  x = (Math.imul(x, MUL) >>> 0);
  x = ((x >>> 16) ^ x) >>> 0;
  x = ((x ^ ID_M2) >>> 0);
  return ('00000000' + x.toString(16)).slice(-8);
}

/** Decode an 8-char hex hash back to its original numeric ID */
export function hashToNumeric(hash) {
  let x = (parseInt(hash, 16) >>> 0);
  x = ((x ^ ID_M2) >>> 0);
  x = ((x ^ (x >>> 16)) >>> 0);
  x = (Math.imul(x, INV) >>> 0);
  x = ((x ^ ID_M1) >>> 0);
  return x;
}

/**
 * Parse an :id route param.
 * Accepts: 8-char hex hash (from encodeId) OR positive integer string.
 * Returns the numeric DB id, or null if invalid.
 */
export function parseId(rawId) {
  if (!rawId) return null;
  const s = String(rawId).toLowerCase().trim();

  let n;
  if (/^[0-9a-f]{8}$/.test(s)) {
    n = hashToNumeric(s);
    // Round-trip check — rejects invalid/colliding inputs
    if (encodeId(n) !== s) return null;
  } else {
    n = parseInt(rawId, 10);
  }

  if (!Number.isFinite(n) || n <= 0 || n > 2_147_483_647) return null;
  return n;
}
