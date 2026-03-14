# ManzxyCodes — Setup Guide

## Struktur File
```
ManzxyCodes/
├── index.html          ← Main app (zero credentials)
├── info.html           ← Owner contact + API docs
├── vercel.json         ← Routing config
├── package.json        ← Dependencies (jose + supabase)
├── schema.sql          ← Jalankan di Supabase SQL Editor
└── api/
    ├── snippets.js         ← GET all + POST like/view
    ├── snippet-create.js   ← POST upload snippet baru
    ├── snippet-action.js   ← PUT edit + DELETE hapus
    ├── admin-login.js      ← POST login → set JWT cookie
    ├── admin-verify.js     ← GET cek session admin
    └── admin-logout.js     ← POST logout → hapus cookie
```

---

## Step 1 — Supabase

1. Buat project baru di https://supabase.com
2. SQL Editor → paste isi `schema.sql` → Run
3. Catat dari **Settings → API**:
   - `Project URL`  → `SUPABASE_URL`
   - `anon public`  → `SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY` ← **RAHASIA, jangan expose!**

---

## Step 2 — Generate Password Hash

Jalankan di browser console atau Node.js:

```js
async function hashPass(password, salt) {
  const buf = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(password + salt)
  );
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2,'0')).join('');
}

const salt = 'buat_salt_acak_minimal_16_karakter_ini';
const hash = await hashPass('password_admin_kamu', salt);
console.log(hash); // → copy ke ADMIN_PASSWORD_HASH
```

---

## Step 3 — Vercel Environment Variables

**Project → Settings → Environment Variables**, tambahkan semua:

| Name | Value |
|------|-------|
| `SUPABASE_URL` | `https://xxxxx.supabase.co` |
| `SUPABASE_ANON_KEY` | `eyJhbGci...` (anon key) |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGci...` (service role — rahasia!) |
| `ADMIN_USERNAME` | username admin kamu |
| `ADMIN_PASSWORD_HASH` | hasil hash dari Step 2 |
| `PASSWORD_SALT` | salt yang sama dari Step 2 |
| `JWT_SECRET` | string acak panjang (min 32 char) |
| `KEY_SALT` | string acak lain untuk hash snippet key |

Generate string acak:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Step 4 — Deploy

```bash
# 1. Push ke GitHub
git init && git add . && git commit -m "init ManzxyCodes"
git remote add origin https://github.com/username/manzxycodes.git
git push -u origin main

# 2. Buka vercel.com/new → Import repo → Deploy
```

---

## Cara Kerja Auth (Ringkas)

```
Browser → POST /api/admin-login { username, password }
Server  → hash(password+salt) → compare ADMIN_PASSWORD_HASH
Server  → set mzx_token cookie (HttpOnly, tidak bisa dibaca JS)
Browser → cookie dikirim otomatis di setiap request ke /api
```

Edit/Delete dengan key:
```
Browser → PUT/DELETE /api/snippet-action { id, snippetKey }
Server  → hash(snippetKey+KEY_SALT) → compare snippet_key_hash di DB
Server  → kalau cocok → update/delete
```
