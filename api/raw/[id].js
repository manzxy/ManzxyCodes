// api/raw/[id].js
// GET /raw/:hash — short URL untuk raw code
// Redirect or proxy ke /api/snippet/:hash/raw

import { createClient } from '@supabase/supabase-js';

const pub = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, { auth: { persistSession: false } });

const ID_M1 = 0x9B4EA3C1, ID_M2 = 0x5A3F9C2E, INV = 0x144cbc89;

function encodeId(n) {
  let x = (n >>> 0);
  x = ((x ^ ID_M1) >>> 0);
  x = Math.imul(x, 0x9e3779b9) >>> 0;
  x = ((x >>> 16) ^ x) >>> 0;
  x = ((x ^ ID_M2) >>> 0);
  return ('00000000' + x.toString(16)).slice(-8);
}

function hashToNumeric(hash) {
  let x = parseInt(hash, 16) >>> 0;
  x = (x ^ ID_M2) >>> 0;
  x = (x ^ (x >>> 16)) >>> 0;
  x = Math.imul(x, INV) >>> 0;
  x = (x ^ ID_M1) >>> 0;
  return x;
}

const cache = new Map();
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of cache) if (now - v.at > 120_000) cache.delete(k);
}, 5 * 60_000);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).end('Method Not Allowed');

  const { id: rawId } = req.query;
  if (!rawId) return res.status(400).end('ID diperlukan');

  // Accept: hash (8 hex chars) OR numeric
  let numericId;
  const clean = rawId.toLowerCase().trim();
  if (/^[0-9a-f]{8}$/.test(clean)) {
    numericId = hashToNumeric(clean);
    if (encodeId(numericId) !== clean) return res.status(404).end('Snippet tidak ditemukan');
  } else {
    numericId = parseInt(rawId, 10);
  }

  if (!Number.isFinite(numericId) || numericId <= 0 || numericId > 2_147_483_647)
    return res.status(400).end('ID tidak valid');

  // Check download param
  const isDownload = req.query.dl === '1' || req.query.download === '1';

  const hash = encodeId(numericId);
  const cached = cache.get(hash);
  if (cached) {
    const disp = isDownload
      ? cached.disposition.replace('inline', 'attachment')
      : cached.disposition;
    res.setHeader('X-Cache', 'HIT');
    res.setHeader('Cache-Control', 'public, max-age=120');
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', disp);
    return res.status(200).end(cached.code);
  }

  const { data, error } = await pub
    .from('snippets')
    .select('id,title,language,code')
    .eq('id', numericId)
    .single();

  if (error || !data) return res.status(404).end('Snippet tidak ditemukan');

  const extMap = {
    JavaScript:'js', TypeScript:'ts', Python:'py', PHP:'php', Go:'go',
    Rust:'rs', CSS:'css', HTML:'html', Shell:'sh', Bash:'sh', SQL:'sql',
    Ruby:'rb', C:'c', 'C++':'cpp', 'C#':'cs', Java:'java', Kotlin:'kt',
    Swift:'swift', Dart:'dart', Lua:'lua', JSON:'json', YAML:'yaml',
    TOML:'toml', XML:'xml', Markdown:'md', Dockerfile:'dockerfile',
    Nginx:'conf', 'PowerShell':'ps1', Lua:'lua', R:'r',
  };
  const ext = extMap[data.language] || 'txt';
  const safeName = (data.title || 'snippet')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60) || 'snippet';

  const baseDisp = `inline; filename="${safeName}.${ext}"`;
  cache.set(hash, { code: data.code, disposition: baseDisp, at: Date.now() });

  const finalDisp = isDownload ? `attachment; filename="${safeName}.${ext}"` : baseDisp;
  res.setHeader('X-Cache', 'MISS');
  res.setHeader('Cache-Control', 'public, max-age=120');
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Content-Disposition', finalDisp);
  return res.status(200).end(data.code);
}
