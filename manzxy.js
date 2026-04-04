/**
 * ManzxyCodes — manzxy.js  v3.0 HARDENED
 * Express server (VPS)
 * © 2026 By Manzxy
 */

// ══════════════════════════════════════════════════════ IMPORTS
import 'dotenv/config';
import express           from 'express';
import cookieParser      from 'cookie-parser';
import { createClient }  from '@supabase/supabase-js';
import { SignJWT, jwtVerify } from 'jose';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

// ══════════════════════════════════════════════════════ CONFIG
const PORT     = parseInt(process.env.PORT || '3000', 10);
const DOMAIN   = process.env.DOMAIN || '*';
const NODE_ENV = process.env.NODE_ENV || 'development';
const isProd   = NODE_ENV === 'production';

const REQUIRED_ENV = [
  'SUPABASE_URL','SUPABASE_ANON_KEY','SUPABASE_SERVICE_ROLE_KEY',
  'ADMIN_USERNAME','ADMIN_PASSWORD_HASH','JWT_SECRET','PASSWORD_SALT',
];
const missing = REQUIRED_ENV.filter(k => !process.env[k]);
if (missing.length) {
  console.error('❌ ENV VARS MISSING:', missing.join(', '));
  process.exit(1);
}

// Minimal JWT secret length
if ((process.env.JWT_SECRET || '').length < 32) {
  console.error('❌ JWT_SECRET must be at least 32 characters');
  process.exit(1);
}

// ══════════════════════════════════════════════════════ SUPABASE
const sbPub = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
const sbSvc = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// ══════════════════════════════════════════════════════ HELPERS

async function sha256(text, salt = '') {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text + salt));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
}

const hashKey = k  => sha256(k,  process.env.KEY_SALT      || 'mzx_key_salt');
const hashPwd = p  => sha256(p,  process.env.PASSWORD_SALT || '');

// Constant-time string compare to prevent timing attacks
function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) {
    // Still iterate to prevent timing leak on length
    let diff = 0;
    for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i)||0) ^ (b.charCodeAt(i)||0);
    return false;
  }
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function makeJWT(payload) {
  return new SignJWT({ ...payload, iss: 'manzxycodes', aud: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(new TextEncoder().encode(process.env.JWT_SECRET));
}

async function verifyAdmin(req) {
  try {
    const token = req.cookies?.mzx_token;
    if (!token) return false;
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(process.env.JWT_SECRET),
      { issuer: 'manzxycodes', audience: 'admin' }
    );
    return payload.role === 'admin';
  } catch { return false; }
}

function getIP(req) {
  return (req.headers['x-forwarded-for'] || '').split(',')[0].trim()
    || req.socket?.remoteAddress
    || 'unknown';
}

const err = (res, status, msg) => res.status(status).json({ error: msg });

// Strip HTML tags
function strip(str) { return String(str || '').replace(/<[^>]*>/g, '').trim(); }

// Entropy check for spam detection
function isHighEntropy(str) {
  if (!str || str.length < 4) return false;
  const s = str.toLowerCase().replace(/\s+/g, '');
  if (s.length < 4) return false;
  const ratio = new Set(s).size / s.length;
  const mixed  = /[A-Z]/.test(str) && /[a-z]/.test(str) && /[0-9]/.test(str);
  return ratio > 0.75 && mixed && s.length <= 16;
}

// Sanitize ID — must be positive integer
function sanitizeId(id) {
  const n = parseInt(id, 10);
  return Number.isFinite(n) && n > 0 && n < 2_147_483_647 ? n : null;
}

// Escape SQL LIKE wildcards to prevent injection
function escapeLike(str) {
  return String(str || '').replace(/[%_\\]/g, c => '\\' + c);
}

// ══════════════════════════════════════════════════════ SECURITY STORES

// IP blacklist — permanent until server restart
const ipBlacklist  = new Set();
// Violation counter per IP
const ipViolations = new Map(); // ip → { count, firstAt }
// Rate limiting store
const rateStore    = new Map();
// Global rate store
const globalStore  = new Map();
// Admin login lockout store
const loginLockout = new Map(); // ip → { fails, lockedUntil, totalFails }
// View dedup store
const viewedStore  = new Map(); // ip:id → timestamp
// Like dedup store
const likeStore    = new Map(); // ip:id → timestamp

// Auto-cleanup every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of rateStore)   if (now > v.reset)   rateStore.delete(k);
  for (const [k, v] of globalStore) if (now > v.reset)   globalStore.delete(k);
  for (const [k, v] of viewedStore) if (now - v > 15*60_000) viewedStore.delete(k);
  for (const [k, v] of likeStore)   if (now - v > 15*60_000) likeStore.delete(k);
  for (const [k, v] of ipViolations) {
    if (now - v.firstAt > 24*60*60_000) ipViolations.delete(k);
  }
}, 10 * 60_000);

function recordViolation(ip, weight = 1) {
  if (!ip || ip === 'unknown') return;
  const rec = ipViolations.get(ip) || { count: 0, firstAt: Date.now() };
  rec.count += weight;
  ipViolations.set(ip, rec);
  if (rec.count >= 15) {
    ipBlacklist.add(ip);
    console.warn('[BLACKLIST]', ip, 'auto-blacklisted. violations:', rec.count);
  }
}

// ══════════════════════════════════════════════════════ EXPRESS

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false, limit: '50kb' }));
app.use(cookieParser());

// ── 1. IP BLACKLIST CHECK (first middleware, before everything)
app.use((req, res, next) => {
  const ip = getIP(req);
  if (ipBlacklist.has(ip)) return res.status(403).end();
  next();
});

// ── 2. GLOBAL RATE LIMIT (200 req/min per IP across all endpoints)
app.use((req, res, next) => {
  // Skip static assets from rate limiting
  if (/\.(html|css|js|ico|png|jpg|woff2?|svg|map)$/.test(req.path)) return next();
  const ip  = getIP(req);
  const now = Date.now();
  const key = 'g:' + ip;
  const rec = globalStore.get(key) || { count: 0, reset: now + 60_000 };
  if (now > rec.reset) { rec.count = 0; rec.reset = now + 60_000; }
  rec.count++;
  globalStore.set(key, rec);
  if (rec.count > 200) {
    recordViolation(ip, 2);
    return res.status(429).end();
  }
  next();
});

// ── 3. BLOCK SCANNER PATHS
app.use((req, res, next) => {
  const p = req.path.toLowerCase();
  const bad = [
    '/wp-admin','/wp-login','/phpmyadmin','/.env','/.git','/.github',
    '/admin.php','/config.php','/shell','/c99','/r57','/xmlrpc',
    '/actuator','/actuator/','/swagger','/api-docs','/.aws','/.ssh',
    '/credentials','/passwd','/etc/','/proc/','/cgi-bin','/backdoor',
    '/webshell','/upload.php','/eval','/base64','/phpinfo',
  ];
  if (bad.some(b => p.startsWith(b) || p.includes(b))) {
    recordViolation(getIP(req), 3);
    return res.status(404).end();
  }
  next();
});

// ── 4. BLOCK ATTACK UA SIGNATURES
app.use((req, res, next) => {
  const ua = (req.headers['user-agent'] || '').toLowerCase();
  const attackUA = ['sqlmap','nikto','nmap','masscan','nuclei','zgrab',
    'metasploit','havij','acunetix','openvas','burpsuite','dirbuster',
    'gobuster','wfuzz','hydra','medusa'];
  if (attackUA.some(b => ua.includes(b))) {
    recordViolation(getIP(req), 5);
    return res.status(403).end();
  }
  // Block empty UA on mutations
  if (!ua && ['POST','PUT','DELETE'].includes(req.method)) {
    recordViolation(getIP(req));
    return res.status(400).json({ error: 'Bad request' });
  }
  next();
});

// ── 5. BLOCK XSS / INJECTION IN URL & HEADERS
app.use((req, res, next) => {
  const check = req.url + (req.headers['referer'] || '') + (req.headers['x-forwarded-host'] || '');
  const patterns = ['<script','javascript:','data:text/html','vbscript:',
    'onload=','onerror=','onmouseover=','expression(','&#x','%3cscript'];
  if (patterns.some(p => check.toLowerCase().includes(p))) {
    recordViolation(getIP(req), 2);
    return res.status(400).json({ error: 'Bad request' });
  }
  next();
});

// ── 6. SECURITY HEADERS
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=(), payment=(), usb=()');
  res.setHeader('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ].join('; '));
  if (isProd) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  next();
});

// ── 7. CORS — public endpoints open, admin endpoints strict
app.use((req, res, next) => {
  const origin   = req.headers.origin;
  const path     = req.path;
  const isPublic = (req.method === 'GET' && (path === '/api/snippets' || path.startsWith('/api/snippet/'))) || path === '/api/health';

  if (isPublic) {
    // Public read endpoints — allow any origin, no credentials
    res.setHeader('Access-Control-Allow-Origin', '*');
  } else {
    // Admin/mutation endpoints — strict origin whitelist
    // Build allowed list from DOMAIN env + defaults
    const allowed = ['http://localhost:3000','http://localhost:5500'];
    if (DOMAIN && DOMAIN !== '*') {
      DOMAIN.split(',').forEach(d => {
        const t = d.trim();
        if (t) { allowed.push(t); allowed.push(t.replace('https://','https://www.')); }
      });
    }
    // Also allow the request's own host (covers any domain pointing to this server)
    const reqHost = req.headers.host;
    if (reqHost) {
      ['https://','http://'].forEach(s => { const full=s+reqHost; if(!allowed.includes(full)) allowed.push(full); });
    }
    if (!origin || allowed.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin || (DOMAIN&&DOMAIN!=='*'?DOMAIN.split(',')[0].trim():'*'));
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin');
  if (req.method === 'OPTIONS') return res.status(200).end();
  next();
});

// ── Rate limiter factory
function rateLimit(maxReq, windowMs) {
  return (req, res, next) => {
    const ip  = getIP(req);
    const now = Date.now();
    const key = ip + ':' + req.path;
    const rec = rateStore.get(key) || { count: 0, reset: now + windowMs };
    if (now > rec.reset) { rec.count = 0; rec.reset = now + windowMs; }
    rec.count++;
    rateStore.set(key, rec);
    if (rec.count > maxReq) {
      recordViolation(ip);
      const retry = Math.ceil((rec.reset - now) / 1000);
      res.setHeader('Retry-After', String(retry));
      return res.status(429).json({ error: 'Rate limit. Coba lagi dalam ' + retry + ' detik.' });
    }
    next();
  };
}

// ── Enforce JSON body for mutations
function requireJSON(req, res, next) {
  if (['POST','PUT','DELETE'].includes(req.method)) {
    const ct = req.headers['content-type'] || '';
    if (!ct.includes('application/json')) return res.status(415).json({ error: 'Content-Type harus application/json' });
  }
  next();
}

// ══════════════════════════════════════════════════════ DEV LOGGER
if (!isProd) {
  app.use((req, res, next) => {
    const t = Date.now();
    res.on('finish', () => {
      const col = res.statusCode >= 400 ? '\x1b[31m' : '\x1b[32m';
      console.log(col + req.method + '\x1b[0m', req.path, '→', res.statusCode, '(' + (Date.now()-t) + 'ms)');
    });
    next();
  });
}

// ══════════════════════════════════════════════════════ STATIC FILES

// Static routes are mounted AFTER /api — see below

// ══════════════════════════════════════════════════════ API ROUTER
const api = express.Router();
api.use(requireJSON);

// ── Server-side cache for snippets (reduces Supabase calls drastically)
let snippetsCache = { data: null, at: 0, ttl: 10_000 }; // 10 second TTL

function invalidateCache() { snippetsCache.at = 0; }

// ── GET /api/snippets — public, fast with server cache
api.get('/snippets', rateLimit(120, 60_000), async (req, res) => {
  const now = Date.now();
  // Serve from cache if fresh
  if (snippetsCache.data && (now - snippetsCache.at) < snippetsCache.ttl) {
    res.setHeader('X-Cache', 'HIT');
    res.setHeader('Cache-Control', 'public, max-age=5, stale-while-revalidate=30');
    return res.json(snippetsCache.data);
  }
  // Fetch WITHOUT code field for list view — code is large and not needed in list
  const { data, error } = await sbPub
    .from('snippets')
    .select('id,created_at,author,title,description,language,tags,likes,views')
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) return err(res, 500, 'Database error');
  snippetsCache = { data: data ?? [], at: now, ttl: 10_000 };
  res.setHeader('X-Cache', 'MISS');
  res.setHeader('Cache-Control', 'public, max-age=5, stale-while-revalidate=30');
  return res.json(snippetsCache.data);
});

// ── GET /api/snippet/:id — fetch single snippet WITH code (for detail view)
api.get('/snippet/:id', rateLimit(60, 60_000), async (req, res) => {
  const id = sanitizeId(req.params.id);
  if (!id) return err(res, 400, 'ID tidak valid');
  const { data, error } = await sbPub
    .from('snippets')
    .select('id,created_at,author,title,description,language,tags,code,likes,views')
    .eq('id', id)
    .single();
  if (error || !data) return err(res, 404, 'Snippet tidak ditemukan');
  res.setHeader('Cache-Control', 'public, max-age=10');
  return res.json(data);
});

// ── GET /api/snippet-get?id=X — single snippet with code
api.get('/snippet-get', rateLimit(60, 60_000), async (req, res) => {
  const id = sanitizeId(req.query.id);
  if (!id) return err(res, 400, 'ID tidak valid');
  const { data, error } = await sbPub
    .from('snippets')
    .select('id,created_at,author,title,description,language,tags,code,likes,views')
    .eq('id', id)
    .single();
  if (error || !data) return err(res, 404, 'Snippet tidak ditemukan');
  res.setHeader('Cache-Control', 'public, max-age=60');
  return res.json(data);
});

// ── POST /api/snippets — like/view with IP dedup
api.post('/snippets', rateLimit(30, 60_000), async (req, res) => {
  const { action, id: rawId } = req.body;
  const id = sanitizeId(rawId);
  if (!id)     return err(res, 400, 'ID tidak valid');
  if (!action) return err(res, 400, 'Action diperlukan');
  if (!['like','unlike','view'].includes(action)) return err(res, 400, 'Action tidak dikenal');

  const ip  = getIP(req);
  const now = Date.now();

  if (action === 'view') {
    const vKey = 'v:' + ip + ':' + id;
    const last  = viewedStore.get(vKey) || 0;
    if (now - last < 10 * 60_000) return res.json({ skipped: true });
    viewedStore.set(vKey, now);
    // Atomic increment via RPC — 1 query instead of 2
    const { error } = await sbSvc.rpc('increment_views', { row_id: id });
    if (error) {
      // Fallback: SELECT + UPDATE if RPC not available
      const { data } = await sbSvc.from('snippets').select('views').eq('id', id).single();
      if (!data) return err(res, 404, 'Snippet tidak ditemukan');
      await sbSvc.from('snippets').update({ views: (data.views||0)+1 }).eq('id', id);
    }
    return res.json({ ok: true });
  }

  if (action === 'like' || action === 'unlike') {
    const lKey = 'l:' + ip + ':' + id;
    const last  = likeStore.get(lKey) || 0;
    if (now - last < 5 * 60_000) return res.status(429).json({ error: 'Tunggu sebentar' });
    likeStore.set(lKey, now);
    const rpcName = action === 'like' ? 'increment_likes' : 'decrement_likes';
    const { data: rpcData, error: rpcErr } = await sbSvc.rpc(rpcName, { row_id: id });
    if (rpcErr) {
      // Fallback SELECT+UPDATE
      const { data } = await sbSvc.from('snippets').select('likes').eq('id', id).single();
      if (!data) return err(res, 404, 'Snippet tidak ditemukan');
      const l = Math.max(0, (data.likes||0) + (action==='like'?1:-1));
      await sbSvc.from('snippets').update({ likes: l }).eq('id', id);
      invalidateCache();
      return res.json({ likes: l });
    }
    invalidateCache();
    return res.json({ likes: rpcData ?? 0 });
  }
});

// ── POST /api/snippet-create — anti-spam
const createStore = new Map();
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of createStore) if (now > v.reset) createStore.delete(k);
}, 15 * 60_000);

const VALID_LANGS = ["JavaScript","TypeScript","HTML","CSS","Sass","PHP","Vue","React","Svelte","Python","Go","Java","Kotlin","Ruby","Rust","C#","Scala","Elixir","Clojure","Erlang","OCaml","Perl","Groovy","C","C++","Swift","Dart","Zig","Nim","Assembly","Crystal","V","Shell","Bash","PowerShell","Lua","SQL","R","GraphQL","Julia","MATLAB","JSON","YAML","TOML","XML","Markdown","Dockerfile","Terraform","Nginx","Kubernetes","Solidity","Vyper","Haskell","F#","Elm","Prolog","Prisma","Proto"];

api.post('/snippet-create', async (req, res) => {
  const ip  = getIP(req);
  const now = Date.now();

  // Honeypot
  if (req.body._hp) return res.status(201).json({ ok: true });

  // Rate limit: 3 per 10 min per IP
  const rec = createStore.get(ip) || { count: 0, reset: now + 10*60_000, titles: [] };
  if (now > rec.reset) { rec.count = 0; rec.reset = now + 10*60_000; rec.titles = []; }
  rec.count++;
  createStore.set(ip, rec);
  if (rec.count > 3) {
    recordViolation(ip);
    return err(res, 429, 'Terlalu banyak upload. Tunggu ' + Math.ceil((rec.reset-now)/60_000) + ' menit.');
  }

  const { author, title, description, language, tags, code, snippetKey } = req.body;
  const errors = {};

  if (!author?.trim() || author.length > 50)     errors.author      = author?.trim() ? 'Maksimal 50 karakter' : 'Wajib diisi';
  if (!title?.trim())                             errors.title       = 'Wajib diisi';
  else if (title.trim().length < 3)              errors.title       = 'Minimal 3 karakter';
  else if (title.length > 120)                   errors.title       = 'Maksimal 120 karakter';
  if (!description?.trim())                      errors.description = 'Wajib diisi';
  else if (description.trim().length < 5)        errors.description = 'Minimal 5 karakter';
  else if (description.length > 500)             errors.description = 'Maksimal 500 karakter';
  if (!code?.trim() || code.trim().length < 10)  errors.code        = 'Kode terlalu pendek';
  else if (code.length > 50000)                  errors.code        = 'Kode terlalu panjang';
  const k = snippetKey?.trim() || '';
  if (!k || k.length < 3 || k.length > 7)       errors.snippetKey  = 'Key harus 3–7 karakter';

  if (Object.keys(errors).length) return res.status(400).json({ errors });

  // Anti-spam content checks
  if (isHighEntropy(title.trim()))
    return res.status(400).json({ errors: { title: 'Judul tidak valid.' } });
  if (isHighEntropy(author.trim()))
    return res.status(400).json({ errors: { author: 'Nama author tidak valid.' } });

  const titleLow = title.trim().toLowerCase();
  if (rec.titles.includes(titleLow))
    return res.status(400).json({ errors: { title: 'Judul duplikat.' } });
  if (titleLow === description.trim().toLowerCase())
    return res.status(400).json({ errors: { description: 'Deskripsi tidak boleh sama dengan judul.' } });

  // DB duplicate check (escape LIKE wildcards)
  const safeTitle = escapeLike(title.trim());
  const { data: dup } = await sbSvc.from('snippets').select('id').ilike('title', safeTitle).limit(1);
  if (dup?.length > 0)
    return res.status(400).json({ errors: { title: 'Snippet dengan judul ini sudah ada.' } });

  const safeLang = VALID_LANGS.includes(language) ? language : 'JavaScript';
  const tagsArr  = (Array.isArray(tags) ? tags : String(tags||'').split(','))
    .map(t => strip(String(t)).substring(0,30)).filter(Boolean).slice(0,5);

  const { error } = await sbSvc.from('snippets').insert([{
    author: strip(author).substring(0,50),
    title:  strip(title).substring(0,120),
    description: strip(description).substring(0,500),
    language: safeLang, tags: tagsArr,
    code: code.substring(0,50000),
    snippet_key_hash: await hashKey(k),
    likes: 0, views: 0,
  }]);

  if (error) return err(res, 500, 'Database error');
  invalidateCache(); // clear cache after new snippet
  rec.titles.push(titleLow);
  if (rec.titles.length > 20) rec.titles.shift();
  createStore.set(ip, rec);
  return res.status(201).json({ ok: true });
});

// ── PUT /api/snippet-action — edit (constant-time key compare)
api.put('/snippet-action', rateLimit(10, 60_000), async (req, res) => {
  const { id: rawId, snippetKey, title, language, description, tags, code } = req.body;
  const id = sanitizeId(rawId);
  if (!id) return err(res, 400, 'ID tidak valid');

  const admin = await verifyAdmin(req);
  if (!admin) {
    if (!snippetKey) return err(res, 403, 'Snippet key diperlukan');
    const { data, error } = await sbSvc.from('snippets').select('snippet_key_hash').eq('id', id).single();
    if (error || !data) return err(res, 404, 'Snippet tidak ditemukan');
    const inputHash = await hashKey(snippetKey);
    await new Promise(r => setTimeout(r, 100 + Math.random() * 100)); // constant-time delay
    if (!safeEqual(inputHash, data.snippet_key_hash)) return err(res, 403, 'Key salah');
  }

  const safeLang = VALID_LANGS.includes(language) ? language : undefined;
  const tagsArr  = tags !== undefined
    ? (Array.isArray(tags) ? tags : String(tags||'').split(','))
        .map(t => strip(String(t)).substring(0,30)).filter(Boolean).slice(0,5)
    : undefined;

  const upd = {};
  if (title       !== undefined) upd.title       = strip(title).substring(0,120);
  if (safeLang    !== undefined) upd.language    = safeLang;
  if (description !== undefined) upd.description = strip(description).substring(0,500);
  if (tagsArr     !== undefined) upd.tags        = tagsArr;
  if (code        !== undefined) upd.code        = String(code).substring(0,50000);
  if (!Object.keys(upd).length) return err(res, 400, 'Tidak ada perubahan');

  const { error } = await sbSvc.from('snippets').update(upd).eq('id', id);
  if (error) return err(res, 500, 'Database error');
  invalidateCache();
  return res.json({ ok: true });
});

// ── DELETE /api/snippet-action
api.delete('/snippet-action', rateLimit(10, 60_000), async (req, res) => {
  const { id: rawId, snippetKey } = req.body;
  const id = sanitizeId(rawId);
  if (!id) return err(res, 400, 'ID tidak valid');

  const admin = await verifyAdmin(req);
  if (!admin) {
    if (!snippetKey) return err(res, 403, 'Snippet key diperlukan');
    const { data, error } = await sbSvc.from('snippets').select('snippet_key_hash').eq('id', id).single();
    if (error || !data) return err(res, 404, 'Snippet tidak ditemukan');
    const inputHash = await hashKey(snippetKey);
    await new Promise(r => setTimeout(r, 100 + Math.random() * 100));
    if (!safeEqual(inputHash, data.snippet_key_hash)) return err(res, 403, 'Key salah');
  }

  const { error } = await sbSvc.from('snippets').delete().eq('id', id);
  if (error) return err(res, 500, 'Database error');
  invalidateCache();
  return res.json({ ok: true });
});

// ── DELETE /api/admin-clean — bulk delete spam
api.delete('/admin-clean', rateLimit(5, 60_000), async (req, res) => {
  if (!await verifyAdmin(req)) return err(res, 403, 'Admin only');
  const { data, error } = await sbSvc.from('snippets')
    .select('id,title').eq('likes',0).eq('views',0).limit(1000);
  if (error) return err(res, 500, 'Database error');
  if (!data?.length) return res.json({ deleted: 0 });
  const spamIds = data.filter(s => isHighEntropy(s.title)).map(s => s.id);
  if (!spamIds.length) return res.json({ deleted: 0 });
  const { error: de } = await sbSvc.from('snippets').delete().in('id', spamIds);
  if (de) return err(res, 500, 'Database error');
  console.log('[admin-clean] Deleted', spamIds.length, 'spam snippets');
  return res.json({ deleted: spamIds.length });
});

// ── POST /api/admin-login — hardened
api.post('/admin-login', rateLimit(5, 5*60_000), async (req, res) => {
  const ip  = getIP(req);
  const now = Date.now();

  // Block attack tools
  const ua = (req.headers['user-agent'] || '').toLowerCase();
  const badUA = ['curl','wget','python-requests','httpie','axios/','go-http','scrapy'];
  if (ua && badUA.some(b => ua.includes(b))) {
    await new Promise(r => setTimeout(r, 2000));
    return err(res, 403, 'Akses ditolak');
  }

  // Lockout check
  const lock = loginLockout.get(ip) || { fails: 0, lockedUntil: 0, totalFails: 0 };
  if (now < lock.lockedUntil) {
    return err(res, 429, 'IP dikunci. Tunggu ' + Math.ceil((lock.lockedUntil-now)/60_000) + ' menit.');
  }

  const { username, password } = req.body;
  if (!username || !password || typeof username !== 'string' || typeof password !== 'string')
    return err(res, 400, 'Username & password diperlukan');

  // Max length to prevent DoS via huge password hash computation
  if (username.length > 100 || password.length > 256) return err(res, 400, 'Input terlalu panjang');

  try {
    const hexPwd = await hashPwd(password);
    const validUser = safeEqual(username, process.env.ADMIN_USERNAME || '');
    const validPass = safeEqual(hexPwd,   process.env.ADMIN_PASSWORD_HASH || '');

    if (!validUser || !validPass) {
      lock.fails++;
      lock.totalFails++;
      const delay = Math.min(500 + lock.fails * 500, 10000) + Math.random() * 300;

      if (lock.totalFails >= 20)      { lock.lockedUntil = now + 24*60*60_000; recordViolation(ip, 10); }
      else if (lock.totalFails >= 10) { lock.lockedUntil = now + 60*60_000;    recordViolation(ip, 5);  }
      else if (lock.fails >= 5)       { lock.lockedUntil = now + 15*60_000;    recordViolation(ip, 2);  }

      loginLockout.set(ip, lock);
      console.warn('[admin-login] Fail:', ip, 'total:', lock.totalFails);
      await new Promise(r => setTimeout(r, delay));
      if (lock.lockedUntil > now) return err(res, 429, 'IP dikunci karena terlalu banyak percobaan gagal.');
      return err(res, 401, 'Credentials salah. Sisa percobaan: ' + Math.max(0, 5 - lock.fails));
    }

    // Success
    loginLockout.delete(ip);
    console.log('[admin-login] Success:', ip);

    const token = await makeJWT({ role: 'admin' });
    res.cookie('mzx_token', token, {
      httpOnly: true, secure: isProd, sameSite: 'strict', // upgraded to Strict
      maxAge: 8 * 60 * 60 * 1000, path: '/',
    });
    return res.json({ ok: true });
  } catch (e) {
    console.error('[admin-login]', e.message);
    return err(res, 500, 'Server error');
  }
});

// ── GET /api/admin-verify
api.get('/admin-verify', async (req, res) => {
  return res.json({ admin: await verifyAdmin(req) });
});

// ── POST /api/admin-logout
api.post('/admin-logout', (req, res) => {
  res.clearCookie('mzx_token', { path: '/', sameSite: 'strict', secure: isProd });
  return res.json({ ok: true });
});

// ── GET /api/admin-blacklist — view security status
api.get('/admin-blacklist', async (req, res) => {
  if (!await verifyAdmin(req)) return err(res, 403, 'Admin only');
  return res.json({
    blacklisted:   Array.from(ipBlacklist),
    violations:    Object.fromEntries(ipViolations),
    loginLocks:    Array.from(loginLockout.entries()).map(([ip,v]) => ({
      ip, fails: v.fails, totalFails: v.totalFails,
      lockedUntil: v.lockedUntil ? new Date(v.lockedUntil).toISOString() : null,
    })),
  });
});

// ── POST /api/admin-unblock
api.post('/admin-unblock', async (req, res) => {
  if (!await verifyAdmin(req)) return err(res, 403, 'Admin only');
  const { ip } = req.body;
  if (!ip || typeof ip !== 'string') return err(res, 400, 'IP diperlukan');
  ipBlacklist.delete(ip);
  ipViolations.delete(ip);
  loginLockout.delete(ip);
  console.log('[admin-unblock]', ip);
  return res.json({ ok: true });
});

// ── GET /api/health
api.get('/health', (req, res) => {
  return res.json({
    status: 'ok', app: 'ManzxyCodes v3.0', env: NODE_ENV,
    uptime: Math.floor(process.uptime()) + 's',
    ts: new Date().toISOString(),
  });
});

// ── Mount API
app.use('/api', api);

// ══════════════════════════════════════════════════════ STATIC (AFTER API)
app.get('/info.html',  (req, res) => res.redirect(301, '/info'));
app.get('/index.html', (req, res) => res.redirect(301, '/app'));
app.use(express.static(__dirname, { index: false, maxAge: isProd ? '1d' : 0, dotfiles: 'ignore' }));
app.get('/',      (req, res) => res.sendFile(join(__dirname, 'info.html')));
app.get('/info',  (req, res) => res.sendFile(join(__dirname, 'info.html')));
app.get('/app',   (req, res) => res.sendFile(join(__dirname, 'index.html')));
app.get('/app/*', (req, res) => res.sendFile(join(__dirname, 'index.html')));
app.get('*',      (req, res) => res.sendFile(join(__dirname, 'info.html')));

// ══════════════════════════════════════════════════════ ERROR HANDLER
app.use((e, req, res, next) => {
  console.error('[UNHANDLED]', e.message);
  res.status(500).json({ error: 'Internal server error' });
});

// ══════════════════════════════════════════════════════ START
app.listen(PORT, '0.0.0.0', () => {
  console.log('\n╔══════════════════════════════════╗');
  console.log('║    ManzxyCodes v3.0 HARDENED     ║');
  console.log('╚══════════════════════════════════╝');
  console.log('🚀 Port:', PORT, '| Mode:', NODE_ENV);
  console.log('🔒 Security: 7-layer middleware active');
  console.log('🗄️  Supabase:', process.env.SUPABASE_URL?.substring(0,40));
  if (DOMAIN !== '*') console.log('🔗 Domain:', DOMAIN);
  console.log('');
});

process.on('SIGTERM', () => { console.log('[SIGTERM] Shutdown'); process.exit(0); });
process.on('SIGINT',  () => { console.log('[SIGINT] Shutdown');  process.exit(0); });
process.on('unhandledRejection', r => console.error('[unhandledRejection]', r));
process.on('uncaughtException',  e => console.error('[uncaughtException]',  e.message));
