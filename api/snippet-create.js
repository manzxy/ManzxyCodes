// api/snippet-create.js
// POST /api/snippet-create → upload snippet baru
// Anti-spam: rate limit, entropy check, honeypot, duplicate check

import { createClient } from '@supabase/supabase-js';

const svc = () => createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// ── In-memory store: IP → { count, reset, lastTitles[] }
const ipStore = new Map();
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of ipStore) {
    if (now > v.reset) ipStore.delete(k);
  }
}, 10 * 60_000);

function getIP(req) {
  return (req.headers['x-forwarded-for'] || '').split(',')[0].trim()
    || req.socket?.remoteAddress
    || 'unknown';
}

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

// ── Entropy check: random strings have high entropy (many unique chars relative to length)
// Normal title: "Fetch Retry Helper" → low entropy
// Spam title:   "1GQczcGF" → high entropy (almost every char unique)
function isHighEntropy(str) {
  if (!str || str.length < 4) return false;
  const s = str.toLowerCase().replace(/\s+/g, '');
  if (s.length < 4) return false;
  const unique = new Set(s).size;
  const ratio  = unique / s.length;
  // If >75% of chars are unique AND string has mixed case+numbers → likely random
  const hasMixedCaseNum = /[A-Z]/.test(str) && /[a-z]/.test(str) && /[0-9]/.test(str);
  return ratio > 0.75 && hasMixedCaseNum && s.length <= 16;
}

// ── Check if string looks like a real word/sentence (has vowels, spaces, etc)
function isMeaningful(str) {
  if (!str) return false;
  const s = str.trim();
  // Must have at least one space OR be >= 4 chars with vowels
  const hasVowel  = /[aeiouAEIOU]/.test(s);
  const hasSpace  = s.includes(' ');
  const onlyRandom = isHighEntropy(s);
  if (onlyRandom) return false;
  // Allow short but meaningful: "API", "JWT", "Go", etc.
  if (s.length <= 3) return true; // too short to judge
  return hasVowel || hasSpace;
}

// ── Duplicate title check (same IP, last 10 submissions)
function isDuplicateTitle(ip, title) {
  const rec = ipStore.get(ip);
  if (!rec || !rec.titles) return false;
  const t = title.toLowerCase().trim();
  return rec.titles.includes(t);
}

function recordSubmission(ip, title) {
  const now = Date.now();
  const rec = ipStore.get(ip) || { count: 0, reset: now + 60_000, titles: [] };
  rec.titles = rec.titles || [];
  rec.titles.push(title.toLowerCase().trim());
  if (rec.titles.length > 10) rec.titles.shift();
  ipStore.set(ip, rec);
}

function validate(b) {
  const e = {};
  if (!b.author?.trim())      e.author      = 'Wajib diisi';
  else if (b.author.trim().length > 50) e.author = 'Maksimal 50 karakter';

  if (!b.title?.trim())       e.title       = 'Wajib diisi';
  else if (b.title.trim().length > 120) e.title = 'Maksimal 120 karakter';
  else if (b.title.trim().length < 3)   e.title = 'Judul terlalu pendek';

  if (!b.description?.trim()) e.description = 'Wajib diisi';
  else if (b.description.trim().length < 5) e.description = 'Deskripsi terlalu pendek';
  else if (b.description.trim().length > 500) e.description = 'Maksimal 500 karakter';

  if (!b.code?.trim())        e.code        = 'Wajib diisi';
  else if (b.code.trim().length > 50000) e.code = 'Kode terlalu panjang';

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

  const ip   = getIP(req);
  const body = parseBody(req);

  // ── 1. HONEYPOT — bot mengisi field tersembunyi, manusia tidak
  if (body._hp && body._hp !== '') {
    // Pura-pura sukses agar bot tidak tahu kena trap
    return res.status(201).json({ ok: true });
  }

  // ── 2. RATE LIMIT per IP — max 3 per 10 menit
  const now = Date.now();
  const rec = ipStore.get(ip) || { count: 0, reset: now + 10 * 60_000, titles: [] };
  if (now > rec.reset) { rec.count = 0; rec.reset = now + 10 * 60_000; }
  rec.count++;
  ipStore.set(ip, rec);

  if (rec.count > 3) {
    const wait = Math.ceil((rec.reset - now) / 60_000);
    return res.status(429).json({ error: `Terlalu banyak upload. Tunggu ${wait} menit.` });
  }

  // ── 3. VALIDASI FIELD
  const errors = validate(body);
  if (Object.keys(errors).length) return res.status(400).json({ errors });

  const { author, title, description, language, tags, code, snippetKey } = body;

  // ── 4. ANTI-SPAM CONTENT CHECK
  // a) Title entropy — random string
  if (isHighEntropy(title.trim())) {
    return res.status(400).json({ errors: { title: 'Judul tidak valid. Gunakan judul yang bermakna.' } });
  }

  // b) Author entropy
  if (isHighEntropy(author.trim())) {
    return res.status(400).json({ errors: { author: 'Nama author tidak valid.' } });
  }

  // c) Title meaningful check
  if (!isMeaningful(title.trim())) {
    return res.status(400).json({ errors: { title: 'Judul harus bermakna, bukan string acak.' } });
  }

  // d) Description too short / nonsense
  if (!isMeaningful(description.trim())) {
    return res.status(400).json({ errors: { description: 'Deskripsi harus bermakna.' } });
  }

  // e) Duplicate title from same IP
  if (isDuplicateTitle(ip, title)) {
    return res.status(400).json({ errors: { title: 'Kamu sudah upload snippet dengan judul ini.' } });
  }

  // f) Title same as description (copy-paste spam pattern)
  if (title.trim().toLowerCase() === description.trim().toLowerCase()) {
    return res.status(400).json({ errors: { description: 'Deskripsi tidak boleh sama dengan judul.' } });
  }

  // g) Code too short (must have actual content)
  if (code.trim().length < 10) {
    return res.status(400).json({ errors: { code: 'Kode terlalu pendek.' } });
  }

  // ── 5. CHECK DUPLICATE TITLE IN DB (last 100 snippets)
  const { data: existing } = await svc()
    .from('snippets')
    .select('id')
    .ilike('title', title.trim())
    .limit(1);
  if (existing && existing.length > 0) {
    return res.status(400).json({ errors: { title: 'Snippet dengan judul ini sudah ada.' } });
  }

  // ── 6. INSERT
  const VALID_LANGS = ["JavaScript", "TypeScript", "HTML", "CSS", "Sass", "PHP", "Vue", "React", "Svelte", "Python", "Go", "Java", "Kotlin", "Ruby", "Rust", "C#", "Scala", "Elixir", "Clojure", "Erlang", "OCaml", "Perl", "Groovy", "C", "C++", "Swift", "Dart", "Zig", "Nim", "Assembly", "Crystal", "V", "Shell", "Bash", "PowerShell", "Lua", "SQL", "R", "GraphQL", "Julia", "MATLAB", "JSON", "YAML", "TOML", "XML", "Markdown", "Dockerfile", "Terraform", "Nginx", "Kubernetes", "Solidity", "Vyper", "Haskell", "F#", "Elm", "Prolog", "Prisma", "Proto"];
  const safeLang    = VALID_LANGS.includes(language) ? language : 'JavaScript';
  const strip       = s => String(s || '').replace(/<[^>]*>/g, '').trim();
  const tagsArr     = (Array.isArray(tags)
    ? tags
    : String(tags || '').split(','))
    .map(t => strip(String(t)).substring(0, 30))
    .filter(Boolean)
    .slice(0, 5); // max 5 tags

  const { error } = await svc().from('snippets').insert([{
    author:           strip(author).substring(0, 50),
    title:            strip(title).substring(0, 120),
    description:      strip(description).substring(0, 500),
    language:         safeLang,
    tags:             tagsArr,
    code:             code.substring(0, 50000),
    snippet_key_hash: await hashKey(snippetKey.trim()),
    likes: 0,
    views: 0,
  }]);

  if (error) { console.error('[snippet-create]', error.message); return res.status(500).json({ error: error.message }); }

  // Record for duplicate detection
  recordSubmission(ip, title);

  return res.status(201).json({ ok: true });
}
