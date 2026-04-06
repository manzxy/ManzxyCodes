// api/snippet/[id].js
// GET /api/snippet/:id
// :id bisa berupa 8-char hex hash (dari encodeId) ATAU numeric ID langsung
// Frontend kirim hash, tapi kita decode dulu ke numeric

import { createClient } from '@supabase/supabase-js';

const pub = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, { auth: { persistSession: false } });

// Harus sama persis dengan encodeId() di app.js
const ID_M1 = 0x9B4EA3C1;
const ID_M2 = 0x5A3F9C2E;
const INV   = 0x144cbc89; // modular inverse of 0x9e3779b9 mod 2^32

function encodeId(n) {
  let x = (n >>> 0);
  x = ((x ^ ID_M1) >>> 0);
  x = Math.imul(x, 0x9e3779b9) >>> 0;
  x = ((x >>> 16) ^ x) >>> 0;
  x = ((x ^ ID_M2) >>> 0);
  return ('00000000' + x.toString(16)).slice(-8);
}

function hashToNumeric(hash) {
  // Reverse the bijection
  let x = parseInt(hash, 16) >>> 0;
  x = (x ^ ID_M2) >>> 0;
  x = (x ^ (x >>> 16)) >>> 0;
  x = Math.imul(x, INV) >>> 0;
  x = (x ^ ID_M1) >>> 0;
  return x;
}

// Cache per numeric ID (90s)
const idCache = new Map();
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of idCache) if (now - v.at > 90_000) idCache.delete(k);
}, 5 * 60_000);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { id: rawId } = req.query;
  if (!rawId) return res.status(400).json({ error: 'ID diperlukan' });

  let numericId;

  // Detect: 8-char hex = hash, otherwise try numeric
  if (/^[0-9a-f]{8}$/i.test(rawId)) {
    numericId = hashToNumeric(rawId.toLowerCase());
    // Verify round-trip to catch invalid hashes
    if (encodeId(numericId) !== rawId.toLowerCase()) {
      return res.status(400).json({ error: 'ID tidak valid' });
    }
  } else {
    numericId = parseInt(rawId, 10);
  }

  if (!Number.isFinite(numericId) || numericId <= 0 || numericId > 2_147_483_647)
    return res.status(400).json({ error: 'ID tidak valid' });

  // Cache hit
  const cached = idCache.get(numericId);
  if (cached) {
    res.setHeader('X-Cache', 'HIT');
    res.setHeader('Cache-Control', 'public, max-age=60');
    return res.status(200).json(cached.data);
  }

  const { data, error } = await pub
    .from('snippets')
    .select('id,created_at,author,title,description,language,tags,code,likes,views')
    .eq('id', numericId)
    .single();

  if (error || !data) return res.status(404).json({ error: 'Snippet tidak ditemukan' });

  idCache.set(numericId, { data, at: Date.now() });
  res.setHeader('X-Cache', 'MISS');
  res.setHeader('Cache-Control', 'public, max-age=60');
  return res.status(200).json(data);
}
