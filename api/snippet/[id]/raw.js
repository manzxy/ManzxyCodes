// api/snippet/[id]/raw.js
// GET /api/snippet/:encodedId/raw — serve raw code as text/plain
// encodedId = 8-char hex from encodeId() in app.js
// URL looks like: /api/snippet/a3f8c1d2/raw  (similar to kitsulabs)

import { createClient } from '@supabase/supabase-js';

const pub = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// Must match encodeId() in app.js exactly
const ID_M1 = 0x9B4EA3C1;
const ID_M2 = 0x5A3F9C2E;

function encodeId(n) {
  let x = (n >>> 0);
  x = ((x ^ ID_M1) >>> 0);
  x = Math.imul(x, 0x9e3779b9) >>> 0;
  x = ((x >>> 16) ^ x) >>> 0;
  x = ((x ^ ID_M2) >>> 0);
  return ('00000000' + x.toString(16)).slice(-8);
}

// Brute-force decode: search DB rows to find which numeric ID maps to this hash
// Better approach: reverse the hash math (it's a bijection)
function decodeId(hash) {
  // Reverse the bijection:
  // x = ((x ^ ID_M2) >>> 0)          → undo XOR with ID_M2
  // x = ((x >>> 16) ^ x) >>> 0       → undo (tricky, iterate)
  // x = imul(x, modInverse) >>> 0    → undo multiply
  // x = ((x ^ ID_M1) >>> 0)          → undo XOR with ID_M1
  const MOD = 0x100000000;
  // modular inverse of 0x9e3779b9 mod 2^32
  const INV = 0x144cbc89; // precomputed: 0x9e3779b9 * 0x144cbc89 ≡ 1 (mod 2^32)

  let x = parseInt(hash, 16) >>> 0;
  // undo XOR M2
  x = (x ^ ID_M2) >>> 0;
  // undo xorshift (x ^ (x >>> 16)) — self-inverse for 16-bit shift
  x = (x ^ (x >>> 16)) >>> 0;
  // undo multiply
  x = Math.imul(x, INV) >>> 0;
  // undo XOR M1
  x = (x ^ ID_M1) >>> 0;
  return x;
}

// Simple cache
const rawCache = new Map();
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of rawCache) if (now - v.at > 120_000) rawCache.delete(k);
}, 5 * 60_000);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).end('Method Not Allowed');

  const { id: encodedId } = req.query;

  // Validate 8-char hex
  if (!encodedId || !/^[0-9a-f]{8}$/i.test(encodedId)) {
    return res.status(400).end('Invalid ID');
  }

  const hash = encodedId.toLowerCase();

  // Cache hit
  const cached = rawCache.get(hash);
  if (cached) {
    res.setHeader('X-Cache', 'HIT');
    res.setHeader('Cache-Control', 'public, max-age=120');
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.status(200).end(cached.code);
  }

  // Decode the hash to numeric ID
  const numericId = decodeId(hash);

  // Verify the round-trip (guards against hash collisions / invalid input)
  if (encodeId(numericId) !== hash) {
    return res.status(404).end('Snippet not found');
  }

  if (numericId <= 0 || numericId > 2_147_483_647) {
    return res.status(404).end('Snippet not found');
  }

  const { data, error } = await pub
    .from('snippets')
    .select('id,title,language,code')
    .eq('id', numericId)
    .single();

  if (error || !data) return res.status(404).end('Snippet not found');

  rawCache.set(hash, { code: data.code, at: Date.now() });

  res.setHeader('X-Cache', 'MISS');
  res.setHeader('Cache-Control', 'public, max-age=120');
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  // Optional: suggest a filename
  const ext = { JavaScript:'js', TypeScript:'ts', Python:'py', PHP:'php', Go:'go', Rust:'rs', CSS:'css', HTML:'html', Shell:'sh', SQL:'sql' };
  const langExt = ext[data.language] || 'txt';
  const safeName = (data.title || 'snippet').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60);
  res.setHeader('Content-Disposition', `inline; filename="${safeName}.${langExt}"`);

  return res.status(200).end(data.code);
}
