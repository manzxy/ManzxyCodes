// src/lib/db.js — Supabase client helpers

import { createClient } from '@supabase/supabase-js';

const opts = { auth: { persistSession: false } };

// Anon client — public read only
export const pub = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
  opts
);

// Service role client — full access, bypasses RLS
export const svc = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  opts
);
