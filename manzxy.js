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
 *   DOMAIN=https://manzxycodes.com   (optional, untuk CORS)
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
import { readFileSync }     from 'fs';

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

// ── Body parser — JSON
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Cookie parser
app.use(cookieParser());

// ── CORS — izinkan dari domain sendiri atau semua (dev mode)
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowed = DOMAIN === '*' ? '*' : DOMAIN;
  res.setHeader('Access-Control-Allow-Origin', allowed);
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') return res.status(200).end();
  next();
});

// ── Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  if (isProd) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
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
api.post('/snippet-create', rateLimit(10, 60_000), async (req, res) => {
  const { author, title, description, language, tags, code, snippetKey } = req.body;

  // Validasi
  const errors = {};
  if (!author?.trim())      errors.author      = 'Wajib diisi';
  if (!title?.trim())       errors.title       = 'Wajib diisi';
  if (!description?.trim()) errors.description = 'Wajib diisi';
  if (!code?.trim())        errors.code        = 'Wajib diisi';
  const k = snippetKey?.trim() || '';
  if (!k || k.length < 3 || k.length > 7) errors.snippetKey = 'Key harus 3–7 karakter';
  if (Object.keys(errors).length) return res.status(400).json({ errors });

  const tagsArr = Array.isArray(tags)
    ? tags.map(t => String(t).trim()).filter(Boolean)
    : String(tags || '').split(',').map(t => t.trim()).filter(Boolean);

  const { error } = await sbSvc.from('snippets').insert([{
    author:           author.trim(),
    title:            title.trim(),
    description:      description.trim(),
    language:         language || 'JavaScript',
    tags:             tagsArr,
    code,
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
api.post('/admin-login', rateLimit(5, 60_000), async (req, res) => {
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
