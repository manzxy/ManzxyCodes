/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║              ManzxyCodes — manzxy.js                        ║
 * ║  Express server untuk VPS / Panel / Shared Hosting          ║
 * ║  Semua API route + static files dalam SATU file             ║
 * ║  © 2026 By Manzxy — All rights reserved                     ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Cara jalankan:
 *   node manzxy.js
 *
 * Dengan PM2 (recomended untuk VPS):
 *   pm2 start manzxy.js --name manzxycodes
 *   pm2 save && pm2 startup
 *
 * Env vars — buat file .env di folder yang sama:
 *   PORT=3000
 *   SUPABASE_URL=https://xxxxx.supabase.co
 *   SUPABASE_ANON_KEY=eyJhbGci...
 *   SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
 *   ADMIN_USERNAME=admin
 *   ADMIN_PASSWORD_HASH=<sha256 hex — lihat SETUP.md>
 *   PASSWORD_SALT=<string acak min 16 char>
 *   JWT_SECRET=<string acak min 32 char>
 *   KEY_SALT=<string acak lain untuk snippet key>
 *   DOMAIN=https://manzxy.biz.id    (domain kamu)
 *   NODE_ENV=production
 */

// ═══════════════════════════════════════════ IMPORTS
import 'dotenv/config';
import express          from 'express';
import cookieParser     from 'cookie-parser';
import { createClient } from '@supabase/supabase-js';
import { SignJWT, jwtVerify } from 'jose';
import { fileURLToPath } from 'url';
import { dirname, join }    from 'path';

// ═══════════════════════════════════════════ PATHS
const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

// ═══════════════════════════════════════════ CONFIG
const PORT      = parseInt(process.env.PORT || '3000', 10);
const DOMAIN    = process.env.DOMAIN || '*';
const NODE_ENV  = process.env.NODE_ENV || 'development';
const isProd    = NODE_ENV === 'production';

// Validasi env vars penting
const REQUIRED_ENV = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'ADMIN_USERNAME',
  'ADMIN_PASSWORD_HASH',
  'JWT_SECRET',
];
const missingEnv = REQUIRED_ENV.filter(k => !process.env[k]);
if (missingEnv.length) {
  console.error('\n❌  ENV VARS MISSING:', missingEnv.join(', '));
  console.error('   Buat file .env — lihat SETUP.md\n');
  process.exit(1);
}

// ═══════════════════════════════════════════ SUPABASE CLIENTS
const sbPub = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);
const sbSvc = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ═══════════════════════════════════════════ HELPERS

/** Hash key/password pakai SHA-256 + salt */
async function sha256(text, salt = '') {
  const buf = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(text + salt)
  );
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0')).join('');
}

/** Hash snippet key dengan KEY_SALT */
const hashKey = (key) =>
  sha256(key, process.env.KEY_SALT || 'manzxycodes_default_salt');

/** Hash password dengan PASSWORD_SALT */
const hashPwd = (pwd) =>
  sha256(pwd, process.env.PASSWORD_SALT || '');

/** Buat JWT token */
async function makeJWT(payload, expiresIn = '8h') {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(new TextEncoder().encode(process.env.JWT_SECRET));
}

/** Verify JWT dari cookie request */
async function verifyAdmin(req) {
  try {
    const token = req.cookies?.mzx_token;
    if (!token) return false;
    await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET));
    return true;
  } catch {
    return false;
  }
}

/** Standard JSON error response */
const err = (res, status, msg) => res.status(status).json({ error: msg });

// ═══════════════════════════════════════════ EXPRESS SETUP
const app = express();

// ── Trust proxy — wajib untuk dapat IP asli di balik Nginx
// '1' artinya percaya 1 level proxy (Nginx)
app.set('trust proxy', 1);

// ── Sembunyikan Express fingerprint
app.disable('x-powered-by');

// ── Body parser — JSON
app.use(express.json({ limit: '100kb' }));  // snippet tidak perlu lebih dari 100kb
app.use(express.urlencoded({ extended: false, limit: '50kb' }));

// ── Cookie parser
app.use(cookieParser());

// ── CORS — credentials:true tidak kompatibel dengan Allow-Origin: *
// Harus pakai origin spesifik saat ada cookies
app.use((req, res, next) => {
  const origin  = req.headers.origin;
  // Daftar origin yang diizinkan
  const allowed = [
    'https://manzxy.biz.id',
    'https://www.manzxy.biz.id',
    'http://localhost:3000',
    'http://localhost:5500',
  ];
  if (DOMAIN !== '*') {
    // Tambahkan domain dari env jika belum ada
    DOMAIN.split(',').map(d => d.trim()).forEach(d => {
      if (d && !allowed.includes(d)) allowed.push(d);
    });
  }
  if (!origin || allowed.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin || allowed[0]);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Vary', 'Origin');
  if (req.method === 'OPTIONS') return res.status(200).end();
  next();
});

// ── Security headers (hardened)
app.use((req, res, next) => {
  // Anti clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  // Anti MIME sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // XSS protection (legacy browsers)
  res.setHeader('X-XSS-Protection', '1; mode=block');
  // Referrer
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  // Permissions — matikan semua API browser yang tidak dipakai
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=(), payment=()');
  // Content Security Policy
  res.setHeader('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; '));
  if (isProd) {
    // HSTS — force HTTPS for 1 year
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  next();
});

// ── Request logger (dev)
if (!isProd) {
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const ms = Date.now() - start;
      const col = res.statusCode >= 400 ? '\x1b[31m' : '\x1b[32m';
      console.log(`${col}${req.method}\x1b[0m ${req.path} → ${res.statusCode} (${ms}ms)`);
    });
    next();
  });
}

// ═══════════════════════════════════════════ RATE LIMITER (sederhana, in-memory)
const rateMap = new Map();
function rateLimit(maxReq = 20, windowMs = 60_000) {
  return (req, res, next) => {
    const ip  = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const key = `${ip}:${req.path}`;
    const rec = rateMap.get(key) || { count: 0, reset: now + windowMs };

    if (now > rec.reset) {
      rec.count = 0;
      rec.reset = now + windowMs;
    }
    rec.count++;
    rateMap.set(key, rec);

    if (rec.count > maxReq) {
      return res.status(429).json({ error: 'Terlalu banyak request. Coba lagi nanti.' });
    }
    next();
  };
}
// Bersihkan map tiap 5 menit biar tidak memory leak
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of rateMap) {
    if (now > v.reset) rateMap.delete(k);
  }
}, 5 * 60_000);

// ═══════════════════════════════════════════ API ROUTES

const api = express.Router();

// ─────────────────────────────────────────── GET /api/snippets
api.get('/snippets', async (req, res) => {
  const { data, error } = await sbPub
    .from('snippets')
    .select('id,created_at,author,title,description,language,tags,code,likes,views')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[GET /snippets]', error.message);
    return err(res, 500, error.message);
  }
  res.setHeader('Cache-Control', 'public, max-age=5, stale-while-revalidate=30');
  return res.json(data ?? []);
});

// ─────────────────────────────────────────── POST /api/snippets (like / view)
api.post('/snippets', rateLimit(60, 60_000), async (req, res) => {
  const { action, id } = req.body;
  if (!id)     return err(res, 400, 'id diperlukan');
  if (!action) return err(res, 400, 'action diperlukan');

  if (action === 'view') {
    const { data, error } = await sbSvc.from('snippets').select('views').eq('id', id).single();
    if (error || !data) return err(res, 404, 'Snippet tidak ditemukan');
    const v = (data.views || 0) + 1;
    await sbSvc.from('snippets').update({ views: v }).eq('id', id);
    return res.json({ views: v });
  }

  if (action === 'like' || action === 'unlike') {
    const { data, error } = await sbSvc.from('snippets').select('likes').eq('id', id).single();
    if (error || !data) return err(res, 404, 'Snippet tidak ditemukan');
    const l = Math.max(0, (data.likes || 0) + (action === 'like' ? 1 : -1));
    await sbSvc.from('snippets').update({ likes: l }).eq('id', id);
    return res.json({ likes: l });
  }

  return err(res, 400, `Action tidak dikenal: ${action}`);
});

// ─────────────────────────────────────────── POST /api/snippet-create
/** Strip HTML tags dari string — anti XSS stored */
function strip(str) {
  return String(str || '').replace(/<[^>]*>/g, '').trim();
}

/** Validasi panjang field */
function maxLen(str, max) {
  return typeof str === 'string' && str.length <= max;
}

api.post('/snippet-create', rateLimit(10, 60_000), async (req, res) => {
  const { author, title, description, language, tags, code, snippetKey } = req.body;

  // Validasi + sanitasi
  const errors = {};
  if (!author?.trim())                        errors.author      = 'Wajib diisi';
  else if (!maxLen(author, 50))               errors.author      = 'Maksimal 50 karakter';
  if (!title?.trim())                         errors.title       = 'Wajib diisi';
  else if (!maxLen(title, 120))               errors.title       = 'Maksimal 120 karakter';
  if (!description?.trim())                   errors.description = 'Wajib diisi';
  else if (!maxLen(description, 500))         errors.description = 'Maksimal 500 karakter';
  if (!code?.trim())                          errors.code        = 'Wajib diisi';
  else if (!maxLen(code, 50000))              errors.code        = 'Kode terlalu panjang (max 50000 char)';
  const k = snippetKey?.trim() || '';
  if (!k || k.length < 3 || k.length > 7)    errors.snippetKey  = 'Key harus 3–7 karakter';
  if (Object.keys(errors).length) return res.status(400).json({ errors });

  const tagsArr = Array.isArray(tags)
    ? tags.map(t => String(t).trim()).filter(Boolean)
    : String(tags || '').split(',').map(t => t.trim()).filter(Boolean);

  // Sanitasi — strip HTML dari semua field teks (cegah XSS stored)
  const VALID_LANGS = ['JavaScript','TypeScript','Python','PHP','Go'];
  const safeLang = VALID_LANGS.includes(language) ? language : 'JavaScript';

  const { error } = await sbSvc.from('snippets').insert([{
    author:           strip(author).substring(0, 50),
    title:            strip(title).substring(0, 120),
    description:      strip(description).substring(0, 500),
    language:         safeLang,
    tags:             tagsArr.slice(0, 10).map(t => strip(t).substring(0, 30)),
    code:             code.substring(0, 50000),  // code boleh ada HTML (snippet)
    snippet_key_hash: await hashKey(k),
    likes: 0,
    views: 0,
  }]);

  if (error) { console.error('[snippet-create]', error.message); return err(res, 500, error.message); }
  return res.status(201).json({ ok: true });
});

// ─────────────────────────────────────────── PUT /api/snippet-action (edit)
api.put('/snippet-action', rateLimit(15, 60_000), async (req, res) => {
  const { id, snippetKey, title, language, description, tags, code } = req.body;
  if (!id) return err(res, 400, 'id diperlukan');

  const admin = await verifyAdmin(req);

  if (!admin) {
    if (!snippetKey) return err(res, 403, 'Snippet key diperlukan');
    const { data, error } = await sbSvc.from('snippets').select('snippet_key_hash').eq('id', id).single();
    if (error || !data) return err(res, 404, 'Snippet tidak ditemukan');
    if (await hashKey(snippetKey) !== data.snippet_key_hash) {
      await new Promise(r => setTimeout(r, 150 + Math.random() * 200));
      return err(res, 403, 'Key salah!');
    }
  }

  const tagsArr = Array.isArray(tags)
    ? tags.map(t => String(t).trim()).filter(Boolean)
    : String(tags || '').split(',').map(t => t.trim()).filter(Boolean);

  const upd = {};
  if (title       !== undefined) upd.title       = title;
  if (language    !== undefined) upd.language    = language;
  if (description !== undefined) upd.description = description;
  if (tags        !== undefined) upd.tags        = tagsArr;
  if (code        !== undefined) upd.code        = code;

  if (!Object.keys(upd).length) return err(res, 400, 'Tidak ada perubahan');

  const { error } = await sbSvc.from('snippets').update(upd).eq('id', id);
  if (error) { console.error('[PUT snippet-action]', error.message); return err(res, 500, error.message); }
  return res.json({ ok: true });
});

// ─────────────────────────────────────────── DELETE /api/snippet-action (hapus)
api.delete('/snippet-action', rateLimit(10, 60_000), async (req, res) => {
  const { id, snippetKey } = req.body;
  if (!id) return err(res, 400, 'id diperlukan');

  const admin = await verifyAdmin(req);

  if (!admin) {
    if (!snippetKey) return err(res, 403, 'Snippet key diperlukan');
    const { data, error } = await sbSvc.from('snippets').select('snippet_key_hash').eq('id', id).single();
    if (error || !data) return err(res, 404, 'Snippet tidak ditemukan');
    if (await hashKey(snippetKey) !== data.snippet_key_hash) {
      await new Promise(r => setTimeout(r, 150 + Math.random() * 200));
      return err(res, 403, 'Key salah!');
    }
  }

  const { error } = await sbSvc.from('snippets').delete().eq('id', id);
  if (error) { console.error('[DELETE snippet-action]', error.message); return err(res, 500, error.message); }
  return res.json({ ok: true });
});

// ─────────────────────────────────────────── POST /api/admin-login
api.post('/admin-login', rateLimit(3, 5 * 60_000), async (req, res) => {  // max 3 percobaan per 5 menit
  const { username, password } = req.body;
  if (!username || !password) return err(res, 400, 'Username & password wajib diisi');

  const ADM_USER = process.env.ADMIN_USERNAME;
  const ADM_HASH = process.env.ADMIN_PASSWORD_HASH;

  try {
    const hexPwd = await hashPwd(password);
    if (username !== ADM_USER || hexPwd !== ADM_HASH) {
      await new Promise(r => setTimeout(r, 150 + Math.random() * 200));
      return err(res, 401, 'Username atau password salah');
    }

    const token = await makeJWT({ role: 'admin' });

    res.cookie('mzx_token', token, {
      httpOnly: true,
      secure:   isProd,
      sameSite: 'lax',
      maxAge:   8 * 60 * 60 * 1000, // 8 jam
      path:     '/',
    });
    return res.json({ ok: true });

  } catch (e) {
    console.error('[admin-login]', e);
    return err(res, 500, 'Internal server error');
  }
});

// ─────────────────────────────────────────── GET /api/admin-verify
api.get('/admin-verify', async (req, res) => {
  const ok = await verifyAdmin(req);
  return res.json({ admin: ok });
});

// ─────────────────────────────────────────── POST /api/admin-logout
api.post('/admin-logout', (req, res) => {
  res.clearCookie('mzx_token', { path: '/' });
  return res.json({ ok: true });
});

// ─────────────────────────────────────────── GET /api/health  (cek server)
api.get('/health', (req, res) => {
  return res.json({
    status:  'ok',
    app:     'ManzxyCodes',
    version: '1.0.0',
    env:     NODE_ENV,
    uptime:  Math.floor(process.uptime()) + 's',
    ts:      new Date().toISOString(),
  });
});

// Mount semua /api/*
app.use('/api', api);

// ═══════════════════════════════════════════ STATIC FILES
// Serve index.html, info.html, dll dari folder yang sama dengan manzxy.js
const STATIC_DIR = __dirname;

app.use(express.static(STATIC_DIR, {
  index:    false,        // jangan auto-serve index.html, biar kita yang handle
  maxAge:   isProd ? '1d' : 0,
  etag:     true,
  dotfiles: 'ignore',
}));

// ── /info → info.html
app.get('/info', (req, res) => {
  res.sendFile(join(STATIC_DIR, 'info.html'));
});

// ── Semua route lain → index.html (SPA fallback)
app.get('*', (req, res) => {
  res.sendFile(join(STATIC_DIR, 'index.html'));
});

// ═══════════════════════════════════════════ ERROR HANDLER
app.use((err, req, res, next) => {
  console.error('[UNHANDLED]', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ═══════════════════════════════════════════ START SERVER
app.listen(PORT, '0.0.0.0', () => {
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║         ManzxyCodes — manzxy.js          ║');
  console.log('║         © 2026 By Manzxy                 ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log(`\n🚀  Server running at http://0.0.0.0:${PORT}`);
  console.log(`🌍  Mode       : ${NODE_ENV}`);
  console.log(`🗄️   Supabase   : ${process.env.SUPABASE_URL}`);
  if (DOMAIN !== '*') console.log(`🔗  Domain     : ${DOMAIN}`);
  console.log('\n📡  API Routes :');
  console.log('    GET    /api/snippets');
  console.log('    POST   /api/snippets       (like/view)');
  console.log('    POST   /api/snippet-create');
  console.log('    PUT    /api/snippet-action  (edit)');
  console.log('    DELETE /api/snippet-action  (hapus)');
  console.log('    POST   /api/admin-login');
  console.log('    GET    /api/admin-verify');
  console.log('    POST   /api/admin-logout');
  console.log('    GET    /api/health');
  console.log('\n📂  Static     : ' + STATIC_DIR);
  console.log('━'.repeat(44) + '\n');
});

// Graceful shutdown
process.on('SIGTERM', () => { console.log('\n[SIGTERM] Shutting down…'); process.exit(0); });
process.on('SIGINT',  () => { console.log('\n[SIGINT]  Shutting down…'); process.exit(0); });

// Cegah crash dari unhandled promise rejection
process.on('unhandledRejection', (reason, promise) => {
  console.error('[unhandledRejection]', reason);
});
process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err);
  // Jangan exit — biarkan PM2 yang restart jika perlu
});
