// api/admin-verify.js
// GET /api/admin-verify → { admin: true|false }

import { jwtVerify } from 'jose';
import { setCORS, handleOptions } from '../src/lib/apiHelpers.js';

export default async function handler(req, res) {
  setCORS(res, 'GET,OPTIONS');
  if (handleOptions(req, res)) return;

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
