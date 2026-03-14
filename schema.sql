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

-- Publik boleh SELECT
create policy "public_read" on snippets
  for select using (true);

-- INSERT / UPDATE / DELETE hanya lewat service_role (dari API server)
-- Anon tidak bisa langsung write — semua lewat /api
create policy "service_write" on snippets
  for all using (auth.role() = 'service_role');

-- Index performa
create index if not exists idx_lang on snippets(language);
create index if not exists idx_date on snippets(created_at desc);

-- ════════════════════════════════════════════════
-- Setelah setup tabel, isi SETUP.md untuk langkah selanjutnya
-- ════════════════════════════════════════════════
