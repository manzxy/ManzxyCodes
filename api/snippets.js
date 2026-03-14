// api/snippets.js
// GET  /api/snippets  → ambil semua snippet (public, no auth)
// POST /api/snippets  → { action:'like'|'unlike'|'view', id:number }

import { createClient } from '@supabase/supabase-js';

const pub = () => createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
const svc = () => createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function parseBody(req) {
  if (!req.body) return {};
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch { return {}; } }
  return req.body || {};
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

    const db = svc();

    if (action === 'view') {
      const { data, error } = await db.from('snippets').select('views').eq('id', id).single();
      if (error || !data) return res.status(404).json({ error: 'Snippet tidak ditemukan' });
      const v = (data.views || 0) + 1;
      await db.from('snippets').update({ views: v }).eq('id', id);
      return res.status(200).json({ views: v });
    }

    if (action === 'like' || action === 'unlike') {
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
