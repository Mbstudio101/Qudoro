-- Qudoro Marketplace Phase 1 schema (Supabase/PostgreSQL)
-- Run in Supabase SQL editor.

create extension if not exists pgcrypto;

create table if not exists public.shared_sets (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  slug text not null unique,
  title text not null,
  description text not null default '',
  subject text not null,
  tags text[] not null default '{}',
  visibility text not null default 'public' check (visibility in ('public', 'private')),
  version integer not null default 1,
  downloads_count integer not null default 0,
  rating_avg numeric(3,2) not null default 0,
  rating_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_shared_sets_visibility on public.shared_sets (visibility);
create index if not exists idx_shared_sets_subject on public.shared_sets (subject);
create index if not exists idx_shared_sets_author on public.shared_sets (author_id);
create index if not exists idx_shared_sets_tags_gin on public.shared_sets using gin (tags);
create index if not exists idx_shared_sets_search on public.shared_sets using gin (to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(description, '')));

create table if not exists public.shared_questions (
  id uuid primary key default gen_random_uuid(),
  set_id uuid not null references public.shared_sets(id) on delete cascade,
  remote_question_id text not null,
  content text not null,
  rationale text not null default '',
  options jsonb not null default '[]'::jsonb,
  answers jsonb not null default '[]'::jsonb,
  tags text[] not null default '{}',
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (set_id, remote_question_id)
);

create index if not exists idx_shared_questions_set on public.shared_questions (set_id);
create index if not exists idx_shared_questions_order on public.shared_questions (set_id, order_index);

create table if not exists public.set_versions (
  id uuid primary key default gen_random_uuid(),
  set_id uuid not null references public.shared_sets(id) on delete cascade,
  version integer not null,
  release_notes text not null default '',
  snapshot jsonb not null,
  created_at timestamptz not null default now(),
  unique (set_id, version)
);

create table if not exists public.set_downloads (
  id uuid primary key default gen_random_uuid(),
  set_id uuid not null references public.shared_sets(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  downloaded_at timestamptz not null default now(),
  unique (set_id, user_id)
);

create table if not exists public.set_reports (
  id uuid primary key default gen_random_uuid(),
  set_id uuid not null references public.shared_sets(id) on delete cascade,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reason text not null,
  details text not null default '',
  status text not null default 'open' check (status in ('open', 'reviewing', 'closed')),
  created_at timestamptz not null default now()
);

-- Keep updated_at current.
create or replace function public.touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_touch_shared_sets
before update on public.shared_sets
for each row execute procedure public.touch_updated_at();

create trigger trg_touch_shared_questions
before update on public.shared_questions
for each row execute procedure public.touch_updated_at();

-- Row Level Security.
alter table public.shared_sets enable row level security;
alter table public.shared_questions enable row level security;
alter table public.set_versions enable row level security;
alter table public.set_downloads enable row level security;
alter table public.set_reports enable row level security;

-- Public can read public sets.
drop policy if exists "Public can read public sets" on public.shared_sets;
create policy "Public can read public sets"
on public.shared_sets
for select
using (visibility = 'public');

-- Authors can read and modify their own sets.
drop policy if exists "Authors manage own sets" on public.shared_sets;
create policy "Authors manage own sets"
on public.shared_sets
for all
using (auth.uid() = author_id)
with check (auth.uid() = author_id);

-- Public can read questions for public sets.
drop policy if exists "Public can read public set questions" on public.shared_questions;
create policy "Public can read public set questions"
on public.shared_questions
for select
using (
  exists (
    select 1 from public.shared_sets s
    where s.id = shared_questions.set_id and s.visibility = 'public'
  )
);

-- Authors can manage questions for their own sets.
drop policy if exists "Authors manage own set questions" on public.shared_questions;
create policy "Authors manage own set questions"
on public.shared_questions
for all
using (
  exists (
    select 1 from public.shared_sets s
    where s.id = shared_questions.set_id and s.author_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.shared_sets s
    where s.id = shared_questions.set_id and s.author_id = auth.uid()
  )
);

-- Versions are readable for public sets and writable by author.
drop policy if exists "Public can read public versions" on public.set_versions;
create policy "Public can read public versions"
on public.set_versions
for select
using (
  exists (
    select 1 from public.shared_sets s
    where s.id = set_versions.set_id and s.visibility = 'public'
  )
);

drop policy if exists "Authors manage own versions" on public.set_versions;
create policy "Authors manage own versions"
on public.set_versions
for all
using (
  exists (
    select 1 from public.shared_sets s
    where s.id = set_versions.set_id and s.author_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.shared_sets s
    where s.id = set_versions.set_id and s.author_id = auth.uid()
  )
);

-- User can log own downloads and create reports.
drop policy if exists "Users manage own downloads" on public.set_downloads;
create policy "Users manage own downloads"
on public.set_downloads
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users manage own reports" on public.set_reports;
create policy "Users manage own reports"
on public.set_reports
for all
using (auth.uid() = reporter_id)
with check (auth.uid() = reporter_id);
