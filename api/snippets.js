// api/snippets.js
// GET  /api/snippets  → list all snippets
// POST /api/snippets  → like / unlike / view

import { pub, svc }               from '../src/lib/db.js';
import { setCORS, handleOptions,
         parseBody, getIP }       from '../src/lib/apiHelpers.js';

let _cache = { data: null, at: 0 };
const CACHE_TTL = 15_000;

const cooldowns = new Map();
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of cooldowns) if (now > v) cooldowns.delete(k);
}, 60_000);

export default async function handler(req, res) {
  setCORS(res, 'GET,POST,OPTIONS');
  if (handleOptions(req, res)) return;

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
      if (error) return res.status(500).json({ error: 'Database error' });
      _cache = { data: data ?? [], at: now };
      res.setHeader('X-Cache', 'MISS');
      res.setHeader('Cache-Control', 'public, s-maxage=10, stale-while-revalidate=30');
      return res.status(200).json(_cache.data);
    } catch (e) {
      return res.status(500).json({ error: 'Server error' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { action, id: rawId } = parseBody(req);
      const id = parseInt(rawId, 10);
      if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ error: 'ID tidak valid' });
      if (!['like', 'unlike', 'view'].includes(action)) return res.status(400).json({ error: 'Action tidak valid' });

      const ip  = getIP(req);
      const key = `${ip}:${action}:${id}`;
      const ttl = action === 'view' ? 600_000 : 300_000;
      const now = Date.now();
      if (cooldowns.has(key)) {
        const wait = Math.ceil((cooldowns.get(key) - now) / 60_000);
        return res.status(429).json({ error: `Tunggu ${wait} menit lagi` });
      }
      cooldowns.set(key, now + ttl);

      if (action === 'view') {
        const { error } = await svc.rpc('increment_views', { row_id: id });
        if (error) {
          const { data: row } = await svc.from('snippets').select('views').eq('id', id).single();
          if (!row) return res.status(404).json({ error: 'Tidak ditemukan' });
          await svc.from('snippets').update({ views: (row.views || 0) + 1 }).eq('id', id);
        }
        return res.status(200).json({ ok: true });
      }

      const rpcFn = action === 'like' ? 'increment_likes' : 'decrement_likes';
      const delta = action === 'like' ? 1 : -1;
      const { data: result, error } = await svc.rpc(rpcFn, { row_id: id });
      if (error) {
        const { data: row } = await svc.from('snippets').select('likes').eq('id', id).single();
        if (!row) return res.status(404).json({ error: 'Tidak ditemukan' });
        const l = Math.max(0, (row.likes || 0) + delta);
        await svc.from('snippets').update({ likes: l }).eq('id', id);
        _cache.at = 0;
        return res.status(200).json({ likes: l });
      }
      _cache.at = 0;
      return res.status(200).json({ likes: result ?? 0 });
    } catch (e) {
      return res.status(500).json({ error: 'Server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
