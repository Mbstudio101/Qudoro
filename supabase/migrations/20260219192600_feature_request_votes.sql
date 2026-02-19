create table if not exists public.feature_request_votes (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.feature_requests(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (request_id, user_id)
);

create index if not exists idx_feature_request_votes_request_id on public.feature_request_votes (request_id);
create index if not exists idx_feature_request_votes_user_id on public.feature_request_votes (user_id);

alter table public.feature_request_votes enable row level security;

drop policy if exists "Authenticated read feature request votes" on public.feature_request_votes;
create policy "Authenticated read feature request votes"
on public.feature_request_votes
for select
to authenticated
using (true);

drop policy if exists "Users create own feature request votes" on public.feature_request_votes;
create policy "Users create own feature request votes"
on public.feature_request_votes
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users delete own feature request votes" on public.feature_request_votes;
create policy "Users delete own feature request votes"
on public.feature_request_votes
for delete
to authenticated
using (auth.uid() = user_id);
