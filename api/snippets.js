// api/snippets.js
// GET  /api/snippets → list all snippets
// POST /api/snippets → like/unlike/view

import { createClient } from '@supabase/supabase-js';

const pub = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, { auth: { persistSession: false } });
const svc = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

// Module-level cache (survives warm invocations)
let _cache = { data: null, at: 0 };
const CACHE_TTL = 15_000;

// BUG FIX: per-IP cooldown for view and like actions (in-memory, resets on cold start)
const ipCooldown = new Map();
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of ipCooldown) if (now > v) ipCooldown.delete(k);
}, 60_000);

function getIP(req) {
  return (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress || 'unknown';
}

function setCORS(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req, res) {
  setCORS(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  // ── GET
  if (req.method === 'GET') {
    try {
      const now = Date.now();
      if (_cache.data && (now - _cache.at) < CACHE_TTL) {
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('Cache-Control', 'public, s-maxage=10, stale-while-revalidate=30');
        return res.status(200).json(_cache.data);
      }
      const { data, error } = await pub
        .from('snippets')
        .select('id,created_at,author,title,description,language,tags,likes,views')
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) { console.error('[snippets GET]', error.message); return res.status(500).json({ error: 'Database error' }); }
      const result = data ?? [];
      _cache = { data: result, at: now };
      res.setHeader('X-Cache', 'MISS');
      res.setHeader('Cache-Control', 'public, s-maxage=10, stale-while-revalidate=30');
      return res.status(200).json(result);
    } catch (e) {
      console.error('[snippets GET crash]', e.message);
      return res.status(500).json({ error: 'Server error' });
    }
  }

  // ── POST (like/unlike/view)
  if (req.method === 'POST') {
    try {
      let body = req.body;
      if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
      body = body || {};

      const { action, id: rawId } = body;
      const id = parseInt(rawId, 10);

      if (!Number.isFinite(id) || id <= 0 || id > 2_147_483_647)
        return res.status(400).json({ error: 'ID tidak valid' });
      if (!['like', 'unlike', 'view'].includes(action))
        return res.status(400).json({ error: 'Action tidak valid' });

      const ip = getIP(req);
      const cooldownKey = `${ip}:${action}:${id}`;
      const cooldownMs = action === 'view' ? 10 * 60_000 : 5 * 60_000;
      const now = Date.now();

      // BUG FIX: check cooldown before hitting DB
      if (ipCooldown.has(cooldownKey)) {
        const wait = Math.ceil((ipCooldown.get(cooldownKey) - now) / 60000);
        return res.status(429).json({ error: `Tunggu ${wait} menit lagi` });
      }
      ipCooldown.set(cooldownKey, now + cooldownMs);

      if (action === 'view') {
        // BUG FIX: use atomic RPC instead of read-then-write (race condition)
        const { error } = await svc.rpc('increment_views', { row_id: id });
        if (error) {
          // Fallback to manual if RPC doesn't exist yet
          const { data: row } = await svc.from('snippets').select('views').eq('id', id).single();
          if (!row) return res.status(404).json({ error: 'Snippet tidak ditemukan' });
          const v = (row.views || 0) + 1;
          await svc.from('snippets').update({ views: v }).eq('id', id);
          return res.status(200).json({ views: v });
        }
        return res.status(200).json({ ok: true });
      }

      if (action === 'like') {
        const { data: result, error } = await svc.rpc('increment_likes', { row_id: id });
        if (error) {
          const { data: row } = await svc.from('snippets').select('likes').eq('id', id).single();
          if (!row) return res.status(404).json({ error: 'Snippet tidak ditemukan' });
          const l = (row.likes || 0) + 1;
          await svc.from('snippets').update({ likes: l }).eq('id', id);
          _cache.at = 0;
          return res.status(200).json({ likes: l });
        }
        _cache.at = 0;
        return res.status(200).json({ likes: result ?? 0 });
      }

      if (action === 'unlike') {
        const { data: result, error } = await svc.rpc('decrement_likes', { row_id: id });
        if (error) {
          const { data: row } = await svc.from('snippets').select('likes').eq('id', id).single();
          if (!row) return res.status(404).json({ error: 'Snippet tidak ditemukan' });
          const l = Math.max(0, (row.likes || 0) - 1);
          await svc.from('snippets').update({ likes: l }).eq('id', id);
          _cache.at = 0;
          return res.status(200).json({ likes: l });
        }
        _cache.at = 0;
        return res.status(200).json({ likes: result ?? 0 });
      }
    } catch (e) {
      console.error('[snippets POST crash]', e.message);
      return res.status(500).json({ error: 'Server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
