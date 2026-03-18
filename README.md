<div align="center">

```
╔══════════════════════════════════════════════╗
║           ✦  ManzxyCodes  ✦                  ║
║     Platform Snippet Code Indonesia          ║
║           © 2026 By Manzxy                   ║
╚══════════════════════════════════════════════╝
```

**Platform snippet code open untuk developer Indonesia.**  
Simpan, share, dan temukan kode siap pakai — gratis selamanya.

[![Live](https://img.shields.io/badge/🌐_Live-manzxy.biz.id-00d4ff?style=for-the-badge)](https://manzxy.biz.id)
[![App](https://img.shields.io/badge/📦_App-manzxy.biz.id/app-7c6dfa?style=for-the-badge)](https://manzxy.biz.id/app)
[![Node](https://img.shields.io/badge/Node.js-≥18-339933?style=for-the-badge&logo=nodedotjs)](https://nodejs.org)
[![Supabase](https://img.shields.io/badge/Supabase-Database-3ECF8E?style=for-the-badge&logo=supabase)](https://supabase.com)
[![License](https://img.shields.io/badge/License-Private-ff6b9d?style=for-the-badge)](#)

</div>

---

## 📋 Daftar Isi

- [Tentang Proyek](#-tentang-proyek)
- [Tech Stack](#-tech-stack)
- [Struktur File](#-struktur-file)
- [Fitur](#-fitur)
- [API Reference](#-api-reference)
- [Setup Lokal](#-setup-lokal)
- [Deploy VPS](#-deploy-vps)
- [Deploy Vercel](#-deploy-vercel)
- [Environment Variables](#-environment-variables)
- [Database Schema](#-database-schema)
- [Keamanan](#-keamanan)
- [Kontak](#-kontak)

---

## 🚀 Tentang Proyek

**ManzxyCodes** adalah platform snippet code ringan dan cepat yang dirancang khusus untuk developer Indonesia. Tidak perlu akun, tidak ada iklan — cukup upload kode, simpan key-mu, dan share ke siapapun.

```
manzxy.biz.id        →  Landing page + Docs API
manzxy.biz.id/app    →  Snippet explorer & editor
manzxy.biz.id/info   →  Info, kontak owner, API reference
manzxy.biz.id/api/*  →  REST API endpoints
```

---

## 🛠 Tech Stack

| Layer | Teknologi |
|-------|-----------|
| **Frontend** | Vanilla HTML/CSS/JS · Space Grotesk · JetBrains Mono · highlight.js |
| **Backend (VPS)** | Node.js 18+ · Express.js · `manzxy.js` (single file) |
| **Backend (Serverless)** | Vercel Serverless Functions (`/api/*.js`) |
| **Database** | Supabase (PostgreSQL) |
| **Auth** | JWT via `jose` · HttpOnly Cookie (`mzx_token`) |
| **Hashing** | SHA-256 + salt (Web Crypto API bawaan Node) |
| **Process Manager** | PM2 |
| **Reverse Proxy** | Nginx + SSL (Let's Encrypt) |
| **Deployment** | VPS atau Vercel |

---

## 📁 Struktur File

```
ManzxyCodes/
├── 📄 index.html            ← Snippet App  →  /app
├── 📄 info.html             ← Landing Page  →  /  dan /info
│
├── ⚙️  manzxy.js            ← Express server (VPS) — semua route dalam 1 file
├── 📦 package.json          ← type:module, dependencies
├── 🔒 .env.example          ← Template environment variables
├── 🚫 .gitignore
│
├── 🗄️  schema.sql           ← Supabase table + RLS + indexes
│
├── 🌐 nginx.conf            ← Nginx reverse proxy + SSL config
├── ⚡ ecosystem.config.cjs  ← PM2 config
├── 🚀 vercel.json           ← Vercel routing config
│
├── 📚 SETUP.md              ← Panduan deploy Vercel
├── 📚 SETUP-VPS.md          ← Panduan deploy VPS
│
└── 📂 api/                  ← Vercel Serverless Functions
    ├── snippets.js          ← GET all + POST like/view
    ├── snippet-create.js    ← POST upload snippet baru
    ├── snippet-action.js    ← PUT edit + DELETE hapus
    ├── admin-login.js       ← POST login → JWT cookie
    ├── admin-verify.js      ← GET cek session
    └── admin-logout.js      ← POST logout
```

---

## ✨ Fitur

### 👤 User (Tanpa Login)
- 📦 Browse semua snippet dengan filter bahasa & search real-time
- 💻 Syntax highlighting untuk 5 bahasa (JS, TS, Python, PHP, Go)
- ❤️ Like / unlike snippet (rate limit: 1x per 5 menit per IP)
- 👁️ View counter otomatis (rate limit: 1x per 10 menit per IP)
- ▶️ **Run JavaScript** langsung di browser — sandboxed iframe, support `async/await`
- 📋 **Raw view** — buka kode sebagai plain text di tab baru
- ⛶ **Fullscreen code viewer** — kode penuh layar dengan syntax highlight
- 🔗 Share URL per snippet (`/app?id=123`)
- ✦ Upload snippet baru dengan `snippetKey` pribadi
- ✏️ Edit / hapus snippet menggunakan `snippetKey`

### ⚡ Admin
- 🔐 Login dengan username + password (hashed SHA-256 + salt)
- 🍪 Session via JWT HttpOnly cookie (berlaku 8 jam)
- 🗑️ Edit / hapus snippet tanpa `snippetKey`
- ⚙️ Rate limit ketat: 3 percobaan login per 5 menit

### 🌐 Info Page
- 📊 Live stats (total snippets, likes, views) dari database
- 🟢 **Status database live** — cek koneksi Supabase realtime
- 📚 Dokumentasi API lengkap (4 tab: Snippets, Admin Auth, Scraper, Error Codes)
- 👤 Kontak owner (WA, Telegram, Gmail)

---

## 📡 API Reference

**Base URL:** `https://manzxy.biz.id/api`

### Snippets

| Method | Endpoint | Deskripsi | Auth |
|--------|----------|-----------|------|
| `GET` | `/api/snippets` | Ambil semua snippet | ❌ Public |
| `POST` | `/api/snippets` | Like / View counter | ❌ Public |
| `POST` | `/api/snippet-create` | Upload snippet baru | ❌ Public |
| `PUT` | `/api/snippet-action` | Edit snippet | 🔑 Key / Admin |
| `DELETE` | `/api/snippet-action` | Hapus snippet | 🔑 Key / Admin |

### Admin

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| `POST` | `/api/admin-login` | Login → set `mzx_token` cookie |
| `GET` | `/api/admin-verify` | Cek session aktif |
| `POST` | `/api/admin-logout` | Logout → clear cookie |
| `GET` | `/api/health` | Status server |

### Contoh Request

```bash
# Ambil semua snippet
curl https://manzxy.biz.id/api/snippets

# Upload snippet baru
curl -X POST https://manzxy.biz.id/api/snippet-create \
  -H 'Content-Type: application/json' \
  -d '{
    "author": "manzxy",
    "title": "Fetch Retry",
    "description": "Auto-retry dengan exponential backoff",
    "language": "JavaScript",
    "tags": "fetch, async, utility",
    "code": "async function fetchRetry(url, n=3) {...}",
    "snippetKey": "abc12"
  }'

# Like snippet
curl -X POST https://manzxy.biz.id/api/snippets \
  -H 'Content-Type: application/json' \
  -d '{"action": "like", "id": 1}'

# Hapus snippet dengan key
curl -X DELETE https://manzxy.biz.id/api/snippet-action \
  -H 'Content-Type: application/json' \
  -d '{"id": 1, "snippetKey": "abc12"}'
```

### Rate Limits

| Endpoint | Limit |
|----------|-------|
| POST `/snippet-create` | 10 request/menit/IP |
| PUT `/snippet-action` | 15 request/menit/IP |
| DELETE `/snippet-action` | 10 request/menit/IP |
| POST `/api/snippets` (like) | 1x per 5 menit/IP/snippet |
| POST `/api/snippets` (view) | 1x per 10 menit/IP/snippet |
| POST `/admin-login` | 3 percobaan per 5 menit/IP |

---

## 💻 Setup Lokal

### Prerequisites

- Node.js ≥ 18
- Akun [Supabase](https://supabase.com) (gratis)
- Git

### 1. Clone & Install

```bash
git clone https://github.com/manzxy/ManzxyCodes.git
cd ManzxyCodes
npm install
```

### 2. Setup Database

Buka **Supabase Dashboard → SQL Editor**, jalankan isi `schema.sql`:

```sql
create table if not exists snippets (
  id               bigserial    primary key,
  created_at       timestamptz  default now() not null,
  author           text         not null,
  title            text         not null,
  description      text         default '',
  language         text         not null default 'JavaScript',
  tags             text[]       default '{}',
  code             text         not null,
  snippet_key_hash text         not null,
  likes            integer      default 0 not null,
  views            integer      default 0 not null
);
```

### 3. Buat File `.env`

```bash
cp .env.example .env
```

Edit `.env` dengan value kamu (lihat [Environment Variables](#-environment-variables)).

### 4. Generate Password Hash

Buka browser console atau Node.js REPL:

```js
const salt = 'salt_kamu_di_sini';
const password = 'password_kamu';
const buf = await crypto.subtle.digest(
  'SHA-256',
  new TextEncoder().encode(password + salt)
);
console.log(Array.from(new Uint8Array(buf))
  .map(b => b.toString(16).padStart(2,'0')).join(''));
// Copy hasilnya → ADMIN_PASSWORD_HASH di .env
```

### 5. Jalankan

```bash
# Development (auto-restart on file change)
npm run dev

# Production
npm start
```

Buka `http://localhost:3000`

---

## 🖥️ Deploy VPS

### Requirements

- Ubuntu 20.04+ / Debian 11+
- Node.js 18+
- Nginx
- PM2
- Domain + SSL (Let's Encrypt)

### Langkah Deploy

```bash
# 1. Clone ke server
git clone https://github.com/manzxy/ManzxyCodes.git /var/www/manzxycodes
cd /var/www/manzxycodes
npm install --production

# 2. Buat .env
cp .env.example .env
nano .env   # isi semua value

# 3. Jalankan dengan PM2
pm2 start manzxy.js --name manzxycodes
pm2 save
pm2 startup   # biar auto-start saat reboot

# 4. Setup Nginx
sudo cp nginx.conf /etc/nginx/sites-available/manzxycodes
sudo ln -s /etc/nginx/sites-available/manzxycodes /etc/nginx/sites-enabled/
sudo nginx -t   # test config
sudo systemctl reload nginx

# 5. SSL dengan Certbot
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d manzxy.biz.id -d www.manzxy.biz.id
```

### Perintah PM2 Berguna

```bash
pm2 status                  # cek status semua proses
pm2 logs manzxycodes        # lihat logs real-time
pm2 reload manzxycodes      # reload tanpa downtime
pm2 restart manzxycodes     # restart
pm2 stop manzxycodes        # stop
pm2 delete manzxycodes      # hapus dari PM2
```

### Update Deployment

```bash
cd /var/www/manzxycodes
git pull origin main
pm2 reload manzxycodes
```

---

## ☁️ Deploy Vercel

> Deploy gratis tanpa server! Tapi butuh akun Vercel.

### Langkah

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Login
vercel login

# 3. Deploy
vercel --prod
```

### Environment Variables di Vercel

Buka **Vercel Dashboard → Project → Settings → Environment Variables**, tambahkan semua variable dari `.env.example`.

### Routing

`vercel.json` sudah dikonfigurasi:

```
GET  /           →  info.html  (landing)
GET  /info       →  info.html
GET  /app        →  index.html (snippet app)
GET  /api/*      →  /api/*.js  (serverless functions)
GET  /info.html  →  301 redirect ke /info
GET  /index.html →  301 redirect ke /app
```

---

## 🔑 Environment Variables

Buat file `.env` di root folder. Lihat `.env.example` untuk template lengkap.

| Variable | Wajib | Keterangan |
|----------|-------|-----------|
| `PORT` | ❌ | Port server (default: `3000`) |
| `NODE_ENV` | ❌ | `production` atau `development` |
| `SUPABASE_URL` | ✅ | URL project Supabase |
| `SUPABASE_ANON_KEY` | ✅ | Anon/public key Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Service role key (bypass RLS) |
| `ADMIN_USERNAME` | ✅ | Username login admin |
| `ADMIN_PASSWORD_HASH` | ✅ | SHA-256 hex hash dari password + salt |
| `PASSWORD_SALT` | ✅ | Salt untuk hash password (min 16 char) |
| `JWT_SECRET` | ✅ | Secret untuk signing JWT (min 32 char) |
| `KEY_SALT` | ❌ | Salt untuk hash snippet key |
| `DOMAIN` | ❌ | Domain lengkap (`https://manzxy.biz.id`) |

### Contoh `.env`

```env
PORT=3000
NODE_ENV=production
DOMAIN=https://manzxy.biz.id

# Supabase
SUPABASE_URL=https://abcdefghij.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Admin
ADMIN_USERNAME=manzxy
ADMIN_PASSWORD_HASH=a1b2c3d4e5f6...  # hasil sha256(password + salt)
PASSWORD_SALT=random_salt_min_16_char

# JWT
JWT_SECRET=random_secret_minimum_32_characters_long

# Snippet Key
KEY_SALT=another_random_salt_for_snippet_keys
```

---

## 🗄️ Database Schema

Satu tabel: `snippets` di Supabase (PostgreSQL).

```sql
create table snippets (
  id               bigserial    primary key,        -- Auto-increment ID
  created_at       timestamptz  default now(),      -- Timestamp upload
  author           text         not null,            -- Nama penulis (max 50 char)
  title            text         not null,            -- Judul snippet (max 120 char)
  description      text         default '',          -- Deskripsi (max 500 char)
  language         text         default 'JavaScript',-- Bahasa pemrograman
  tags             text[]       default '{}',        -- Array tags
  code             text         not null,            -- Isi kode (max 50.000 char)
  snippet_key_hash text         not null,            -- SHA-256 hash dari snippetKey
  likes            integer      default 0,           -- Jumlah likes
  views            integer      default 0            -- Jumlah views
);

-- Indexes untuk performa query
create index idx_lang on snippets(language);
create index idx_date on snippets(created_at desc);
```

**RLS (Row Level Security):**
- Semua orang bisa `SELECT` (baca publik)
- `INSERT`, `UPDATE`, `DELETE` hanya via `service_role` key dari server Node.js

---

## 🔒 Keamanan

### Password & Key Hashing
```
password  +  PASSWORD_SALT  →  SHA-256  →  hex string
snippetKey  +  KEY_SALT    →  SHA-256  →  disimpan di DB
```
Password asli dan snippet key **tidak pernah disimpan** — hanya hash-nya.

### JWT Session
- Algoritma: `HS256`
- Payload: `{ role: 'admin' }`
- Expire: 8 jam
- Disimpan sebagai `HttpOnly`, `SameSite=Lax` cookie — tidak bisa diakses JavaScript browser

### Rate Limiting
- Anti brute-force login: **3 percobaan / 5 menit / IP**
- Delay acak 150–350ms saat login gagal
- IP deduplication untuk like & view

### Security Headers (via Nginx)
```
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

### Input Validation
- HTML tag stripping di semua input
- Whitelist bahasa: `JavaScript | TypeScript | Python | PHP | Go`
- Max body: 100kb JSON, 50kb form

### Run JS Sandbox
- JavaScript snippet dieksekusi di **sandboxed iframe**
- `sandbox="allow-scripts"` — tidak bisa akses DOM halaman utama, tidak bisa network request
- Timeout 10 detik otomatis

---

## 📊 Arsitektur

```
Browser
  │
  │  HTTPS
  ▼
Nginx (port 443)
  │
  │  Reverse Proxy (port 3000)
  ▼
Node.js Express — manzxy.js
  │
  ├── GET /              → info.html
  ├── GET /app           → index.html
  ├── GET /info          → info.html
  │
  └── /api/*
       ├── GET    /snippets          → Supabase (anon key)
       ├── POST   /snippets          → Supabase (service key) + IP dedup
       ├── POST   /snippet-create    → Supabase (service key) + hash key
       ├── PUT    /snippet-action    → Supabase (service key) + verify key/JWT
       ├── DELETE /snippet-action    → Supabase (service key) + verify key/JWT
       ├── POST   /admin-login       → SHA-256 compare + sign JWT
       ├── GET    /admin-verify      → verify JWT cookie
       ├── POST   /admin-logout      → clear cookie
       └── GET    /health            → status object
              │
              ▼
         Supabase (PostgreSQL)
         Table: snippets
```

---

## 🐛 Troubleshooting

### Server tidak mau start
```bash
# Cek missing env vars
node manzxy.js
# Akan tampil: "❌ ENV VARS MISSING: SUPABASE_URL, ..."
```

### PM2 crash terus
```bash
pm2 logs manzxycodes --lines 50
# Cek error di log
```

### Snippet tidak muncul (API error)
```bash
# Cek health endpoint
curl https://manzxy.biz.id/api/health

# Cek koneksi Supabase
curl https://manzxy.biz.id/api/snippets
```

### SSL expired
```bash
sudo certbot renew
sudo systemctl reload nginx
```

### File lama masih di-serve (cache issue)
```bash
# Verify file terbaru sudah di server
grep "_DUMMY" /var/www/manzxycodes/index.html

# Hard reload di browser
Ctrl + Shift + R  (atau Cmd + Shift + R di Mac)
```

---

## 📞 Kontak

> Ada bug? Request fitur? Mau kolaborasi?

| Platform | Kontak |
|----------|--------|
| 📱 WhatsApp | [+62 85x-xxxx-xxxx](https://wa.me/6285xxxxxxxx) |
| ✈️ Telegram | [@manzxy](https://t.me/manzxy) |
| 📧 Gmail | [manzxy@gmail.com](mailto:manzxy@gmail.com) |
| 🌐 Website | [manzxy.biz.id](https://manzxy.biz.id) |

---

<div align="center">

Made with ❤️ by **Manzxy**

```
✦ ManzxyCodes — Gratis selamanya ✦
```

[![Live Site](https://img.shields.io/badge/🌐_Buka_App-manzxy.biz.id/app-7c6dfa?style=for-the-badge)](https://manzxy.biz.id/app)

</div>
