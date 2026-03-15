-- ════════════════════════════════════════════════
-- ManzxyCodes — Supabase Schema
-- Jalankan di: Supabase Dashboard → SQL Editor
-- ════════════════════════════════════════════════

-- Buat tabel
create table if not exists snippets (
  id                bigserial    primary key,
  created_at        timestamptz  default now() not null,
  author            text         not null,
  title             text         not null,
  description       text         default '',
  language          text         not null default 'JavaScript',
  tags              text[]       default '{}',
  code              text         not null,
  snippet_key_hash  text         not null,
  likes             integer      default 0 not null,
  views             integer      default 0 not null
);

-- Row Level Security
alter table snippets enable row level security;

-- ⚠️  Semua operasi lewat service_role key dari server Node.js
-- service_role key BYPASS RLS secara otomatis — tidak perlu policy write
-- Cukup izinkan anon untuk SELECT (baca publik)

-- Hapus policy lama kalau ada
drop policy if exists "public_read"   on snippets;
drop policy if exists "service_write" on snippets;
drop policy if exists "anon_read"     on snippets;

-- Policy: siapapun boleh baca (publik)
create policy "public_read" on snippets
  for select
  using (true);

-- Index performa
create index if not exists idx_lang on snippets(language);
create index if not exists idx_date on snippets(created_at desc);

-- ════════════════════════════════════════════════
-- SELESAI. Lanjut ke SETUP-VPS.md atau SETUP.md
-- ════════════════════════════════════════════════
