// api/snippet/[id].js
// GET /api/snippet/:id — snippet detail + code field
// :id = 8-char hex hash OR numeric

import { pub }               from '../../src/lib/db.js';
import { parseId, encodeId } from '../../src/lib/hashId.js';
import { setCORS, handleOptions } from '../../src/lib/apiHelpers.js';

const cache = new Map();
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of cache) if (now - v.at > 90_000) cache.delete(k);
}, 5 * 60_000);

export default async function handler(req, res) {
  setCORS(res, 'GET,OPTIONS');
  if (handleOptions(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const numericId = parseId(req.query.id);
  if (!numericId) return res.status(400).json({ error: 'ID tidak valid' });

  const key = String(numericId);
  const cached = cache.get(key);
  if (cached) {
    res.setHeader('X-Cache', 'HIT');
    res.setHeader('Cache-Control', 'public, max-age=60');
    return res.status(200).json(cached);
  }

  const { data, error } = await pub
    .from('snippets')
    .select('id,created_at,author,title,description,language,tags,code,likes,views')
    .eq('id', numericId)
    .single();

  if (error || !data) return res.status(404).json({ error: 'Snippet tidak ditemukan' });

  cache.set(key, data);
  res.setHeader('X-Cache', 'MISS');
  res.setHeader('Cache-Control', 'public, max-age=60');
  return res.status(200).json(data);
}
