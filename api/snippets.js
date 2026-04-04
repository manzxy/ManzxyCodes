// api/snippets.js — Vercel Serverless
// GET  /api/snippets → list snippets (no code field, randomized order)
// POST /api/snippets → like/unlike/view

import { createClient } from '@supabase/supabase-js';

// Persistent clients (reused across warm invocations)
const pub = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
  { auth: { persistSession: false } }
);
const svc = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

// Simple module-level cache (survives warm starts)
let _cache = { data: null, at: 0 };
const CACHE_TTL = 15_000; // 15s

function getIP(req) {
  return (req.headers['x-forwarded-for'] || '').split(',')[0].trim()
    || req.socket?.remoteAddress || 'unknown';
}

function setCORS(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req, res) {
  setCORS(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  // ── GET — list snippets (fast, cached, randomized)
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

      if (error) {
        console.error('[snippets GET]', error.message);
        return res.status(500).json({ error: 'Database error' });
      }

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

  // ── POST — like/unlike/view
  if (req.method === 'POST') {
    try {
      let body = req.body;
      if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch { body = {}; }
      }
      body = body || {};

      const { action, id: rawId } = body;
      const id = parseInt(rawId, 10);

      if (!id || !Number.isFinite(id) || id <= 0) return res.status(400).json({ error: 'ID tidak valid' });
      if (!action) return res.status(400).json({ error: 'Action diperlukan' });
      if (!['like','unlike','view'].includes(action)) return res.status(400).json({ error: 'Action tidak dikenal' });

      if (action === 'view') {
        // Simple increment — no dedup on serverless (stateless)
        const { data, error } = await svc
          .from('snippets').select('views').eq('id', id).single();
        if (error || !data) return res.status(404).json({ error: 'Snippet tidak ditemukan' });
        const v = (data.views || 0) + 1;
        await svc.from('snippets').update({ views: v }).eq('id', id);
        return res.status(200).json({ views: v });
      }

      if (action === 'like' || action === 'unlike') {
        const { data, error } = await svc
          .from('snippets').select('likes').eq('id', id).single();
        if (error || !data) return res.status(404).json({ error: 'Snippet tidak ditemukan' });
        const l = Math.max(0, (data.likes || 0) + (action === 'like' ? 1 : -1));
        await svc.from('snippets').update({ likes: l }).eq('id', id);
        // Invalidate cache
        _cache.at = 0;
        return res.status(200).json({ likes: l });
      }
    } catch (e) {
      console.error('[snippets POST crash]', e.message);
      return res.status(500).json({ error: 'Server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
