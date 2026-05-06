// api/snippet-verify-pw.js
// POST /api/snippet-verify-pw  →  verifikasi password snippet
// Body: { id: number, password: string }
// Response OK:  { ok: true, code: string }
// Response ERR: { error: string }

import { svc }                from '../src/lib/db.js';
import { parseBody, setCORS,
         handleOptions }      from '../src/lib/apiHelpers.js';

// Rate limit: maks 5 attempt per IP per snippet per 2 menit
const pwRL = new Map();
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of pwRL) if (now > v.until) pwRL.delete(k);
}, 2 * 60_000);

async function hashPassword(raw) {
  const salt = process.env.PW_SALT || process.env.KEY_SALT || 'manzxycodes_pw_salt';
  const buf  = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('snip_pw:' + raw + salt));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export default async function handler(req, res) {
  setCORS(res, 'POST,OPTIONS');
  if (handleOptions(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const body     = parseBody(req);
  const id       = parseInt(body.id, 10);
  const password = String(body.password || '').trim();

  if (!Number.isFinite(id) || id <= 0)
    return res.status(400).json({ error: 'id tidak valid' });
  if (!password)
    return res.status(400).json({ error: 'Password wajib diisi' });

  // Rate limit per IP+snippet
  const ip  = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  const rlk = `pw:${ip}:${id}`;
  const now = Date.now();
  const rl  = pwRL.get(rlk);

  if (rl) {
    if (now < rl.until) {
      const secs = Math.ceil((rl.until - now) / 1000);
      return res.status(429).json({ error: `Terlalu banyak percobaan. Tunggu ${secs} detik.` });
    }
    pwRL.delete(rlk);
  }

  // Fetch snippet
  const { data, error } = await svc
    .from('snippets')
    .select('id, code, password_hash')
    .eq('id', id)
    .single();

  if (error || !data)
    return res.status(404).json({ error: 'Snippet tidak ditemukan' });

  if (!data.password_hash)
    return res.status(400).json({ error: 'Snippet ini tidak dilindungi password' });

  // Add small delay to resist brute-force
  await new Promise(r => setTimeout(r, 100 + Math.random() * 150));

  const inputHash = await hashPassword(password);
  if (inputHash !== data.password_hash) {
    // Track failed attempts
    const existing = pwRL.get(rlk) || { count: 0 };
    existing.count++;
    if (existing.count >= 5) {
      existing.until = now + 2 * 60_000; // 2 menit lockout
    }
    pwRL.set(rlk, existing);
    return res.status(403).json({ error: 'Password salah' });
  }

  // Correct password — return code
  return res.status(200).json({ ok: true, code: data.code });
}
