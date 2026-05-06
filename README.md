# ManzxyCodes

Platform snippet code open untuk developer Indonesia. Simpan, share, temukan kode siap pakai — gratis selamanya.

**Live:** https://manzxy-codes.vercel.app · https://manzxy.biz.id

---

## Stack

| Layer | Tech |
|-------|------|
| Frontend | Vanilla HTML/CSS/JS |
| Backend | Vercel Serverless (Node.js 24+ ESM) |
| Database | Supabase (PostgreSQL + RLS) |
| Auth | JWT HttpOnly cookie (`jose`) |
| Highlighting | highlight.js `tokyo-night-dark` |
| Fonts | Nunito + JetBrains Mono |

---

## Tema (Light / Dark / Black)

ManzxyCodes mendukung 3 tema visual yang bisa dipilih via tombol di topbar:

| Tema | Deskripsi |
|------|-----------|
| ☀️ **Light** | Neumorphism putih/abu — default, cocok siang hari |
| 🌙 **Dark** | Neumorphism biru-gelap — ramah mata malam |
| ⬛ **Black** | Neumorphism hitam pekat — mode AMOLED/true black |

Pilihan disimpan di `localStorage` (`mzx_theme`), persisten antar sesi. Diimplementasikan via CSS `[data-theme]` attribute pada `<html>` — tanpa refresh, tanpa flash.

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
├── _app.html                   App UI (/app) — dengan #themePicker
├── app.js                      Logic + theme system
├── app.css                     Styles (3 tema: light / dark / black)
│
├── _info.html                  Landing + API docs (/) — dengan #themePicker
├── info.js                     Landing stats, tabs + theme system
├── info.css                    Landing styles (3 tema)
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

## Changelog

### v3.0 — Cyberpunk Rewrite (Current)

| # | Severity | Perubahan |
|---|----------|-----------|
| 0 | ✨ | **Cyberpunk redesign** — dark background, cyan + pink accent, monospace headings |
| 1 | ✨ | **VPS support** — `manzxy.js` Express server + `nginx.conf` + `ecosystem.config.cjs` |
| 2 | ✨ | Server-side snippet cache (10s TTL) — kurangi Supabase calls drastis |
| 3 | ✨ | Rate limiter per-IP + global + IP blacklist otomatis |
| 4 | ✨ | Anti-spam: honeypot field, entropy check, content pattern filter |
| 5 | ✨ | Admin login via `/app` dengan JWT session (HttpOnly cookie) |
| 6 | 🐛 | **Fix: `SUPABASE_ANON_KEY` corrupt** — suffix `.XXXXXXXX` dihapus, koneksi DB normal |
| 7 | 🐛 | **Fix: CSS class mismatch** — `.db-status.connected` / `.error` sekarang match JS |
| 8 | 🎨 | **Fix: lamp dot annoying** — dot berhenti animasi setelah DB terhubung (solid glow) |
| 9 | 🎨 | scanline overlay di landing dipertahankan tapi lebih subtle (opacity 0.03) |

### v2.7

| # | Severity | Perubahan |
|---|----------|-----------|
| 0 | ✨ | **3 tema baru**: Light (putih), Dark (navy), Black (AMOLED) — persistent via localStorage |
| 1 | ✨ | Theme picker dropdown di topbar (`#themePicker`) — kedua halaman app + info |
| 2 | ✨ | CSS `[data-theme]` attribute system — transisi mulus tanpa flash |
| 3 | 🎨 | Perbaikan warna shadows lebih konsisten di semua elemen |
| 4 | 🎨 | Tag bahasa (`tag-js`, `tag-ts`, dll) warna disesuaikan tiap tema |
| 5 | 🎨 | `--code-bg` variable terpisah untuk code block background |

### v2.6

| # | Severity | Bug | Fix |
|---|----------|-----|-----|
| 0 | 🔵 | Node runtime masih 18, Vercel belum pakai Node 24 | Update engine >=24 + vercel.json nodejs24.x |
| 0 | 🔵 | Duplicate id="newBtnDesk" (topbar + page header) | Rename topbar → newBtnTopbar |
| 0 | 🔵 | Favicon tidak ada | Tambah link rel=icon + apple-touch-icon |
| 1 | 🔴 | Download gagal cross-origin di mobile | Ganti ke Blob URL client-side |
| 2 | 🔴 | `view` action return `{ ok: true }` bukan `{ views: n }` | Fix return value |
| 3 | 🔴 | Logo masih teks "Mz" | Ganti dengan `<img>` + onerror fallback |
| 4 | 🟠 | `copyCode()` gagal di mobile browser lama | Tambah fallback `execCommand('copy')` |
| 5 | 🟠 | OPTIONS return 200 bukan 204 | Fix ke `res.status(204).end()` |
| 6 | 🟠 | `Authorization` tidak di-whitelist CORS header | Tambah ke Allow-Headers |
| 7 | 🟠 | Banyak bahasa missing ext di `langMeta.js` | Lengkapi semua ext map |

### v2.3
- Splash stuck — fallback timeout 6s
- localStorage crash private mode
- Atomic RPC untuk like/view
- Escape menutup semua modal sekaligus

### v2.2
- URL dari `?id=` ke `/app/title-slug`
- Raw URL dari `/api/snippet/:hash/raw` ke `/raw/:hash`
- Refactor shared libs ke `src/lib/`

---

## Lisensi

MIT · **by [Manzxy](https://t.me/manzxy)**
