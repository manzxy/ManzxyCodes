// api/admin-logout.js
// POST /api/admin-logout → clear JWT cookie

import { setCORS, handleOptions } from '../src/lib/apiHelpers.js';

export default async function handler(req, res) {
  setCORS(res, 'POST,OPTIONS');
  if (handleOptions(req, res)) return;
  res.setHeader('Set-Cookie', 'mzx_token=; HttpOnly; SameSite=Lax; Max-Age=0; Path=/');
  return res.status(200).json({ ok: true });
}
