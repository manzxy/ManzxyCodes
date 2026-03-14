// api/admin-verify.js
// Frontend panggil ini untuk cek apakah session admin masih valid

import { jwtVerify } from 'jose';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const cookie = req.headers.cookie || '';
    const match  = cookie.match(/admin_token=([^;]+)/);
    if (!match) return res.status(401).json({ admin: false });

    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) return res.status(500).json({ error: 'Config error' });

    await jwtVerify(match[1], new TextEncoder().encode(JWT_SECRET));
    return res.status(200).json({ admin: true });
  } catch {
    return res.status(401).json({ admin: false });
  }
}
