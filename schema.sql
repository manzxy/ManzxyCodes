-- ════════════════════════════════════════════
-- SnippetHub v3 — Supabase Schema
-- Jalankan di SQL Editor Supabase
-- ════════════════════════════════════════════

create table if not exists snippets (
  id                bigserial    primary key,
  created_at        timestamptz  default now() not null,
  author            text         not null,
  title             text         not null,
  description       text,
  language          text         not null default 'JavaScript',
  tags              text[]       default '{}',
  code              text         not null,
  snippet_key_hash  text         not null,  -- SHA-256 hash, bukan plain key!
  likes             integer      default 0 not null,
  views             integer      default 0 not null
);

-- RLS
alter table snippets enable row level security;

-- Hanya izinkan SELECT untuk anon (data publik)
-- INSERT/UPDATE/DELETE hanya lewat service role (dari API server)
create policy "anon_read"   on snippets for select using (true);

-- Index
create index if not exists idx_lang on snippets(language);
create index if not exists idx_date on snippets(created_at desc);
