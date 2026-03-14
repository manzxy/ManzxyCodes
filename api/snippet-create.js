// api/snippet-create.js
// Upload snippet baru — snippet_key di-hash sebelum disimpan ke DB

import { createClient } from '@supabase/supabase-js';

function getSB() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

async function hashKey(key) {
  const salt = process.env.KEY_SALT || '';
  const data = new TextEncoder().encode(key + salt);
  const buf  = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
}

function validate(body) {
  const errors = {};
  if (!body.author?.trim())   errors.author = 'Wajib diisi';
  if (!body.title?.trim())    errors.title  = 'Wajib diisi';
  if (!body.description?.trim()) errors.description = 'Wajib diisi';
  if (!body.code?.trim())     errors.code   = 'Wajib diisi';
  if (!body.snippetKey?.trim() || body.snippetKey.length < 3 || body.snippetKey.length > 7)
    errors.snippetKey = 'Key harus 3–7 karakter';
  return errors;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const errors = validate(req.body);
  if (Object.keys(errors).length) return res.status(400).json({ errors });

  const { author, title, description, language, tags, code, snippetKey } = req.body;
  const keyHash = await hashKey(snippetKey);
  const sb = getSB();

  const { error } = await sb.from('snippets').insert([{
    author, title, description,
    language: language || 'JavaScript',
    tags: Array.isArray(tags) ? tags : (tags||'').split(',').map(t=>t.trim()).filter(Boolean),
    code,
    snippet_key_hash: keyHash,   // hash saja yang disimpan, bukan plain key
    likes: 0,
    views: 0,
  }]);

  if (error) return res.status(500).json({ error: error.message });
  return res.status(201).json({ ok: true });
}
