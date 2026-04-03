// api/snippet/[id].js
// GET /api/snippet/:id — fetch single snippet WITH code field
// Used by detail modal for lazy code loading

import { createClient } from '@supabase/supabase-js';

const pub = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// Simple per-ID cache (60s)
const idCache = new Map();
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of idCache) if (now - v.at > 60_000) idCache.delete(k);
}, 5 * 60_000);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { id: rawId } = req.query;
  const id = parseInt(rawId, 10);
  if (!Number.isFinite(id) || id <= 0 || id > 2_147_483_647)
    return res.status(400).json({ error: 'ID tidak valid' });

  // Check cache
  const cached = idCache.get(id);
  if (cached) {
    res.setHeader('X-Cache', 'HIT');
    res.setHeader('Cache-Control', 'public, max-age=60');
    return res.status(200).json(cached.data);
  }

  const { data, error } = await pub
    .from('snippets')
    .select('id,created_at,author,title,description,language,tags,code,likes,views')
    .eq('id', id)
    .single();

  if (error || !data) return res.status(404).json({ error: 'Snippet tidak ditemukan' });

  idCache.set(id, { data, at: Date.now() });
  res.setHeader('X-Cache', 'MISS');
  res.setHeader('Cache-Control', 'public, max-age=60');
  return res.status(200).json(data);
}
