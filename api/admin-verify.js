// api/admin-verify.js
// GET /api/admin-verify → { admin: true|false }

import { jwtVerify } from 'jose';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const JWT_SEC = process.env.JWT_SECRET;
  if (!JWT_SEC) return res.status(200).json({ admin: false });

  try {
    const match = (req.headers.cookie || '').match(/mzx_token=([^;]+)/);
    if (!match) return res.status(200).json({ admin: false });
    await jwtVerify(match[1], new TextEncoder().encode(JWT_SEC));
    return res.status(200).json({ admin: true });
  } catch {
    return res.status(200).json({ admin: false });
  }
}
