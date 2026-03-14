// api/snippet-action.js
// Handle edit & delete snippet — key di-verify di server
// Snippet key di DB disimpan sebagai SHA-256 hash (bukan plain text)

import { createClient } from '@supabase/supabase-js';
import { jwtVerify }   from 'jose';

// Supabase SERVICE ROLE key — hanya ada di server, TIDAK pernah ke client
function getSB() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY  // service role, bukan anon!
  );
}

async function hashKey(key) {
  const salt = process.env.KEY_SALT || '';
  const data = new TextEncoder().encode(key + salt);
  const buf  = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
}

async function isAdmin(req) {
  try {
    const cookie = req.headers.cookie || '';
    const match  = cookie.match(/admin_token=([^;]+)/);
    if (!match) return false;
    await jwtVerify(match[1], new TextEncoder().encode(process.env.JWT_SECRET));
    return true;
  } catch { return false; }
}

export default async function handler(req, res) {
  const { method } = req;
  const { id, snippetKey, ...body } = req.body || {};

  if (!['PUT','DELETE'].includes(method)) {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!id) return res.status(400).json({ error: 'ID required' });

  const admin = await isAdmin(req);
  const sb    = getSB();

  // Verify key kalau bukan admin
  if (!admin) {
    if (!snippetKey) return res.status(403).json({ error: 'Snippet key required' });

    const { data, error } = await sb
      .from('snippets')
      .select('snippet_key_hash')
      .eq('id', id)
      .single();

    if (error || !data) return res.status(404).json({ error: 'Snippet not found' });

    const inputHash = await hashKey(snippetKey);
    if (inputHash !== data.snippet_key_hash) {
      await new Promise(r => setTimeout(r, 150 + Math.random() * 200)); // anti-brute-force
      return res.status(403).json({ error: 'Key salah!' });
    }
  }

  // Admin atau key valid — lanjut
  if (method === 'PUT') {
    const { title, language, description, tags, code } = body;
    const { error } = await sb
      .from('snippets')
      .update({ title, language, description, tags, code })
      .eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  if (method === 'DELETE') {
    const { error } = await sb.from('snippets').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }
    }
