// api/snippets.js
// GET  /api/snippets  → ambil semua snippet (public)
// POST /api/snippets  → { action:'like'|'unlike'|'view', id:number }
//
// Deduplication:
// - view: 1 view per IP per snippet per session (in-memory, reset saat restart)
// - like/unlike: dihandle di frontend via localStorage, server trust frontend state
//   tapi kita limit 1 like-change per IP per snippet per 10 menit

import { createClient } from '@supabase/supabase-js';

const pub = () => createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
const svc = () => createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function parseBody(req) {
  if (!req.body) return {};
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch { return {}; } }
  return req.body || {};
}

// In-memory dedup store
// key: "ip:id" → timestamp last action
const viewedMap = new Map();  // view: IP+id → timestamp (10 menit cooldown)
const likeMap   = new Map();  // like/unlike: IP+id → timestamp (5 menit cooldown)

// Bersih tiap 30 menit
setInterval(() => {
  const now = Date.now();
  for (const [k, t] of viewedMap) { if (now - t > 30 * 60_000) viewedMap.delete(k); }
  for (const [k, t] of likeMap)   { if (now - t > 30 * 60_000) likeMap.delete(k);   }
}, 30 * 60_000);

function getIP(req) {
  const fw = req.headers['x-forwarded-for'];
  if (fw) return fw.split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // ── GET
  if (req.method === 'GET') {
    res.setHeader('Cache-Control', 's-maxage=5, stale-while-revalidate=30');
    const { data, error } = await pub()
      .from('snippets')
      .select('id,created_at,author,title,description,language,tags,code,likes,views')
      .order('created_at', { ascending: false });
    if (error) { console.error('[GET snippets]', error.message); return res.status(500).json({ error: error.message }); }
    return res.status(200).json(data ?? []);
  }

  // ── POST
  if (req.method === 'POST') {
    const { action, id } = parseBody(req);
    if (!id)     return res.status(400).json({ error: 'id diperlukan' });
    if (!action) return res.status(400).json({ error: 'action diperlukan' });

    const ip  = getIP(req);
    const db  = svc();
    const now = Date.now();

    // ── VIEW — deduplicate: 1 view per IP per snippet per 10 menit
    if (action === 'view') {
      const key = `v:${ip}:${id}`;
      const last = viewedMap.get(key) || 0;
      if (now - last < 10 * 60_000) {
        // Sudah view dalam 10 menit — return current views tanpa increment
        const { data } = await db.from('snippets').select('views').eq('id', id).single();
        return res.status(200).json({ views: data?.views || 0, skipped: true });
      }
      viewedMap.set(key, now);
      const { data, error } = await db.from('snippets').select('views').eq('id', id).single();
      if (error || !data) return res.status(404).json({ error: 'Snippet tidak ditemukan' });
      const v = (data.views || 0) + 1;
      await db.from('snippets').update({ views: v }).eq('id', id);
      return res.status(200).json({ views: v });
    }

    // ── LIKE / UNLIKE — deduplicate: 1 like-change per IP per snippet per 5 menit
    if (action === 'like' || action === 'unlike') {
      const key = `l:${ip}:${id}`;
      const last = likeMap.get(key) || 0;
      if (now - last < 5 * 60_000) {
        // Rate limited — return current likes tanpa ubah
        const { data } = await db.from('snippets').select('likes').eq('id', id).single();
        return res.status(429).json({ error: 'Terlalu cepat, tunggu sebentar', likes: data?.likes || 0 });
      }
      likeMap.set(key, now);
      const { data, error } = await db.from('snippets').select('likes').eq('id', id).single();
      if (error || !data) return res.status(404).json({ error: 'Snippet tidak ditemukan' });
      const l = Math.max(0, (data.likes || 0) + (action === 'like' ? 1 : -1));
      await db.from('snippets').update({ likes: l }).eq('id', id);
      return res.status(200).json({ likes: l });
    }

    return res.status(400).json({ error: `Action tidak dikenal: ${action}` });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
