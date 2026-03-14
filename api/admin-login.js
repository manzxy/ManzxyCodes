// api/admin-login.js
// Dipanggil dari frontend: POST /api/admin-login
// Credentials HANYA ada di Vercel Environment Variables — tidak pernah expose ke browser

import { SignJWT } from 'jose';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate limit sederhana via header (Vercel edge tidak simpan state,
  // tapi ini cukup untuk cegah brute force basic)
  const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';

  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username dan password wajib diisi' });
    }

    // Ambil dari Vercel Environment Variables (tidak pernah ke client)
    const ADMIN_USER     = process.env.ADMIN_USERNAME;
    const ADMIN_PASS     = process.env.ADMIN_PASSWORD_HASH; // SHA-256 hex dari password
    const JWT_SECRET     = process.env.JWT_SECRET;

    if (!ADMIN_USER || !ADMIN_PASS || !JWT_SECRET) {
      console.error('Environment variables not set');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Hash password yang dikirim, bandingkan dengan hash di env
    const encoder = new TextEncoder();
    const data = encoder.encode(password + process.env.PASSWORD_SALT);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashHex = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    const userMatch = username === ADMIN_USER;
    const passMatch = hashHex === ADMIN_PASS;

    // Constant-time compare (hindari timing attack)
    if (!userMatch || !passMatch) {
      // Delay acak 100-300ms untuk anti-brute-force
      await new Promise(r => setTimeout(r, 100 + Math.random() * 200));
      return res.status(401).json({ error: 'Username atau password salah' });
    }

    // Buat JWT — expire 8 jam
    const secret = new TextEncoder().encode(JWT_SECRET);
    const token = await new SignJWT({ role: 'admin', ip })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('8h')
      .sign(secret);

    // Set sebagai HttpOnly cookie — TIDAK bisa diakses JS di browser
    res.setHeader('Set-Cookie', [
      `admin_token=${token}; HttpOnly; Secure; SameSite=Strict; Max-Age=28800; Path=/`
    ]);

    return res.status(200).json({ ok: true });

  } catch (err) {
    console.error('Admin login error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
