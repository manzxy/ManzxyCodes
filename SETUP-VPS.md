# ManzxyCodes — VPS Setup Guide
# © 2026 By Manzxy

## Struktur File (mode VPS)
```
ManzxyCodes/
├── manzxy.js              ← ⭐ SERVER UTAMA — jalankan ini
├── index.html             ← Frontend app
├── info.html              ← Owner & Docs page
├── package.json           ← Dependencies
├── .env.example           ← Template env vars
├── .env                   ← Buat sendiri dari .env.example (jangan di-commit!)
├── nginx.conf             ← Nginx reverse proxy + SSL
├── ecosystem.config.cjs   ← PM2 config
├── schema.sql             ← Supabase schema
├── api/                   ← (untuk Vercel — tidak dipakai di VPS mode)
└── logs/                  ← Dibuat otomatis oleh PM2
```

---

## Langkah 1 — Siapkan VPS

```bash
# Update sistem
sudo apt update && sudo apt upgrade -y

# Install Node.js 20 (via NodeSource)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verifikasi
node -v   # harus >= 18
npm -v

# Install PM2 secara global
sudo npm install -g pm2

# Install Nginx
sudo apt install -y nginx
```

---

## Langkah 2 — Upload Project

```bash
# Option A: Clone dari GitHub
git clone https://github.com/username/manzxycodes.git /var/www/manzxycodes
cd /var/www/manzxycodes

# Option B: SCP dari lokal
scp -r ./ManzxyCodes user@your-vps-ip:/var/www/manzxycodes
ssh user@your-vps-ip
cd /var/www/manzxycodes

# Install dependencies
npm install
```

---

## Langkah 3 — Setup Supabase

1. Buat project di https://supabase.com
2. SQL Editor → paste `schema.sql` → Run
3. Catat dari **Settings → API**:
   - `Project URL` → `SUPABASE_URL`
   - `anon public` → `SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY`

---

## Langkah 4 — Buat File .env

```bash
cd /var/www/manzxycodes
cp .env.example .env
nano .env
```

Generate hash password:
```bash
node -e "
const salt = 'ganti_dengan_salt_kamu_yang_panjang';
const pass = 'password_admin_kamu';
const buf  = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pass + salt));
console.log('HASH:', Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join(''));
"
```

Generate random secrets:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Jalankan 3x untuk JWT_SECRET, PASSWORD_SALT, KEY_SALT
```

Isi `.env`:
```env
PORT=3000
NODE_ENV=production
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
ADMIN_USERNAME=nama_admin_kamu
ADMIN_PASSWORD_HASH=<hasil hash>
PASSWORD_SALT=<salt yang kamu pakai>
JWT_SECRET=<random 64 char>
KEY_SALT=<random 64 char lain>
DOMAIN=https://manzxy.biz.id
```

---

## Langkah 5 — Test Jalankan

```bash
cd /var/www/manzxycodes
node manzxy.js
# Harus muncul: 🚀 Server running at http://0.0.0.0:3000
# Test: curl http://localhost:3000/api/health
# Ctrl+C untuk stop
```

---

## Langkah 6 — Jalankan dengan PM2

```bash
cd /var/www/manzxycodes

# Buat folder logs
mkdir -p logs

# Start dengan PM2
pm2 start ecosystem.config.cjs --env production

# Cek status
pm2 status
pm2 logs manzxycodes

# Auto-start saat VPS reboot
pm2 save
pm2 startup
# Ikuti perintah yang muncul (copy-paste perintah sudo yang ditampilkan)
```

---

## Langkah 7 — Setup Domain & SSL

**A. Arahkan DNS domain ke IP VPS:**
Di DNS manager domain kamu, buat record:
```
Type: A
Name: @  (atau manzxy.biz.id)
Value: IP_VPS_KAMU

Type: A
Name: www
Value: IP_VPS_KAMU
```
Tunggu propagasi DNS (5 menit – 48 jam).

**B. Setup Nginx:**
```bash
# Edit nginx.conf — domain sudah di-set ke manzxy.biz.id
# Ganti IP_VPS_KAMU dengan IP VPS kamu di bagian DNS

# Copy ke sites-available
sudo cp /var/www/manzxycodes/nginx.conf /etc/nginx/sites-available/manzxy.biz.id

# Enable site
sudo ln -s /etc/nginx/sites-available/manzxy.biz.id /etc/nginx/sites-enabled/

# Hapus default jika ada
sudo rm -f /etc/nginx/sites-enabled/default

# Test config
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

**C. Install SSL dengan Certbot:**
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d manzxy.biz.id -d www.manzxy.biz.id
# Ikuti instruksi Certbot
# Pilih opsi redirect HTTP → HTTPS

# Auto-renew (sudah otomatis, tapi bisa test)
sudo certbot renew --dry-run
```

---

## Langkah 8 — Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

---

## Perintah Berguna

```bash
# Cek status app
pm2 status
pm2 logs manzxycodes --lines 50

# Restart app (setelah update file)
pm2 restart manzxycodes

# Reload tanpa downtime
pm2 reload manzxycodes

# Stop
pm2 stop manzxycodes

# Update app dari GitHub
cd /var/www/manzxycodes
git pull origin main
npm install
pm2 reload manzxycodes

# Cek nginx
sudo nginx -t
sudo systemctl status nginx
sudo tail -f /var/log/nginx/manzxy.biz.id.error.log

# Test API
curl https://manzxy.biz.id/api/health
curl https://manzxy.biz.id/api/snippets
```

---

## Troubleshooting

| Masalah | Solusi |
|---------|--------|
| `502 Bad Gateway` | App Node tidak jalan. Cek: `pm2 status`, `pm2 logs` |
| `ENOENT .env` | Buat file `.env` dari `.env.example` |
| `env vars missing` | Cek isi `.env`, pastikan semua terisi |
| Port 3000 sudah dipakai | Ganti `PORT=3001` di `.env` dan update `nginx.conf` |
| SSL error | Jalankan ulang: `sudo certbot --nginx -d domain.com` |
| Cookie tidak disimpan | Pastikan `DOMAIN=https://domain.com` di `.env` dan `NODE_ENV=production` |
| Rate limit terkena | Tunggu 1 menit atau restart server |
