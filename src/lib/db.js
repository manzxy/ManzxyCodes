// src/lib/db.js — Supabase lazy singleton (safe for Vercel cold start)
// createClient dipanggil pertama kali dibutuhkan, bukan saat module load
// Ini mencegah crash saat env vars belum tersedia di module scope

import { createClient } from '@supabase/supabase-js';

const opts = { auth: { persistSession: false } };

let _pub = null;
let _svc = null;

function getClients() {
  const url  = process.env.SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY;
  const svcK = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !anon || !svcK) {
    throw new Error('Missing Supabase env vars: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY');
  }

  if (!_pub) _pub = createClient(url, anon, opts);
  if (!_svc) _svc = createClient(url, svcK, opts);

  return { pub: _pub, svc: _svc };
}

// Proxy objects — transparan, tidak perlu ubah import di file lain
export const pub = new Proxy({}, {
  get(_, prop) {
    return getClients().pub[prop];
  }
});

export const svc = new Proxy({}, {
  get(_, prop) {
    return getClients().svc[prop];
  }
});
