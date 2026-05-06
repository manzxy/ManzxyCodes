// api/snippets.js
// GET  /api/snippets         → list semua snippet (tanpa code, tanpa password_hash)
// POST /api/snippets (action: view/like/unlike) → atomic increment

import { pub, svc }           from '../src/lib/db.js';
import { parseBody, getIP,
         setCORS, handleOptions } from '../src/lib/apiHelpers.js';

// ── In-memory rate limiters
const viewRL = new Map();  // prevent view-farming
const likeRL = new Map();  // prevent like-spam

setInterval(() => {
  const now = Date.now();
  for (const [k, v] of viewRL) if (now > v) viewRL.delete(k);
  for (const [k, v] of likeRL) if (now > v) likeRL.delete(k);
}, 2 * 60_000);

export default async function handler(req, res) {
  setCORS(res, 'GET,POST,OPTIONS');
  if (handleOptions(req, res)) return;

  // ── Env guard — catch missing Vercel env vars early with a clear message
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    console.error('[snippets] SUPABASE_URL or SUPABASE_ANON_KEY not set in environment');
    return res.status(503).json({ error: 'Server belum dikonfigurasi — env vars Supabase kosong' });
  }

  // ── GET: return list (exclude code + password_hash for security)
  if (req.method === 'GET') {
    let data, error;
    try {
      ({ data, error } = await pub
        .from('snippets')
        .select('id,created_at,author,title,description,language,tags,likes,views,password_hash')
        .order('created_at', { ascending: false })
        .limit(500));
    } catch (e) {
      console.error('[snippets GET] exception:', e.message);
      return res.status(500).json({ error: 'Database error: ' + e.message });
    }

    if (error) {
      console.error('[snippets GET]', error.message);
      return res.status(500).json({ error: 'Gagal mengambil data: ' + error.message });
    }

    // Return has_password flag instead of actual hash
    const result = (data || []).map(s => ({
      ...s,
      has_password: !!s.password_hash,
      password_hash: undefined,   // strip from response
    }));

    res.setHeader('Cache-Control', 'public, max-age=20, stale-while-revalidate=30');
    return res.status(200).json(result);
  }

  // ── POST: actions
  if (req.method === 'POST') {
    const body   = parseBody(req);
    const { action, id: rawId } = body;
    const id     = parseInt(rawId, 10);
    const ip     = getIP(req);
    const now    = Date.now();

    if (!Number.isFinite(id) || id <= 0)
      return res.status(400).json({ error: 'id tidak valid' });

    // VIEW
    if (action === 'view') {
      const rlk = `v:${ip}:${id}`;
      if (!viewRL.has(rlk)) {
        viewRL.set(rlk, now + 60_000);
        await svc.rpc('increment_views', { row_id: id }).catch(() => {});
      }
      const { data } = await pub.from('snippets').select('views').eq('id', id).single();
      return res.status(200).json({ views: data?.views ?? 0 });
    }

    // LIKE
    if (action === 'like') {
      const rlk = `l:${ip}:${id}`;
      if (likeRL.has(rlk) && now < likeRL.get(rlk))
        return res.status(429).json({ error: 'Terlalu cepat' });
      likeRL.set(rlk, now + 3_000);
      const { data } = await svc.rpc('increment_likes', { row_id: id });
      return res.status(200).json({ likes: data ?? 0 });
    }

    // UNLIKE
    if (action === 'unlike') {
      const rlk = `u:${ip}:${id}`;
      if (likeRL.has(rlk) && now < likeRL.get(rlk))
        return res.status(429).json({ error: 'Terlalu cepat' });
      likeRL.set(rlk, now + 3_000);
      const { data } = await svc.rpc('decrement_likes', { row_id: id });
      return res.status(200).json({ likes: data ?? 0 });
    }

    return res.status(400).json({ error: 'Action tidak valid' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
