// api/admin-login.js
// POST /api/admin-login → set HttpOnly JWT cookie

import { SignJWT } from 'jose';

function parseBody(req) {
  if (!req.body) return {};
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch { return {}; } }
  return req.body || {};
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  const { username, password } = parseBody(req);
  if (!username || !password) return res.status(400).json({ error: 'Username & password wajib diisi' });

  const ADM_USER = process.env.ADMIN_USERNAME;
  const ADM_HASH = process.env.ADMIN_PASSWORD_HASH;
  const JWT_SEC  = process.env.JWT_SECRET;
  const SALT     = process.env.PASSWORD_SALT || '';

  if (!ADM_USER || !ADM_HASH || !JWT_SEC) {
    console.error('[admin-login] env vars missing');
    return res.status(500).json({ error: 'Server belum dikonfigurasi. Cek env vars.' });
  }

  try {
    const buf    = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password + SALT));
    const hexPwd = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');

    if (username !== ADM_USER || hexPwd !== ADM_HASH) {
      await new Promise(r => setTimeout(r, 150 + Math.random() * 200)); // anti brute-force
      return res.status(401).json({ error: 'Username atau password salah' });
    }

    const token = await new SignJWT({ role: 'admin' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('8h')
      .sign(new TextEncoder().encode(JWT_SEC));

    const isProd = process.env.NODE_ENV === 'production';
    res.setHeader('Set-Cookie',
      `mzx_token=${token}; HttpOnly; ${isProd ? 'Secure; ' : ''}SameSite=Lax; Max-Age=28800; Path=/`
    );
    return res.status(200).json({ ok: true });

  } catch (err) {
    console.error('[admin-login]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
