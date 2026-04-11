// api/code.js
// GET /api/code?id=HASH&type=detail  → JSON snippet detail + code
// GET /api/code?id=HASH&type=raw     → text/plain raw code (inline)
// GET /api/code?id=HASH&type=raw&dl=1 → download attachment

import { pub }                    from '../src/lib/db.js';
import { parseId }                from '../src/lib/hashId.js';
import { getExt, getSafeName }    from '../src/lib/langMeta.js';
import { setCORS, handleOptions } from '../src/lib/apiHelpers.js';

const cacheDetail = new Map();
const cacheRaw    = new Map();

setInterval(() => {
  const now = Date.now();
  for (const [k, v] of cacheDetail) if (now - v.at > 90_000)  cacheDetail.delete(k);
  for (const [k, v] of cacheRaw)    if (now - v.at > 120_000) cacheRaw.delete(k);
}, 5 * 60_000);

export default async function handler(req, res) {
  setCORS(res, 'GET,OPTIONS');
  if (handleOptions(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const numericId = parseId(req.query.id);
  if (!numericId) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.status(400).end('ID tidak valid');
  }

  const type = req.query.type || 'detail';
  const key  = String(numericId);

  // ── RAW
  if (type === 'raw') {
    const isDownload = req.query.dl === '1';
    let entry = cacheRaw.get(key);

    if (!entry) {
      const { data, error } = await pub
        .from('snippets')
        .select('id,title,language,code')
        .eq('id', numericId)
        .single();

      if (error || !data) {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        return res.status(404).end('Snippet tidak ditemukan');
      }

      entry = {
        code: data.code ?? '',
        name: getSafeName(data.title),
        ext:  getExt(data.language),
        at:   Date.now(),
      };
      cacheRaw.set(key, entry);
    }

    const filename = `${entry.name}.${entry.ext}`;
    res.setHeader('Cache-Control',        'public, max-age=120, stale-while-revalidate=60');
    res.setHeader('Content-Type',         'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition',  isDownload ? `attachment; filename="${filename}"` : `inline; filename="${filename}"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return res.status(200).end(entry.code);
  }

  // ── DETAIL (default)
  const cached = cacheDetail.get(key);
  if (cached) {
    res.setHeader('X-Cache', 'HIT');
    res.setHeader('Cache-Control', 'public, max-age=60');
    return res.status(200).json(cached.data);
  }

  const { data, error } = await pub
    .from('snippets')
    .select('id,created_at,author,title,description,language,tags,code,likes,views')
    .eq('id', numericId)
    .single();

  if (error || !data) return res.status(404).json({ error: 'Snippet tidak ditemukan' });

  cacheDetail.set(key, { data, at: Date.now() });
  res.setHeader('X-Cache', 'MISS');
  res.setHeader('Cache-Control', 'public, max-age=60');
  return res.status(200).json(data);
}
