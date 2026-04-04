// api/snippet-get.js
// GET /api/snippet-get?id=X — fetch single snippet WITH code field
// Used by detail modal for lazy code loading

import { createClient } from '@supabase/supabase-js';

const pub = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
  { auth: { persistSession: false } }
);

// Simple cache per ID (60s)
const idCache = new Map();

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET')    return res.status(405).json({ error: 'Method not allowed' });

  const rawId = req.query?.id;
  const id    = parseInt(rawId, 10);
  if (!id || !Number.isFinite(id) || id <= 0 || id > 2_147_483_647)
    return res.status(400).json({ error: 'ID tidak valid' });

  // Cache check
  const cached = idCache.get(id);
  if (cached && Date.now() - cached.at < 60_000) {
    res.setHeader('X-Cache', 'HIT');
    res.setHeader('Cache-Control', 'public, max-age=60');
    return res.status(200).json(cached.data);
  }

  try {
    const { data, error } = await pub
      .from('snippets')
      .select('id,created_at,author,title,description,language,tags,code,likes,views')
      .eq('id', id)
      .single();

    if (error || !data) return res.status(404).json({ error: 'Snippet tidak ditemukan' });

    idCache.set(id, { data, at: Date.now() });
    // Cleanup old cache
    if (idCache.size > 200) {
      const oldest = [...idCache.entries()].sort((a,b) => a[1].at - b[1].at)[0];
      if (oldest) idCache.delete(oldest[0]);
    }

    res.setHeader('X-Cache', 'MISS');
    res.setHeader('Cache-Control', 'public, max-age=60');
    return res.status(200).json(data);
  } catch (e) {
    console.error('[snippet-get]', e.message);
    return res.status(500).json({ error: 'Server error' });
  }
}
