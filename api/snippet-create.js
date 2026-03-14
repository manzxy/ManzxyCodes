// api/snippet-create.js
// POST /api/snippet-create → upload snippet baru

import { createClient } from '@supabase/supabase-js';

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

function validate(b) {
  const e = {};
  if (!b.author?.trim())      e.author      = 'Wajib diisi';
  if (!b.title?.trim())       e.title       = 'Wajib diisi';
  if (!b.description?.trim()) e.description = 'Wajib diisi';
  if (!b.code?.trim())        e.code        = 'Wajib diisi';
  const k = b.snippetKey?.trim() || '';
  if (!k || k.length < 3 || k.length > 7) e.snippetKey = 'Key harus 3–7 karakter';
  return e;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  const body   = parseBody(req);
  const errors = validate(body);
  if (Object.keys(errors).length) return res.status(400).json({ errors });

  const { author, title, description, language, tags, code, snippetKey } = body;
  const tagsArr = Array.isArray(tags)
    ? tags.map(t => String(t).trim()).filter(Boolean)
    : String(tags || '').split(',').map(t => t.trim()).filter(Boolean);

  const { error } = await svc().from('snippets').insert([{
    author:           author.trim(),
    title:            title.trim(),
    description:      (description || '').trim(),
    language:         language || 'JavaScript',
    tags:             tagsArr,
    code,
    snippet_key_hash: await hashKey(snippetKey.trim()),
    likes: 0,
    views: 0,
  }]);

  if (error) { console.error('[snippet-create]', error.message); return res.status(500).json({ error: error.message }); }
  return res.status(201).json({ ok: true });
}
