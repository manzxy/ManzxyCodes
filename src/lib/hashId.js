// src/lib/hashId.js — Shared ID hash utilities
// Must stay in sync with encodeId() in public/app.js

const ID_M1 = 0x9B4EA3C1;
const ID_M2 = 0x5A3F9C2E;
const INV   = 0x144cbc89; // modular inverse of 0x9e3779b9 mod 2^32

export function encodeId(n) {
  let x = (n >>> 0);
  x = ((x ^ ID_M1) >>> 0);
  x = Math.imul(x, 0x9e3779b9) >>> 0;
  x = ((x >>> 16) ^ x) >>> 0;
  x = ((x ^ ID_M2) >>> 0);
  return ('00000000' + x.toString(16)).slice(-8);
}

export function hashToNumeric(hash) {
  let x = parseInt(hash, 16) >>> 0;
  x = (x ^ ID_M2) >>> 0;
  x = (x ^ (x >>> 16)) >>> 0;
  x = Math.imul(x, INV) >>> 0;
  x = (x ^ ID_M1) >>> 0;
  return x;
}

/**
 * Parse :id param — accepts 8-char hex hash OR numeric string
 * Returns { numericId } or null if invalid
 */
export function parseId(rawId) {
  if (!rawId) return null;
  const clean = String(rawId).toLowerCase().trim();

  let numericId;
  if (/^[0-9a-f]{8}$/.test(clean)) {
    numericId = hashToNumeric(clean);
    // Verify round-trip (guard against hash collisions / garbage input)
    if (encodeId(numericId) !== clean) return null;
  } else {
    numericId = parseInt(rawId, 10);
  }

  if (!Number.isFinite(numericId) || numericId <= 0 || numericId > 2_147_483_647) return null;
  return numericId;
}
