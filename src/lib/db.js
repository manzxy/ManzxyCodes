// src/lib/db.js — Supabase singleton clients
// Initialized once per cold start, reused across warm invocations

import { createClient } from '@supabase/supabase-js';

const opts = { auth: { persistSession: false } };

const url  = process.env.SUPABASE_URL;
const anon = process.env.SUPABASE_ANON_KEY;
const svcK = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anon || !svcK) {
  console.error('[db] Missing Supabase env vars — check SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY');
}

// Public read-only client (anon key, respects RLS)
export const pub = createClient(url, anon, opts);

// Service-role client (bypasses RLS — only use for writes)
export const svc = createClient(url, svcK, opts);
