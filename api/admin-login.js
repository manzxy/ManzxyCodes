// api/admin-login.js
// POST /api/admin-login → verify credentials, set JWT HttpOnly cookie

import { SignJWT } from 'jose';
import { parseBody, setCORS, handleOptions } from '../src/lib/apiHelpers.js';

export default async function handler(req, res) {
  setCORS(res, 'POST,OPTIONS');
  if (handleOptions(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { username, password } = parseBody(req);
  if (!username || !password) return res.status(400).json({ error: 'Username & password wajib' });

  const ADM_USER = process.env.ADMIN_USERNAME;
  const ADM_HASH = process.env.ADMIN_PASSWORD_HASH;
  const JWT_SEC  = process.env.JWT_SECRET;
  const SALT     = process.env.PASSWORD_SALT || '';

  if (!ADM_USER || !ADM_HASH || !JWT_SEC)
    return res.status(500).json({ error: 'Server belum dikonfigurasi' });

  try {
    const buf    = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password + SALT));
    const hexPwd = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');

    if (username !== ADM_USER || hexPwd !== ADM_HASH) {
      await new Promise(r => setTimeout(r, 150 + Math.random() * 200));
      return res.status(401).json({ error: 'Credentials salah' });
    }

    const token = await new SignJWT({ role: 'admin' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('8h')
      .sign(new TextEncoder().encode(JWT_SEC));

    const prod = process.env.NODE_ENV === 'production';
    res.setHeader('Set-Cookie',
      `mzx_token=${token}; HttpOnly; ${prod ? 'Secure; ' : ''}SameSite=Lax; Max-Age=28800; Path=/`);
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[admin-login]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
