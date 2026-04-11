// api/snippets.js
// GET  /api/snippets      — list all snippets (no code field)
// POST /api/snippets      — like / unlike / view

import { pub, svc }               from '../src/lib/db.js';
import { setCORS, handleOptions,
         parseBody, getIP }       from '../src/lib/apiHelpers.js';

// ── Server-side list cache (15s TTL, shared across warm invocations)
let _cache = { data: null, at: 0 };
const CACHE_TTL = 15_000;

// ── Per-action rate limit (in-memory, resets on cold start)
const cooldowns = new Map();
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of cooldowns) if (now > v) cooldowns.delete(k);
}, 60_000);

export default async function handler(req, res) {
  setCORS(res, 'GET,POST,OPTIONS');
  if (handleOptions(req, res)) return;

  // ── GET — list snippets
  if (req.method === 'GET') {
    try {
      const now = Date.now();
      if (_cache.data && now - _cache.at < CACHE_TTL) {
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('Cache-Control', 'public, s-maxage=10, stale-while-revalidate=30');
        return res.status(200).json(_cache.data);
      }

      const { data, error } = await pub
        .from('snippets')
        .select('id,created_at,author,title,description,language,tags,likes,views')
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) {
        console.error('[snippets GET]', error.message);
        return res.status(500).json({ error: 'Database error' });
      }

      _cache = { data: data ?? [], at: now };
      res.setHeader('X-Cache', 'MISS');
      res.setHeader('Cache-Control', 'public, s-maxage=10, stale-while-revalidate=30');
      return res.status(200).json(_cache.data);

    } catch (e) {
      console.error('[snippets GET crash]', e.message);
      return res.status(500).json({ error: 'Server error' });
    }
  }

  // ── POST — like / unlike / view
  if (req.method === 'POST') {
    try {
      const body                = parseBody(req);
      const { action, id: raw } = body;
      const id                  = parseInt(raw, 10);

      if (!Number.isFinite(id) || id <= 0 || id > 2_147_483_647)
        return res.status(400).json({ error: 'ID tidak valid' });

      if (!['like', 'unlike', 'view'].includes(action))
        return res.status(400).json({ error: 'Action tidak valid' });

      // Rate limit per IP
      const ip  = getIP(req);
      const key = `${ip}:${action}:${id}`;
      const ttl = action === 'view' ? 600_000 : 300_000; // 10 min / 5 min
      const now = Date.now();

      if (cooldowns.has(key)) {
        const wait = Math.ceil((cooldowns.get(key) - now) / 60_000);
        return res.status(429).json({ error: `Tunggu ${wait} menit lagi` });
      }
      cooldowns.set(key, now + ttl);

      // ── View
      if (action === 'view') {
        // Try atomic RPC first, fall back to manual if RPC not deployed
        const { error: rpcErr } = await svc.rpc('increment_views', { row_id: id });
        if (rpcErr) {
          const { data: row } = await svc.from('snippets').select('views').eq('id', id).single();
          if (!row) { cooldowns.delete(key); return res.status(404).json({ error: 'Tidak ditemukan' }); }
          const v = (row.views ?? 0) + 1;
          await svc.from('snippets').update({ views: v }).eq('id', id);
          return res.status(200).json({ views: v });
        }
        // Fetch updated count to return to client
        const { data: updated } = await svc.from('snippets').select('views').eq('id', id).single();
        return res.status(200).json({ views: updated?.views ?? 0 });
      }

      // ── Like / Unlike
      const rpcFn = action === 'like' ? 'increment_likes' : 'decrement_likes';
      const delta = action === 'like' ? 1 : -1;
      const { data: rpcResult, error: rpcErr } = await svc.rpc(rpcFn, { row_id: id });

      if (rpcErr) {
        // Fall back to manual read-modify-write
        const { data: row } = await svc.from('snippets').select('likes').eq('id', id).single();
        if (!row) { cooldowns.delete(key); return res.status(404).json({ error: 'Tidak ditemukan' }); }
        const l = Math.max(0, (row.likes ?? 0) + delta);
        await svc.from('snippets').update({ likes: l }).eq('id', id);
        _cache.at = 0; // invalidate list cache
        return res.status(200).json({ likes: l });
      }

      _cache.at = 0;
      return res.status(200).json({ likes: rpcResult ?? 0 });

    } catch (e) {
      console.error('[snippets POST crash]', e.message);
      return res.status(500).json({ error: 'Server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
