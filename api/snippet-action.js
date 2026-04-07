// api/snippet-action.js
// PUT    /api/snippet-action  →  edit snippet (key atau admin cookie)
// DELETE /api/snippet-action  →  hapus snippet (key atau admin cookie)

import { jwtVerify }           from 'jose';
import { svc }                 from '../src/lib/db.js';
import { parseBody, setCORS,
         handleOptions }       from '../src/lib/apiHelpers.js';

async function hashKey(raw) {
  const salt = process.env.KEY_SALT || 'manzxycodes_default_salt';
  const buf  = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw + salt));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function checkAdmin(req) {
  const JWT = process.env.JWT_SECRET;
  if (!JWT) return false;
  try {
    const m = (req.headers.cookie || '').match(/mzx_token=([^;]+)/);
    if (!m) return false;
    await jwtVerify(m[1], new TextEncoder().encode(JWT));
    return true;
  } catch { return false; }
}

// Rate limit for edit/delete (in-memory per cold start)
const actionRL = new Map();
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of actionRL) if (now > v) actionRL.delete(k);
}, 5 * 60_000);

export default async function handler(req, res) {
  setCORS(res, 'PUT,DELETE,OPTIONS');
  if (handleOptions(req, res)) return;
  if (!['PUT', 'DELETE'].includes(req.method))
    return res.status(405).json({ error: 'Method not allowed' });

  const body = parseBody(req);
  const { id: rawId, snippetKey, title, language, description, tags, code } = body;

  // Validate id
  const id = parseInt(rawId, 10);
  if (!Number.isFinite(id) || id <= 0)
    return res.status(400).json({ error: 'id tidak valid' });

  const admin = await checkAdmin(req);

  if (!admin) {
    if (!snippetKey || typeof snippetKey !== 'string' || snippetKey.trim().length < 3)
      return res.status(403).json({ error: 'Snippet key diperlukan' });

    // Rate limit: 10 attempts per 5 min per IP+id combo
    const ip  = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
    const rlk = `${ip}:${id}`;
    const now = Date.now();
    if (actionRL.has(rlk)) {
      const until = actionRL.get(rlk);
      if (now < until)
        return res.status(429).json({ error: 'Terlalu banyak percobaan. Tunggu 5 menit.' });
    }

    const { data, error } = await svc
      .from('snippets')
      .select('snippet_key_hash')
      .eq('id', id)
      .single();

    if (error || !data) return res.status(404).json({ error: 'Snippet tidak ditemukan' });

    const inputHash = await hashKey(snippetKey.trim());
    if (inputHash !== data.snippet_key_hash) {
      // Set rate limit on repeated wrong key
      actionRL.set(rlk, now + 5 * 60_000);
      await new Promise(r => setTimeout(r, 150 + Math.random() * 200)); // anti brute-force delay
      return res.status(403).json({ error: 'Key salah' });
    }
  }

  if (req.method === 'PUT') {
    // Build update object — only include defined non-empty fields
    const upd = {};
    if (title       != null) upd.title       = String(title).trim().slice(0, 120);
    if (language    != null) upd.language    = String(language).trim();
    if (description != null) upd.description = String(description).trim().slice(0, 500);
    if (code        != null) upd.code        = String(code).slice(0, 50000);
    if (tags        != null) {
      upd.tags = (Array.isArray(tags) ? tags : String(tags).split(','))
        .map(t => String(t).trim()).filter(Boolean).slice(0, 5);
    }
    if (!Object.keys(upd).length) return res.status(400).json({ error: 'Tidak ada perubahan' });
    if (upd.title && upd.title.length < 3) return res.status(400).json({ error: 'Judul terlalu pendek' });

    const { error } = await svc.from('snippets').update(upd).eq('id', id);
    if (error) { console.error('[snippet-action PUT]', error.message); return res.status(500).json({ error: 'Gagal update' }); }
    return res.status(200).json({ ok: true });
  }

  // DELETE
  const { error } = await svc.from('snippets').delete().eq('id', id);
  if (error) { console.error('[snippet-action DELETE]', error.message); return res.status(500).json({ error: 'Gagal hapus' }); }
  return res.status(200).json({ ok: true });
}
