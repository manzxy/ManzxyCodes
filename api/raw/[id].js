// api/raw/[id].js
// GET /raw/:hash          → view raw code (text/plain)
// GET /raw/:hash?dl=1     → download file (attachment)

import { pub }               from '../../src/lib/db.js';
import { parseId, encodeId } from '../../src/lib/hashId.js';
import { getExt, getSafeName } from '../../src/lib/langMeta.js';
import { setCORS, handleOptions } from '../../src/lib/apiHelpers.js';

const cache = new Map();
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of cache) if (now - v.at > 120_000) cache.delete(k);
}, 5 * 60_000);

export default async function handler(req, res) {
  setCORS(res, 'GET,OPTIONS');
  if (handleOptions(req, res)) return;
  if (req.method !== 'GET') return res.status(405).end('Method Not Allowed');

  const numericId = parseId(req.query.id);
  if (!numericId) return res.status(400).end('ID tidak valid');

  const isDownload = req.query.dl === '1';
  const key = String(numericId);

  let entry = cache.get(key);
  if (!entry) {
    const { data, error } = await pub
      .from('snippets')
      .select('id,title,language,code')
      .eq('id', numericId)
      .single();

    if (error || !data) return res.status(404).end('Snippet tidak ditemukan');

    entry = {
      code: data.code || '',
      name: getSafeName(data.title),
      ext:  getExt(data.language),
      at:   Date.now(),
    };
    cache.set(key, entry);
  }

  const filename = `${entry.name}.${entry.ext}`;
  const disp = isDownload
    ? `attachment; filename="${filename}"`
    : `inline; filename="${filename}"`;

  res.setHeader('X-Cache', entry.at ? 'HIT' : 'MISS');
  res.setHeader('Cache-Control', 'public, max-age=120');
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Content-Disposition', disp);
  return res.status(200).end(entry.code);
}
