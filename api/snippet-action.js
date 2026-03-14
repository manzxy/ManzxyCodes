// api/snippet-action.js
// PUT    /api/snippet-action → edit snippet (key atau admin cookie)
// DELETE /api/snippet-action → hapus snippet (key atau admin cookie)

import { createClient } from '@supabase/supabase-js';
import { jwtVerify }    from 'jose';

const svc = () => createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function parseBody(req) {
  if (!req.body) return {};
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch { return {}; } }
  return req.body || {};
}

async function hashKey(raw) {
  const salt = process.env.KEY_SALT || 'manzxycodes_default_salt';
  const buf  = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw + salt));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function isAdmin(req) {
  try {
    const match = (req.headers.cookie || '').match(/mzx_token=([^;]+)/);
    if (!match) return false;
    await jwtVerify(match[1], new TextEncoder().encode(process.env.JWT_SECRET));
    return true;
  } catch { return false; }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!['PUT','DELETE'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed' });

  const body             = parseBody(req);
  const { id, snippetKey, title, language, description, tags, code } = body;

  if (!id) return res.status(400).json({ error: 'id diperlukan' });

  const admin = await isAdmin(req);
  const db    = svc();

  // Kalau bukan admin → wajib cek key
  if (!admin) {
    if (!snippetKey) return res.status(403).json({ error: 'Snippet key diperlukan' });
    const { data, error } = await db.from('snippets').select('snippet_key_hash').eq('id', id).single();
    if (error || !data) return res.status(404).json({ error: 'Snippet tidak ditemukan' });
    if (await hashKey(snippetKey) !== data.snippet_key_hash) {
      await new Promise(r => setTimeout(r, 150 + Math.random() * 200));
      return res.status(403).json({ error: 'Key salah!' });
    }
  }

  // PUT — edit
  if (req.method === 'PUT') {
    const tagsArr = Array.isArray(tags)
      ? tags.map(t => String(t).trim()).filter(Boolean)
      : String(tags || '').split(',').map(t => t.trim()).filter(Boolean);

    const upd = {};
    if (title       !== undefined) upd.title       = title;
    if (language    !== undefined) upd.language    = language;
    if (description !== undefined) upd.description = description;
    if (tags        !== undefined) upd.tags        = tagsArr;
    if (code        !== undefined) upd.code        = code;

    if (!Object.keys(upd).length) return res.status(400).json({ error: 'Tidak ada perubahan' });

    const { error } = await db.from('snippets').update(upd).eq('id', id);
    if (error) { console.error('[PUT]', error.message); return res.status(500).json({ error: error.message }); }
    return res.status(200).json({ ok: true });
  }

  // DELETE
  const { error } = await db.from('snippets').delete().eq('id', id);
  if (error) { console.error('[DELETE]', error.message); return res.status(500).json({ error: error.message }); }
  return res.status(200).json({ ok: true });
}
