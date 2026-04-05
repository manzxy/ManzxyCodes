# ManzxyCodes

Platform snippet code open untuk developer Indonesia. Simpan, share, dan temukan kode siap pakai — gratis selamanya.

**Live:** https://manzxy-codes.vercel.app

---

## Stack

| Layer | Tech |
|-------|------|
| Frontend | Vanilla HTML/CSS/JS (no framework) |
| Backend | Vercel Serverless Functions (Node.js ESM) |
| Database | Supabase (PostgreSQL) |
| Auth | JWT HttpOnly cookie (jose) |
| Highlighting | highlight.js (tokyo-night-dark) |
| Fonts | Inter + JetBrains Mono |

---

## Struktur File

```
ManzxyCodes/
├── _app.html          # Main app page (/app)
├── _info.html         # Landing/info page (/)
├── app.css            # App styles
├── app.js             # App logic (fetch, render, modal, search)
├── info.css           # Landing styles
├── info.js            # Landing logic (stats, tabs, smooth scroll)
├── vercel.json        # Routing config
├── schema.sql         # Supabase schema + RPC functions
├── package.json
└── api/
    ├── snippets.js          # GET list / POST like+view
    ├── snippet-create.js    # POST upload snippet baru
    ├── snippet-action.js    # PUT edit / DELETE hapus
    ├── snippet-get.js       # GET single snippet (deprecated, pakai [id].js)
    ├── admin-login.js       # POST login admin → set JWT cookie
    ├── admin-logout.js      # POST logout → clear cookie
    ├── admin-verify.js      # GET cek JWT cookie valid
    └── snippet/
        ├── [id].js          # GET /api/snippet/:hash → detail + code
        └── [id]/
            └── raw.js       # GET /api/snippet/:hash/raw → plain text
```

---

## Env Variables

Buat file `.env.local` (local) atau set di Vercel Dashboard:

```env
# Supabase
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Auth
JWT_SECRET=random-string-min-32-chars
KEY_SALT=random-salt-for-snippet-keys

# Admin
ADMIN_USERNAME=manzxy
ADMIN_PASSWORD_HASH=sha256-hex-of-password+salt
PASSWORD_SALT=random-salt-for-admin-password
```

### Generate ADMIN_PASSWORD_HASH

```js
// node -e "..."
const salt = 'isi_PASSWORD_SALT_kamu';
const pass = 'password_kamu';
const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pass + salt));
console.log(Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join(''));
```

---

## Setup Supabase

Jalankan `schema.sql` di **Supabase Dashboard → SQL Editor**:

```sql
-- Tabel sudah include:
-- snippets table + RLS
-- increment_views / increment_likes / decrement_likes (atomic RPC)
-- Index untuk performa query
```

---

## Deploy ke Vercel

```bash
npm i -g vercel
vercel --prod
```

Atau push ke GitHub lalu connect ke Vercel Dashboard.

---

## API Reference

Base URL: `https://manzxy-codes.vercel.app/api`

### GET /api/snippets
List semua snippet (tanpa field `code`). Cache 15s server-side.

```bash
curl https://manzxy-codes.vercel.app/api/snippets
```

### POST /api/snippets
Like/unlike/view counter.

```json
{ "action": "like", "id": 1 }
// action: "like" | "unlike" | "view"
```

Rate limit: view = 1x per 10 menit per IP per snippet. Like = 1x per 5 menit.

### GET /api/snippet/:hash
Detail snippet termasuk field `code`. `:hash` = 8-char hex encoded ID.

```bash
curl https://manzxy-codes.vercel.app/api/snippet/a3f8c1d2
```

### GET /api/snippet/:hash/raw
Raw code sebagai `text/plain`. Cocok untuk `curl | sh`.

```bash
curl https://manzxy-codes.vercel.app/api/snippet/a3f8c1d2/raw
```

### POST /api/snippet-create
Upload snippet baru.

```json
{
  "author": "manzxy",
  "title": "Fetch Retry",
  "description": "Auto-retry dengan exponential backoff",
  "language": "JavaScript",
  "tags": "fetch, async, retry",
  "code": "async function fetchRetry...",
  "snippetKey": "mykey"
}
```

`snippetKey` (3–7 char) = password snippet untuk edit/hapus. **Simpan baik-baik, tidak bisa dipulihkan.**

Rate limit: 3 upload per 10 menit per IP.

### PUT /api/snippet-action
Edit snippet. Butuh `snippetKey` atau admin cookie.

### DELETE /api/snippet-action
Hapus snippet. Butuh `snippetKey` atau admin cookie.

---

## Bug Fixes (Changelog)

### v2.3 (current)
- **FIXED:** Splash screen stuck — tambah hard timeout 6 detik + `done` guard
- **FIXED:** `app.js` tidak di-include di `_app.html` (loading muter terus)
- **FIXED:** `localStorage` crash di private mode/storage full — wrapped try/catch
- **FIXED:** `decodeId()` return null-safe (tidak crash saat snippet tidak ditemukan)
- **FIXED:** ID type coercion bug — `r.id` bisa string atau number dari DB
- **FIXED:** `render()` dipanggil sebelum `rows` populated di URL param case
- **FIXED:** `like` view counter race condition — pakai atomic RPC Supabase
- **FIXED:** Rate limiting view/like tidak ada di API — tambah in-memory cooldown
- **FIXED:** Escape key menutup semua modal sekaligus — sekarang hanya topmost
- **FIXED:** `copyCode()` tidak handle kode belum dimuat
- **FIXED:** Edit modal buka dengan kode kosong kalau snippet belum pernah dibuka
- **FIXED:** `openRaw()` pakai `noopener` untuk keamanan
- **FIXED:** `esc()` function tidak escape double-quote — XSS vector di attribute
- **FIXED:** Cache key diubah ke `mzx_v2` untuk hindari stale data dari versi lama
- **FIXED:** `updateCounts()` crash untuk `C++`, `C#`, `F#` — ID mapping khusus
- **FIXED:** `LANG_EXT` diperluas (Rust, C, C++, Java, dll)
- **FIXED:** `LANG_HL` tambah Bash, XML, TOML mapping
- **FIXED:** Double-page bug di `_app.html` (dari versi lama)
- **FIXED:** Double language section di drawer (dari versi lama)
- **FIXED:** `openRaw()` pakai blob URL — sekarang buka endpoint `/raw` asli

### v2.2
- Tambah splash loading screen dengan progress bar + fallback timeout
- Redesign UI: Inter font, dark theme konsisten

### v2.1
- Tambah `/api/snippet/:hash/raw` endpoint
- Fix drawer duplicate lang section
- Responsive layout perbaikan

### v2.0
- Full redesign CSS/HTML
- Pixel art theme → clean dark theme
- Fix double page bug

---

## Local Development

```bash
# Install deps
npm install

# Run dengan Vercel CLI (baca env dari .env.local)
npx vercel dev
```

Akses di `http://localhost:3000`.

---

## License

MIT — bebas pakai, modifikasi, deploy sendiri. Credit appreciated.

**by Manzxy** · [Telegram](https://t.me/manzxy)
