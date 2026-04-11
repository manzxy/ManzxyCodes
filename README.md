# ManzxyCodes

Platform snippet code open untuk developer Indonesia. Simpan, share, temukan kode siap pakai — gratis selamanya.

**Live:** https://manzxy-codes.vercel.app · https://manzxy.biz.id

---

## Stack

| Layer | Tech |
|-------|------|
| Frontend | Vanilla HTML/CSS/JS |
| Backend | Vercel Serverless (Node.js 18+ ESM) |
| Database | Supabase (PostgreSQL + RLS) |
| Auth | JWT HttpOnly cookie (`jose`) |
| Highlighting | highlight.js `tokyo-night-dark` |
| Fonts | Inter + JetBrains Mono |

---

## Struktur Project

```
ManzxyCodes/
│
├── api/                        ← Vercel Serverless endpoints
│   ├── snippets.js             GET list / POST like+view
│   ├── snippet-create.js       POST upload snippet baru
│   ├── snippet-action.js       PUT edit / DELETE hapus
│   ├── snippet/[id].js         GET detail + code field
│   ├── raw/[id].js             GET /raw/:hash raw text / download
│   ├── admin-login.js          POST → set JWT cookie
│   ├── admin-logout.js         POST → clear cookie
│   └── admin-verify.js         GET → check JWT
│
├── src/lib/                    ← Shared libs (diimport semua api/)
│   ├── db.js                   Supabase singleton (pub + svc)
│   ├── hashId.js               encodeId / hashToNumeric / parseId
│   ├── langMeta.js             file extension + safe filename
│   └── apiHelpers.js           setCORS / handleOptions / parseBody / getIP
│
├── _app.html                   App UI (/app)
├── app.js                      Logic: fetch, render, modal, search
├── app.css                     App styles
│
├── _info.html                  Landing + API docs (/)
├── info.js                     Landing: stats, tabs, scroll
├── info.css                    Landing styles
│
├── vercel.json                 Routing rewrites + headers
├── package.json
├── schema.sql                  Supabase schema + RPC functions
└── manzxy.js / nginx.conf      VPS setup (opsional)
```

---

## Setup

### Env Variables

```env
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
JWT_SECRET=random-min-32-chars
KEY_SALT=salt-untuk-snippet-key
ADMIN_USERNAME=manzxy
ADMIN_PASSWORD_HASH=sha256-hex
PASSWORD_SALT=salt-untuk-admin-pass
```

**Generate ADMIN_PASSWORD_HASH:**
```bash
node -e "
const p='password_kamu', s='isi_PASSWORD_SALT';
crypto.subtle.digest('SHA-256',new TextEncoder().encode(p+s))
  .then(b=>console.log([...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')));
"
```

### Database (Supabase)

Jalankan `schema.sql` di SQL Editor. Sudah include:
- Tabel `snippets` + RLS (public read, service-role write)
- RPC: `increment_views`, `increment_likes`, `decrement_likes` (atomic)
- Index performa

### Deploy Vercel

```bash
npm i -g vercel && vercel --prod
```

### Local Dev

```bash
npm install && npx vercel dev
```

---

## API Reference

Base URL otomatis mengikuti domain yang dibuka (lihat `_info.html` script).

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/snippets` | List semua snippet (no code, cache 15s) |
| GET | `/api/snippet/:hash` | Detail + code field |
| GET | `/raw/:hash` | Raw code sebagai `text/plain` |
| GET | `/raw/:hash?dl=1` | Download file |
| POST | `/api/snippets` | Like/unlike/view (`{ action, id }`) |
| POST | `/api/snippet-create` | Upload snippet baru |
| PUT | `/api/snippet-action` | Edit snippet (butuh key/admin) |
| DELETE | `/api/snippet-action` | Hapus snippet (butuh key/admin) |
| POST | `/api/admin-login` | Login admin |
| GET | `/api/admin-verify` | Cek JWT |
| POST | `/api/admin-logout` | Logout |

---

## Bug Fixes (Semua Versi)

### v2.5 — Current

| # | Severity | Bug | Fix |
|---|----------|-----|-----|
| 1 | 🔴 | Download gagal — `a.download` + `Content-Disposition` tidak work cross-origin di mobile | Ganti ke **Blob URL** client-side (`URL.createObjectURL`) |
| 2 | 🔴 | `view` action di `snippets.js` return `{ ok: true }` tapi frontend expect `{ views: n }` | Return `{ views: n }` setelah increment |
| 3 | 🔴 | Logo masih teks "Mz" — seharusnya pakai foto asli | Ganti semua `<div class="logo-mark">` dengan `<img>` + onerror fallback |
| 4 | 🟠 | `copyCode()` gagal di mobile browser lama (no Clipboard API) | Tambah fallback `document.execCommand('copy')` |
| 5 | 🟠 | `apiHelpers.js` — OPTIONS return 200 bukan 204 (standar salah) | Fix ke `res.status(204).end()` |
| 6 | 🟠 | `apiHelpers.js` — `Authorization` tidak di-whitelist CORS header | Tambah ke `Access-Control-Allow-Headers` |
| 7 | 🟠 | `langMeta.js` — banyak bahasa missing ext (Sass, Zig, Vue, dll) | Lengkapi semua ext map |
| 8 | 🟠 | `langMeta.js` — `LANG_EXT[lang]` return `undefined` bukan default | Fix ke `?? 'txt'` (nullish coalescing) |
| 9 | 🟡 | `db.js` — tidak ada warning kalau env vars missing | Tambah `console.error` kalau env kosong |
| 10 | 🟡 | `info.js` — `cpEx` tidak ada fallback untuk browser tanpa Clipboard API | Tambah execCommand fallback |
| 11 | 🟡 | `info.js` — IntersectionObserver `threshold: 0.3` terlalu agresif di mobile | Tambah `rootMargin` agar lebih akurat |
| 12 | 🟡 | `copyShareLink()` — tidak check `su.textContent` sebelum clipboard write | Tambah null guard |
| 13 | 🟡 | `downloadCode()` — tidak check `curSnip.code` sebelum blob creation | Tambah early return + toast |
| 14 | 🟢 | `snippet/[id].js` — cache tidak di-set `at` field, X-Cache selalu HIT | Cache sudah menyimpan `data` langsung (bukan objek dengan `at`) |
| 15 | 🟢 | `raw/[id].js` — response tidak include `X-Content-Type-Options` | Tambah header security |

### v2.4
- Download fix (partial — masih pakai server Content-Disposition)
- Logo gambar ditambahkan

### v2.3
- Splash stuck — fallback timeout 6s
- `app.js` tidak di-include (loading muter terus)
- localStorage crash private mode
- Atomic RPC untuk like/view
- Escape menutup semua modal sekaligus
- `updateCounts()` crash untuk C++, C#, F#

### v2.2
- URL dari `?id=` ke `/app/title-slug`
- Raw URL dari `/api/snippet/:hash/raw` ke `/raw/:hash`
- Refactor shared libs ke `src/lib/`

### v2.1
- `[id].js` — `parseInt(hash)` = NaN → 400 error
- Responsive breakpoint

### v2.0
- Full redesign
- Fix double page bug

---

## Lisensi

MIT · **by [Manzxy](https://t.me/manzxy)**
