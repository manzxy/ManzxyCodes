// api/snippet-create.js
// POST /api/snippet-create  →  upload snippet baru
// Anti-spam: honeypot, rate limit IP, entropy check, duplicate title

import { svc }                from '../src/lib/db.js';
import { parseBody, getIP,
         setCORS, handleOptions } from '../src/lib/apiHelpers.js';

// ── Per-IP rate limiter (3 uploads / 10 min)
const ipStore = new Map();
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of ipStore) if (now > v.reset) ipStore.delete(k);
}, 10 * 60_000);

async function hashKey(raw) {
  const salt = process.env.KEY_SALT || 'manzxycodes_default_salt';
  const buf  = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw + salt));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function isHighEntropy(str) {
  if (!str || str.length < 4) return false;
  const s   = str.toLowerCase().replace(/\s+/g, '');
  const ratio = new Set(s).size / s.length;
  const mixed = /[A-Z]/.test(str) && /[a-z]/.test(str) && /[0-9]/.test(str);
  return ratio > 0.75 && mixed && s.length <= 16;
}

function strip(s) { return String(s || '').replace(/<[^>]*>/g, '').trim(); }

function validate(b) {
  const e = {};
  const author = strip(b.author);
  const title  = strip(b.title);
  const desc   = strip(b.description);
  const code   = String(b.code || '').trim();
  const key    = String(b.snippetKey || '').trim();

  if (!author)          e.author      = 'Wajib diisi';
  else if (author.length > 50)  e.author = 'Maks 50 karakter';

  if (!title)           e.title       = 'Wajib diisi';
  else if (title.length < 3)    e.title  = 'Judul terlalu pendek';
  else if (title.length > 120)  e.title  = 'Maks 120 karakter';

  if (!desc)            e.description = 'Wajib diisi';
  else if (desc.length < 5)     e.description = 'Terlalu pendek';
  else if (desc.length > 500)   e.description = 'Maks 500 karakter';

  if (!code)            e.code        = 'Wajib diisi';
  else if (code.length < 10)    e.code = 'Kode terlalu pendek';
  else if (code.length > 50000) e.code = 'Kode terlalu panjang (maks 50.000 char)';

  if (!key || key.length < 3 || key.length > 7)
    e.snippetKey = 'Key harus 3–7 karakter';

  return e;
}

const VALID_LANGS = new Set([
  "JavaScript","TypeScript","HTML","CSS","Sass","PHP","Vue","React","Svelte",
  "Python","Go","Java","Kotlin","Ruby","Rust","C#","Scala","Elixir","Clojure",
  "Erlang","OCaml","Perl","Groovy","C","C++","Swift","Dart","Zig","Nim",
  "Assembly","Crystal","V","Shell","Bash","PowerShell","Lua","SQL","R",
  "GraphQL","Julia","MATLAB","JSON","YAML","TOML","XML","Markdown",
  "Dockerfile","Terraform","Nginx","Kubernetes","Solidity","Vyper",
  "Haskell","F#","Elm","Prolog","Prisma","Proto",
]);

export default async function handler(req, res) {
  setCORS(res, 'POST,OPTIONS');
  if (handleOptions(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip   = getIP(req);
  const body = parseBody(req);

  // 1. Honeypot — bots fill hidden fields
  if (body._hp && body._hp !== '') return res.status(201).json({ ok: true });

  // 2. Rate limit: 3 uploads / 10 min / IP
  const now = Date.now();
  const rec = ipStore.get(ip) || { count: 0, reset: now + 600_000, titles: [] };
  if (now > rec.reset) { rec.count = 0; rec.reset = now + 600_000; }
  rec.count++;
  ipStore.set(ip, rec);
  if (rec.count > 3) {
    const wait = Math.ceil((rec.reset - now) / 60_000);
    return res.status(429).json({ error: `Terlalu banyak upload. Tunggu ${wait} menit.` });
  }

  // 3. Validate fields
  const errors = validate(body);
  if (Object.keys(errors).length) return res.status(400).json({ errors });

  const { language, tags, code, snippetKey } = body;
  const author = strip(body.author).slice(0, 50);
  const title  = strip(body.title).slice(0, 120);
  const desc   = strip(body.description).slice(0, 500);

  // 4. Anti-spam content checks
  if (isHighEntropy(title))  return res.status(400).json({ errors: { title:  'Judul tidak valid (terlihat seperti string acak)' } });
  if (isHighEntropy(author)) return res.status(400).json({ errors: { author: 'Nama tidak valid' } });
  if (title.toLowerCase() === desc.toLowerCase())
    return res.status(400).json({ errors: { description: 'Deskripsi tidak boleh sama dengan judul' } });

  // 5. Duplicate title check
  const { data: existing } = await svc.from('snippets').select('id').ilike('title', title).limit(1);
  if (existing?.length) return res.status(400).json({ errors: { title: 'Snippet dengan judul ini sudah ada' } });

  // 6. Normalize tags
  const tagsArr = (Array.isArray(tags) ? tags : String(tags || '').split(','))
    .map(t => strip(String(t)).slice(0, 30)).filter(Boolean).slice(0, 5);

  // 7. Insert
  const { error } = await svc.from('snippets').insert([{
    author,
    title,
    description:      desc,
    language:         VALID_LANGS.has(language) ? language : 'JavaScript',
    tags:             tagsArr,
    code:             String(code).slice(0, 50000),
    snippet_key_hash: await hashKey(String(snippetKey).trim()),
    likes: 0,
    views: 0,
  }]);

  if (error) {
    console.error('[snippet-create]', error.message);
    return res.status(500).json({ error: 'Gagal menyimpan snippet' });
  }

  // Track title for dupe detection this session
  rec.titles.push(title.toLowerCase());
  if (rec.titles.length > 10) rec.titles.shift();
  ipStore.set(ip, rec);

  return res.status(201).json({ ok: true });
}
